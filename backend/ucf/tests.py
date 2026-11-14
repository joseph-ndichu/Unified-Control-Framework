from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from .models import EvidenceRequirement, FrameworkControl, Mapping, UnifiedControl
from .services import coverage

User = get_user_model()


class ImportedDataTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("import_ucf", verbosity=0)
        cls.viewer = User.objects.create_user("viewer", "v@example.test", "Str0ng-pass-phrase")
        cls.admin = User.objects.create_user("boss", "b@example.test", "Str0ng-pass-phrase", is_staff=True)

    def setUp(self):
        self.client = APIClient()

    def state(self, ref):
        states, _ = coverage()
        return states[FrameworkControl.objects.get(control_ref=ref).id]

    def test_import_counts_and_rerun(self):
        self.assertEqual(FrameworkControl.objects.filter(framework__name="NCA ECC").count(), 200)
        self.assertEqual(FrameworkControl.objects.filter(framework__name="ISO/IEC 27001").count(), 93)
        self.assertEqual((UnifiedControl.objects.count(), Mapping.objects.count()), (10, 30))
        UnifiedControl.objects.filter(code="UCF-IAM-01").update(owner="IT Security")
        call_command("import_ucf", verbosity=0)
        self.assertEqual((FrameworkControl.objects.count(), Mapping.objects.count()), (293, 30))
        self.assertEqual(EvidenceRequirement.objects.count(), 30)
        self.assertEqual(UnifiedControl.objects.get(code="UCF-IAM-01").owner, "IT Security")

    def test_coverage_states(self):
        self.assertEqual(self.state("2-2-1"), "full")
        self.assertEqual(self.state("2-2-3"), "full")        # derived from its subcontrols
        self.assertEqual(self.state("A.5.15"), "combined")   # two partial mappings
        self.assertEqual(self.state("A.5.3"), "partial")
        self.assertEqual(self.state("A.8.18"), "related_only")
        self.assertEqual(self.state("2-1-1"), "gap")

    def test_met_follows_implementation(self):
        fc = FrameworkControl.objects.get(control_ref="A.5.15")
        self.assertFalse(coverage()[1][fc.id])
        UnifiedControl.objects.filter(code="UCF-IAM-01").update(implementation_status="implemented")
        self.assertFalse(coverage()[1][fc.id])  # UCF-IAM-02 still open
        UnifiedControl.objects.filter(code="UCF-IAM-02").update(implementation_status="implemented")
        self.assertTrue(coverage()[1][fc.id])

    def test_anonymous_is_refused(self):
        for url in ["/api/dashboard/", "/api/unified-controls/", "/api/framework-controls/", "/api/meta/"]:
            self.assertEqual(self.client.get(url).status_code, 403, url)

    def test_traceability_both_directions(self):
        self.client.force_authenticate(self.viewer)
        uc = UnifiedControl.objects.get(code="UCF-IAM-08")
        refs = {m["control_ref"] for m in self.client.get(f"/api/unified-controls/{uc.id}/").data["mappings"]}
        self.assertEqual(refs, {"A.5.18", "2.2.3.5", "1-9-5", "A.5.11"})
        fc = FrameworkControl.objects.get(control_ref="A.5.15")
        codes = {m["code"] for m in self.client.get(f"/api/framework-controls/{fc.id}/").data["mappings"]}
        self.assertEqual(codes, {"UCF-IAM-01", "UCF-IAM-02", "UCF-IAM-06"})

    def test_filters_and_search(self):
        self.client.force_authenticate(self.viewer)
        get = lambda url: self.client.get(url).data
        self.assertEqual(len(get("/api/framework-controls/?framework=NCA ECC&subdomain=Identity and Access Management")), 9)
        self.assertEqual([r["control_ref"] for r in get("/api/framework-controls/?search=A.8.4")], ["A.8.4"])
        self.assertEqual(len(get("/api/framework-controls/?framework=ISO/IEC 27001&coverage=combined")), 2)
        self.assertEqual(len(get("/api/unified-controls/?framework=NCA ECC")), 8)   # IAM-03 and IAM-10 are ISO only
        self.assertEqual(len(get("/api/unified-controls/?framework=ISO/IEC 27001")), 10)
        self.assertEqual([r["code"] for r in get("/api/unified-controls/?search=source code")], ["UCF-IAM-10"])
        iso = next(f for f in get("/api/meta/")["frameworks"] if f["name"] == "ISO/IEC 27001")
        rows = get(f"/api/framework-controls/?framework_id={iso['id']}")
        self.assertEqual(len(rows), 93)
        a515 = next(r for r in rows if r["control_ref"] == "A.5.15")
        self.assertEqual({c["code"] for c in a515["covered_by"]}, {"UCF-IAM-01", "UCF-IAM-02", "UCF-IAM-06"})
        child = next(r for r in get("/api/framework-controls/?search=2.2.3.4") if r["control_ref"] == "2.2.3.4")
        self.assertEqual(self.client.get(f"/api/framework-controls/{child['parent_id']}/").data["control_ref"], "2-2-3")

    def test_dashboard(self):
        self.client.force_authenticate(self.viewer)
        data = self.client.get("/api/dashboard/").data
        nca = next(f for f in data["frameworks"] if f["name"] == "NCA ECC")
        self.assertEqual((nca["controls"], nca["full"]), (200, 10))  # 9 IAM rows plus 1-9-5
        self.assertEqual(sum(nca[s] for s in ["full", "combined", "partial", "related_only", "gap"]), 200)
        self.assertEqual({c["code"] for c in data["single_framework_controls"]}, {"UCF-IAM-03", "UCF-IAM-10"})
        self.assertEqual(data["unowned"], UnifiedControl.objects.filter(owner="").count())

    def test_only_admin_can_edit(self):
        uc = UnifiedControl.objects.get(code="UCF-IAM-01")
        evidence = uc.evidence.first()
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.patch(f"/api/unified-controls/{uc.id}/", {"owner": "Me"}).status_code, 403)
        self.assertEqual(self.client.patch(f"/api/evidence/{evidence.id}/", {"status": "collected"}).status_code, 403)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/unified-controls/{uc.id}/", {"owner": "IAM team", "implementation_status": "implemented"})
        self.assertEqual((response.status_code, response.data["owner"]), (200, "IAM team"))
        self.assertEqual(self.client.patch(
            f"/api/unified-controls/{uc.id}/", {"implementation_status": "bogus"}).status_code, 400)
        self.assertEqual(self.client.patch(f"/api/evidence/{evidence.id}/", {"status": "collected"}).status_code, 200)


class AccountTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def post(self, url, data):
        token = self.client.get("/api/auth/session/").cookies.get("csrftoken")
        token = token.value if token else self.client.cookies["csrftoken"].value
        return self.client.post(url, data, format="json", HTTP_X_CSRFTOKEN=token)

    def test_register_login_logout(self):
        response = self.post("/api/auth/register/", {
            "username": "newuser", "email": "n@example.test", "password": "Str0ng-pass-phrase"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["user"]["role"], "viewer")
        self.assertFalse(User.objects.get(username="newuser").is_staff)
        self.assertEqual(self.client.get("/api/auth/session/").data["user"]["username"], "newuser")
        self.assertEqual(self.post("/api/auth/logout/", {}).status_code, 200)
        self.assertIsNone(self.client.get("/api/auth/session/").data["user"])
        self.assertEqual(self.post("/api/auth/login/", {"username": "newuser", "password": "wrong"}).status_code, 400)
        self.assertEqual(self.post("/api/auth/login/", {
            "username": "newuser", "password": "Str0ng-pass-phrase"}).status_code, 200)

    def test_register_rejects_bad_input(self):
        self.assertEqual(self.post("/api/auth/register/", {
            "username": "weak", "email": "w@example.test", "password": "12345"}).status_code, 400)
        self.assertEqual(self.post("/api/auth/register/", {
            "username": "role", "email": "r@example.test", "password": "Str0ng-pass-phrase",
            "is_staff": True}).data["user"]["role"], "viewer")
        self.assertEqual(self.post("/api/auth/logout/", {}).status_code, 200)
        self.assertEqual(self.post("/api/auth/register/", {
            "username": "ROLE", "email": "r2@example.test", "password": "Str0ng-pass-phrase"}).status_code, 400)

    def test_csrf_is_enforced(self):
        response = self.client.post("/api/auth/login/", {"username": "x", "password": "y"}, format="json")
        self.assertEqual(response.status_code, 403)
