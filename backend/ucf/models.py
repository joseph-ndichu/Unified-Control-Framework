"""UCF data model. Hierarchy: Domain > Policy > UnifiedControl > EvidenceRequirement."""
from django.db import models


class Framework(models.Model):
    name = models.CharField(max_length=100)
    version = models.CharField(max_length=50)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["name", "version"], name="uniq_framework_version")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.version})"


class FrameworkControl(models.Model):
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE, related_name="controls")
    control_ref = models.CharField(max_length=30)  # official ID, e.g. 2-2-1 or A.5.15
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    domain = models.CharField(max_length=150)
    subdomain = models.CharField(max_length=150, blank=True)
    title = models.CharField(max_length=250, blank=True)
    text = models.TextField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["framework", "control_ref"], name="uniq_framework_control")]
        ordering = ["id"]

    def __str__(self):
        return f"{self.framework.name} {self.control_ref}"


class Domain(models.Model):
    name = models.CharField(max_length=150, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Policy(models.Model):
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name="policies")
    name = models.CharField(max_length=150)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["domain", "name"], name="uniq_policy_in_domain")]
        verbose_name_plural = "policies"
        ordering = ["name"]

    def __str__(self):
        return self.name


class UnifiedControl(models.Model):
    class Implementation(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        IN_PROGRESS = "in_progress", "In progress"
        IMPLEMENTED = "implemented", "Implemented"
        NOT_APPLICABLE = "not_applicable", "Not applicable"

    class Review(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"

    code = models.CharField(max_length=30, unique=True)  # e.g. UCF-IAM-01
    policy = models.ForeignKey(Policy, on_delete=models.PROTECT, related_name="controls")
    title = models.CharField(max_length=250)
    statement = models.TextField()
    owner = models.CharField(max_length=150, blank=True)
    implementation_status = models.CharField(
        max_length=20, choices=Implementation.choices, default=Implementation.NOT_STARTED)
    review_status = models.CharField(max_length=20, choices=Review.choices, default=Review.DRAFT)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} {self.title}"


class EvidenceRequirement(models.Model):
    class Status(models.TextChoices):
        MISSING = "missing", "Missing"
        COLLECTED = "collected", "Collected"
        EXPIRED = "expired", "Expired"

    unified_control = models.ForeignKey(UnifiedControl, on_delete=models.CASCADE, related_name="evidence")
    description = models.CharField(max_length=300)
    reference = models.CharField(max_length=500, blank=True)  # where the collected evidence lives
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.MISSING)
    collected_on = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["unified_control", "description"], name="uniq_evidence_per_control")]
        ordering = ["id"]

    def __str__(self):
        return self.description


class Mapping(models.Model):
    class Relationship(models.TextChoices):
        EQUIVALENT = "equivalent", "Equivalent"  # same scope
        COVERS = "covers", "Covers"              # unified control fully satisfies the source control
        PARTIAL = "partial", "Partial"           # satisfies part of it
        RELATED = "related", "Related"           # context only, no compliance credit

    unified_control = models.ForeignKey(UnifiedControl, on_delete=models.CASCADE, related_name="mappings")
    framework_control = models.ForeignKey(FrameworkControl, on_delete=models.CASCADE, related_name="mappings")
    relationship = models.CharField(max_length=20, choices=Relationship.choices)
    rationale = models.TextField()
    review_status = models.CharField(
        max_length=20, choices=UnifiedControl.Review.choices, default=UnifiedControl.Review.DRAFT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["unified_control", "framework_control"], name="uniq_mapping_pair")]
        ordering = ["unified_control__code", "id"]

    def __str__(self):
        return f"{self.unified_control.code} > {self.framework_control} ({self.relationship})"
