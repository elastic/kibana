# SLO

Service Level Objectives: definitions, the rollup data computed from their source data, and the settings that govern how that data is stored.

## Language

### Settings

**Global SLO settings**:
Settings that apply to the whole deployment, across all spaces, and that only an SLO global admin can change.
_Avoid_: Cluster settings, admin settings

**Space SLO settings**:
Settings that apply to a single space and that any user with SLO write access in that space can change.
_Avoid_: SLO settings (ambiguous), global settings

**SLO global admin**:
A user granted the SLO feature's `All` privilege on all spaces.
_Avoid_: Admin, superuser, operator

### SLI storage

**Rounding**:
The period covered by one dated SLI index: monthly (`M`), weekly (`w`) or daily (`d`).
_Avoid_: Rollover, index period, granularity

**Requested rounding**:
The rounding an SLO global admin asks for in the global SLO settings, or `automatic` when none is asked for.
_Avoid_: Desired rounding, configured rounding, user value

**Legacy rounding**:
The rounding a resources version used before the rounding schedule existed; it applies to that version's data before the first scheduled segment.
_Avoid_: Default rounding, historical rounding

**Rounding segment**:
A rounding together with the instant from which it applies; a segment in effect never changes.
_Avoid_: Rounding change, rounding entry

**Rounding schedule**:
The ordered list of rounding segments, past and pending, shared by every resources version, that decides which dated SLI index a rollup document goes to.
_Avoid_: Routing state, rounding history, changes over time
