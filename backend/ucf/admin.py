from django.contrib import admin

from .models import Domain, EvidenceRequirement, Framework, FrameworkControl, Mapping, Policy, UnifiedControl

admin.site.site_header = "UCF repository administration"
admin.site.register(Framework)
admin.site.register(Domain)
admin.site.register(Policy)


@admin.register(FrameworkControl)
class FrameworkControlAdmin(admin.ModelAdmin):
    list_display = ["control_ref", "framework", "domain", "subdomain", "title"]
    list_filter = ["framework", "domain"]
    search_fields = ["control_ref", "title", "text"]


class EvidenceInline(admin.TabularInline):
    model = EvidenceRequirement
    extra = 0


class MappingInline(admin.TabularInline):
    model = Mapping
    extra = 0
    autocomplete_fields = ["framework_control"]


@admin.register(UnifiedControl)
class UnifiedControlAdmin(admin.ModelAdmin):
    list_display = ["code", "title", "policy", "owner", "implementation_status", "review_status"]
    list_filter = ["implementation_status", "review_status", "policy__domain"]
    search_fields = ["code", "title", "statement"]
    inlines = [EvidenceInline, MappingInline]


@admin.register(Mapping)
class MappingAdmin(admin.ModelAdmin):
    list_display = ["unified_control", "framework_control", "relationship", "review_status"]
    list_filter = ["relationship", "review_status", "framework_control__framework"]
    autocomplete_fields = ["unified_control", "framework_control"]
