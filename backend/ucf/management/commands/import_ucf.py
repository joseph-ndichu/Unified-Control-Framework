"""Load the framework and mapping CSV files into the database.

Safe to run again: existing rows are updated, and owner, implementation status,
and collected evidence entered through the app are kept.
"""
import csv

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from ucf.models import (Domain, EvidenceRequirement, Framework, FrameworkControl, Mapping, Policy,
                        UnifiedControl)

FRAMEWORK_FILES = ["nca_ecc.csv", "iso27001_annex_a.csv"]


class Command(BaseCommand):
    help = "Import frameworks, unified controls, and mappings from the data folder."

    def rows(self, name):
        with open(settings.UCF_DATA_DIR / name, encoding="utf-8", newline="") as f:
            return list(csv.DictReader(f))

    @transaction.atomic
    def handle(self, *args, **options):
        controls = {}  # (framework name, control_ref) -> FrameworkControl
        for name in FRAMEWORK_FILES:
            for r in self.rows(name):  # parents come before their children in the files
                framework, _ = Framework.objects.get_or_create(name=r["framework"], version=r["version"])
                parent = controls[(r["framework"], r["parent_id"])] if r["parent_id"] else None
                controls[(r["framework"], r["control_id"])], _ = FrameworkControl.objects.update_or_create(
                    framework=framework, control_ref=r["control_id"],
                    defaults={"parent": parent, "domain": r["domain"], "subdomain": r["subdomain"],
                              "title": r["title"], "text": r["text"]})

        unified = {}
        for r in self.rows("ucf_controls.csv"):
            domain, _ = Domain.objects.get_or_create(name=r["domain"])
            policy, _ = Policy.objects.get_or_create(domain=domain, name=r["policy"])
            unified[r["ucf_id"]], _ = UnifiedControl.objects.update_or_create(
                code=r["ucf_id"],
                defaults={"policy": policy, "title": r["title"], "statement": r["statement"],
                          "review_status": r["review_status"]})
            wanted = [item.strip() for item in r["evidence_examples"].split(";") if item.strip()]
            for description in wanted:
                EvidenceRequirement.objects.get_or_create(
                    unified_control=unified[r["ucf_id"]], description=description)
            EvidenceRequirement.objects.filter(unified_control=unified[r["ucf_id"]]).exclude(
                description__in=wanted).delete()

        kept = []
        for r in self.rows("ucf_mappings.csv"):
            mapping, _ = Mapping.objects.update_or_create(
                unified_control=unified[r["ucf_id"]],
                framework_control=controls[(r["framework"], r["control_id"])],
                defaults={"relationship": r["relationship"], "rationale": r["rationale"],
                          "review_status": r["review_status"]})
            kept.append(mapping.pk)
        Mapping.objects.exclude(pk__in=kept).delete()  # the CSV is the source of truth for mappings

        self.stdout.write(self.style.SUCCESS(
            f"Imported {FrameworkControl.objects.count()} framework controls, "
            f"{UnifiedControl.objects.count()} unified controls, {Mapping.objects.count()} mappings."))
