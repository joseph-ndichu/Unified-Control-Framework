"""JSON API for the UCF repository."""
from collections import Counter, defaultdict

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EvidenceRequirement, Framework, FrameworkControl, Mapping, UnifiedControl
from .services import STATES, coverage

User = get_user_model()


# ---------- Authentication ----------------------------------------------------
def user_payload(user):
    return {"username": user.username, "email": user.email, "role": "admin" if user.is_staff else "viewer"}


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """Who am I. Also hands the browser its CSRF cookie."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"user": user_payload(request.user) if request.user.is_authenticated else None})


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        User.username_validator(value)
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], User(username=attrs["username"], email=attrs["email"]))
        except ValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        return attrs


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    """Create an account. New accounts are always viewers."""
    permission_classes = [AllowAny]

    def post(self, request):
        data = RegisterSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = User.objects.create_user(**data.validated_data)
        login(request, user)
        return Response({"user": user_payload(user)}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(request, username=request.data.get("username", ""),
                            password=request.data.get("password", ""))
        if user is None:
            return Response({"detail": "Wrong username or password."}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response({"user": user_payload(user)})


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response({"user": None})


# ---------- Source framework controls -----------------------------------------
def framework_control_row(fc, state, met):
    return {
        "id": fc.id, "framework": fc.framework.name, "control_ref": fc.control_ref,
        "parent_ref": fc.parent.control_ref if fc.parent_id else None,
        "domain": fc.domain, "subdomain": fc.subdomain, "title": fc.title, "text": fc.text,
        "coverage": state[fc.id], "met": met[fc.id],
    }


class FrameworkControlList(APIView):
    """Filter by framework, domain, subdomain, coverage, or a search across ID, title, and text."""

    def get(self, request):
        q = request.query_params
        qs = FrameworkControl.objects.select_related("framework", "parent")
        if q.get("framework"):
            qs = qs.filter(framework__name=q["framework"])
        if q.get("domain"):
            qs = qs.filter(domain=q["domain"])
        if q.get("subdomain"):
            qs = qs.filter(subdomain=q["subdomain"])
        if q.get("search"):
            term = q["search"].strip()
            qs = qs.filter(Q(control_ref__icontains=term) | Q(title__icontains=term) | Q(text__icontains=term))
        state, met = coverage()
        rows = [framework_control_row(fc, state, met) for fc in qs]
        if q.get("coverage"):
            rows = [r for r in rows if r["coverage"] == q["coverage"]]
        return Response(rows)


class FrameworkControlDetail(APIView):
    """One source control and the unified controls that cover it."""

    def get(self, request, pk):
        fc = get_object_or_404(FrameworkControl.objects.select_related("framework", "parent"), pk=pk)
        state, met = coverage()
        data = framework_control_row(fc, state, met)
        data["children"] = [
            {"id": c.id, "control_ref": c.control_ref, "text": c.text, "coverage": state[c.id]}
            for c in fc.children.all()]
        data["mappings"] = [
            {"unified_control_id": m.unified_control_id, "code": m.unified_control.code,
             "title": m.unified_control.title,
             "implementation_status": m.unified_control.implementation_status,
             "relationship": m.relationship, "rationale": m.rationale}
            for m in fc.mappings.select_related("unified_control")]
        return Response(data)


# ---------- Unified controls --------------------------------------------------
def unified_control_row(uc):
    mappings = list(uc.mappings.all())
    evidence = list(uc.evidence.all())
    return {
        "id": uc.id, "code": uc.code, "title": uc.title, "statement": uc.statement,
        "domain": uc.policy.domain.name, "policy": uc.policy.name, "owner": uc.owner,
        "implementation_status": uc.implementation_status, "review_status": uc.review_status,
        "frameworks": sorted({m.framework_control.framework.name for m in mappings
                              if m.relationship != Mapping.Relationship.RELATED}),
        "mapping_count": len(mappings),
        "evidence_total": len(evidence),
        "evidence_collected": sum(1 for e in evidence if e.status == EvidenceRequirement.Status.COLLECTED),
    }


def unified_queryset():
    return UnifiedControl.objects.select_related("policy__domain").prefetch_related(
        "mappings__framework_control__framework", "evidence")


class UnifiedControlList(APIView):
    """Filter by domain, framework, implementation status, or a search across code, title, and statement."""

    def get(self, request):
        q = request.query_params
        qs = unified_queryset()
        if q.get("domain"):
            qs = qs.filter(policy__domain__name=q["domain"])
        if q.get("status"):
            qs = qs.filter(implementation_status=q["status"])
        if q.get("framework"):
            # Both conditions must hold on the same mapping row, so they share one filter() call.
            qs = qs.filter(
                mappings__framework_control__framework__name=q["framework"],
                mappings__relationship__in=[r for r in Mapping.Relationship.values if r != "related"])
        if q.get("search"):
            term = q["search"].strip()
            qs = qs.filter(Q(code__icontains=term) | Q(title__icontains=term) | Q(statement__icontains=term))
        return Response([unified_control_row(uc) for uc in qs.distinct()])


class UnifiedControlUpdate(serializers.ModelSerializer):
    class Meta:
        model = UnifiedControl
        fields = ["owner", "implementation_status"]


class UnifiedControlDetail(APIView):
    """One unified control with every source control it maps to and its evidence."""

    def payload(self, pk):
        uc = get_object_or_404(unified_queryset(), pk=pk)
        data = unified_control_row(uc)
        data["mappings"] = [
            {"framework_control_id": m.framework_control_id,
             "framework": m.framework_control.framework.name,
             "control_ref": m.framework_control.control_ref, "title": m.framework_control.title,
             "text": m.framework_control.text, "relationship": m.relationship, "rationale": m.rationale}
            for m in uc.mappings.all()]
        data["evidence"] = [
            {"id": e.id, "description": e.description, "reference": e.reference, "status": e.status,
             "collected_on": e.collected_on}
            for e in uc.evidence.all()]
        return data

    def get(self, request, pk):
        return Response(self.payload(pk))

    def patch(self, request, pk):
        uc = get_object_or_404(UnifiedControl, pk=pk)
        update = UnifiedControlUpdate(uc, data=request.data, partial=True)
        update.is_valid(raise_exception=True)
        update.save()
        return Response(self.payload(pk))


class EvidenceUpdate(serializers.ModelSerializer):
    class Meta:
        model = EvidenceRequirement
        fields = ["status", "reference", "collected_on"]


class EvidenceDetail(APIView):
    def patch(self, request, pk):
        evidence = get_object_or_404(EvidenceRequirement, pk=pk)
        update = EvidenceUpdate(evidence, data=request.data, partial=True)
        update.is_valid(raise_exception=True)
        update.save()
        return Response(update.data)


# ---------- Filters and dashboard ---------------------------------------------
class MetaView(APIView):
    """Values for the filter menus."""

    def get(self, request):
        groups = defaultdict(lambda: defaultdict(set))
        for name, domain, subdomain in FrameworkControl.objects.values_list(
                "framework__name", "domain", "subdomain").distinct():
            groups[name][domain].add(subdomain)
        return Response({
            "frameworks": [
                {"name": f.name, "version": f.version,
                 "domains": [{"name": d, "subdomains": sorted(s for s in subs if s)}
                             for d, subs in sorted(groups[f.name].items())]}
                for f in Framework.objects.all()],
            "unified_domains": sorted(set(UnifiedControl.objects.values_list("policy__domain__name", flat=True))),
            "coverage_states": list(reversed(STATES)),
            "implementation_statuses": UnifiedControl.Implementation.values,
            "evidence_statuses": EvidenceRequirement.Status.values,
        })


class DashboardView(APIView):
    """Coverage and gaps per framework, plus implementation and evidence progress."""

    def get(self, request):
        state, met = coverage()
        frameworks = []
        for framework in Framework.objects.all():
            totals, groups = Counter(), defaultdict(Counter)
            for fc_id, domain, subdomain in framework.controls.values_list("id", "domain", "subdomain"):
                key = (domain, subdomain)
                for counter in (totals, groups[key]):
                    counter["controls"] += 1
                    counter[state[fc_id]] += 1
                    counter["met"] += int(met[fc_id])
            frameworks.append({
                "name": framework.name, "version": framework.version,
                **{k: totals[k] for k in ["controls", "met", *STATES]},
                "groups": [{"domain": d, "subdomain": s, **{k: c[k] for k in ["controls", "met", *STATES]}}
                           for (d, s), c in sorted(groups.items())],
            })

        single = []
        for uc in unified_queryset():
            names = {m.framework_control.framework.name for m in uc.mappings.all()
                     if m.relationship != Mapping.Relationship.RELATED}
            if len(names) == 1:
                single.append({"id": uc.id, "code": uc.code, "title": uc.title, "required_by": names.pop()})

        implementation = Counter(UnifiedControl.objects.values_list("implementation_status", flat=True))
        evidence = Counter(EvidenceRequirement.objects.values_list("status", flat=True))
        return Response({
            "frameworks": frameworks,
            "unified_controls": {"total": sum(implementation.values()),
                                 **{s: implementation[s] for s in UnifiedControl.Implementation.values}},
            "evidence": {"total": sum(evidence.values()),
                         **{s: evidence[s] for s in EvidenceRequirement.Status.values}},
            "source_controls": FrameworkControl.objects.filter(mappings__isnull=False).exclude(
                mappings__relationship=Mapping.Relationship.RELATED).distinct().count(),
            "single_framework_controls": single,
        })
