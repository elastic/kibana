# SLO

Service Level Objectives: definitions, the rollup data computed from their source data, and the settings that govern how that data is stored and kept.

## Language

### Settings

**Global SLO settings**:
Settings that apply to the whole deployment, across all spaces, and that only an SLO global admin can read or change.
_Avoid_: Cluster settings, admin settings

**Space SLO settings**:
Settings that apply to a single space and that any user with SLO write access in that space can change.
_Avoid_: SLO settings (ambiguous), global settings

**SLO global admin**:
A user granted the SLO feature's `All` privilege on all spaces.
_Avoid_: Admin, superuser, operator

**Config override**:
A global SLO setting fixed by the operator in `kibana.yml`; while it is set, it takes precedence over the stored value, which an SLO global admin can no longer change.
_Avoid_: YML setting, locked setting, overwrite

**Effective setting**:
The value a global SLO setting actually has: the config override when set, otherwise the stored value, otherwise the default.
_Avoid_: Resolved setting, current setting

### SLI storage

**Dated SLI index**:
An SLI index holding the rollup data of one period, named after the period's start date.
_Avoid_: Rollover index, daily index

**Rounding**:
The period covered by one dated SLI index: monthly, weekly or daily.
_Avoid_: Rollover, index period, granularity

**SLI retention**:
The policy that deletes dated SLI indices, and the data in them, once their whole period is older than the retention period. Disabled unless an SLO global admin or a config override enables it.
_Avoid_: Retention policy (ambiguous with ILM), data cleanup

**Retention period**:
The number of days of SLI data kept when SLI retention is enabled.
_Avoid_: Policy, retention days, TTL

**Aged-out index**:
A dated SLI index whose whole period ends before the retention period.
_Avoid_: Old index, expired index

**Empty dated SLI index**:
A dated SLI index holding no document, old enough that no backfill writes to it any more; deleting it loses no data.
_Avoid_: Empty rollover index, orphan index
