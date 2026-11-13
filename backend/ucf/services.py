"""Coverage and compliance calculations shared by the API views."""
from collections import defaultdict

from .models import FrameworkControl, Mapping, UnifiedControl

# Coverage states, weakest to strongest.
#   gap           nothing mapped
#   related_only  only related mappings
#   partial       one partial mapping
#   combined      two or more partial mappings (a reviewer should confirm they add up)
#   full          at least one equivalent or covers mapping
STATES = ["gap", "related_only", "partial", "combined", "full"]
STRONG = {Mapping.Relationship.EQUIVALENT, Mapping.Relationship.COVERS}
CREDIT = STRONG | {Mapping.Relationship.PARTIAL}
DONE = {UnifiedControl.Implementation.IMPLEMENTED, UnifiedControl.Implementation.NOT_APPLICABLE}


def coverage():
    """Return ({framework_control_id: state}, {framework_control_id: bool met}).

    A control with subcontrols and no creditable mapping of its own takes the weakest
    state of its subcontrols. A control is met when it is fully or jointly covered and
    every unified control it relies on is implemented or not applicable.
    """
    relationships = defaultdict(list)
    for fc_id, rel, status in Mapping.objects.values_list(
            "framework_control_id", "relationship", "unified_control__implementation_status"):
        relationships[fc_id].append((rel, status))

    parents = dict(FrameworkControl.objects.values_list("id", "parent_id"))
    rank, met = {}, {}
    for fc_id in parents:
        rels = relationships.get(fc_id, [])
        partials = sum(1 for rel, _ in rels if rel == Mapping.Relationship.PARTIAL)
        if any(rel in STRONG for rel, _ in rels):
            rank[fc_id] = 4
        elif partials >= 2:
            rank[fc_id] = 3
        elif partials == 1:
            rank[fc_id] = 2
        else:
            rank[fc_id] = 1 if rels else 0
        credited = [status for rel, status in rels if rel in CREDIT]
        met[fc_id] = rank[fc_id] >= 3 and all(status in DONE for status in credited)

    children = defaultdict(list)
    for fc_id, parent_id in parents.items():
        if parent_id:
            children[parent_id].append(fc_id)
    for parent_id, kids in children.items():
        if rank[parent_id] <= 1:
            rank[parent_id] = min(rank[k] for k in kids)
            met[parent_id] = all(met[k] for k in kids)

    return {fc_id: STATES[r] for fc_id, r in rank.items()}, met
