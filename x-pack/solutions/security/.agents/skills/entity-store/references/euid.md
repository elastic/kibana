# Entity ID (EUID) Generation in Entity Store v2

This guide explains how Entity IDs are generated for Users, Hosts, and Services in the Entity Store v2. It is intended for anyone testing entity-related features, as the EUID algorithm's subtleties surface across risk scoring, flyout panels, identity resolution, and enrichment.

---

## What is an EUID?

Every entity in the Entity Store has a **logical identifier** called an **EUID** (`entity.id`). This is a human-readable string that uniquely identifies the entity (e.g. `user:jane@acme.com@okta`).

---

## General Structure

All EUIDs follow the pattern **`{entityType}:{composed_value}`** (e.g. `host:ABC123`, `user:jane@acme.com@okta`, `service:my-api`). The `{entityType}:` prefix is always prepended for Users, Hosts, and Services.

---

## User Entities — Creation First, EUID Second

User entities are the easiest to test if you answer three questions in order:

1. Can this document create a user entity at all?
2. If yes, is it high-confidence or medium-confidence?
3. What exact EUID should it produce?

### User Entities at a Glance

| Topic | Medium-confidence user (`local`) | High-confidence user (IdP-backed) |
| ----- | -------------------------------- | --------------------------------- |
| What it represents | A user observed on one specific host | An account owned by an IdP or account-managing platform |
| Typical sources | Elastic Defend, CrowdStrike, other endpoint/host telemetry | Okta, Entra ID, Active Directory entity sync, AWS IAM-style activity |
| Minimum inputs | `user.name` + `host.id` | A mapped IdP namespace plus one ranked identity composition |
| Creation gate | Must not be a service account and must not be failed auth-only activity | Must pass the IdP post-aggregation gate |
| EUID shape | `user:{user.name}@{host.id}@local` | `user:{identity_fields}@{namespace}` |

**High-confidence creation gate:** this is the rule that is easiest to miss during testing. A document in an IdP namespace does **not** automatically create a high-confidence user entity. It must also pass the IdP post-aggregation filter:

- `event.kind = asset`, **or**
- `event.category = iam` with qualifying `event.type` values: `user`, `creation`, `deletion`, or `group`
- `event.kind = enrichment` is excluded from high-confidence entity creation

If that gate fails, the document may still look "IdP-like", but it does **not** create a high-confidence user entity by itself.

### Step 1: Can This Document Create a User Entity?

Before reasoning about the EUID string, first check whether the document is eligible to create a user entity:

| Document Pattern | Outcome | Why |
| ---------------- | ------- | --- |
| Known IdP/account namespace **and** passes the IdP post-aggregation gate | Continue on the high-confidence path | The source is acting like the system that owns or manages the account |
| Non-IdP/endpoint-style event with `user.name` + `host.id`, not a service account, not failed auth-only | Continue on the medium-confidence path | The source observed a user session on one host |
| IdP/account-looking event that **fails** the post-aggregation gate | **No user entity created** | Namespace alone is not enough |
| Service account on the local path | **No medium-confidence user entity created** | Shared/automation identities are intentionally excluded |
| Failed authentication-only activity on the local path | **No medium-confidence user entity created** | Prevents phantom entities from brute force or password spray |

### Step 2: Decide Confidence Tier and Namespace

The namespace is derived from `event.module` or the first chunk of `data_stream.dataset` (split by `.`), mapped through explicit `whenClauses`:

| Source value                        | Canonical namespace                                          |
| ----------------------------------- | ------------------------------------------------------------ |
| `okta`, `entityanalytics_okta`      | `okta`                                                       |
| `azure`, `entityanalytics_entra_id` | `entra_id`                                                   |
| `o365`, `o365_metrics`              | `microsoft_365`                                              |
| `entityanalytics_ad`                | `active_directory`                                           |
| _(anything else)_                   | Falls through to the raw source value, or `unknown` if empty |

After the namespace is evaluated, use this decision table:

| Condition | Confidence | Namespace | Outcome |
| --------- | ---------- | --------- | ------- |
| Source maps to a known IdP/account namespace **and** passes the IdP post-aggregation gate | High | Mapped namespace such as `okta`, `entra_id`, or `active_directory` | Build a high-confidence EUID |
| Source does **not** qualify for the IdP path, but has `user.name` + `host.id`, is not a service account, and is not failed auth-only | Medium | Forced to `local` | Build a medium-confidence EUID |
| Fields are present but neither path passes its guardrails | None | N/A | No user entity is created |

This is the key behavior to keep in mind: the system can see user fields on a document and still create **no** user entity.

### Step 3: Build the EUID

Once the document is on a valid path, the final string is prepended with `user:`.

#### Medium-Confidence (`local`) EUID

| EUID Output                        | When Used |
| ---------------------------------- | --------- |
| `user:{user.name}@{host.id}@local` | Endpoint-observed users on the local path |

There is only one composition. The two components must be present, and the entity is structurally bonded to one host.

**Testing note:** the medium-confidence `entity.name` is `{user.name}@{host.name}` for display, but the EUID uses `host.id`. Do not confuse the display name with the entity ID.

#### High-Confidence (IdP-Backed) EUID

The system tries these compositions in ranked order and picks the **first** one where all required fields are present:

| Rank | EUID Output                                  | When Used                                                         |
| ---- | -------------------------------------------- | ----------------------------------------------------------------- |
| 1    | `user:{user.email}@{namespace}`              | Most IdPs (Okta, Entra ID, Google Workspace, etc.)                |
| 2    | `user:{user.id}@{namespace}`                 | IdPs where email is absent (AWS, Atlassian, Keycloak, etc.)       |
| 3    | `user:{user.name}@{user.domain}@{namespace}` | Active Directory (name + domain disambiguates)                    |
| 4    | `user:{user.name}@{namespace}`               | Fallback for IdPs with only `user.name` (GitHub, JumpCloud, etc.) |

### User Entity Examples

#### Example A — High-Confidence User Is Created

- Fields present: `user.email=jane@acme.com`, `event.module=okta`, `event.category=["iam"]`, `event.type=["user"]`
- Why it qualifies: the namespace maps to `okta`, and the document passes the IdP post-aggregation gate
- EUID: `user:jane@acme.com@okta`

#### Example B — Medium-Confidence User Is Created

- Fields present: `user.name=jdoe`, `host.id=HW-UUID-ABC`, `event.module=endpoint`
- Why it qualifies: this is a non-IdP/endpoint event with `user.name` + `host.id`, and it is not blocked by the local-path guardrails
- EUID: `user:jdoe@HW-UUID-ABC@local`

#### Example C — Looks IdP-Backed, but No Entity Is Created

- Fields present: `user.email=jane@acme.com`, `event.module=okta`, `event.category=["authentication"]`, `event.type=["start"]`
- Why it does **not** qualify: the namespace maps to `okta`, but the document does **not** have `event.kind = asset`, and it does **not** have `event.category = iam` with a qualifying lifecycle type
- Outcome: **no high-confidence user entity is created from this document**

#### Example D — Local User Is Excluded by Guardrails

- Fields present: `user.name=www-data`, `host.id=HW-UUID-ABC`, `event.module=endpoint`
- Why it does **not** qualify: it matches the local shape, but `www-data` is a service account and is excluded from medium-confidence creation
- Outcome: **no medium-confidence user entity is created**

The same no-entity outcome applies to failed authentication-only events, even when `user.name` + `host.id` are present.

**Same person, different entities:** Jane may appear as `user:jane@acme.com@okta` (her Okta account), `user:jane@acme.com@entra_id` (her Entra ID account), and `user:jdoe@HW-UUID-LAPTOP@local` (her laptop session). These are intentionally separate entities until Entity Resolution links them.

---

## What is NOT Done

- **No case normalization**: `Jane@acme.com` and `jane@acme.com` produce different EUIDs. Field values are used as-is.
- **No trimming**: Leading/trailing whitespace is preserved.
- **No deduplication across namespaces**: `jane@acme.com@okta` and `jane@acme.com@entra_id` are different entities by design.
- **Arrays are collapsed to first element**: If a field contains `["a", "b"]`, only `"a"` is used.

---

## Document Filters and Guardrails

These are the same creation gates summarized above, repeated here as a quick checklist:

- **IdP post-aggregation filter**: High-confidence entities require `event.kind = asset` or `event.category = iam` with qualifying event types (`user`, `creation`, `deletion`, `group`).
- **Enrichment events** (`event.kind = enrichment`) are excluded from high-confidence entity creation.
- **Failed authentication events** (`event.outcome = failure`) are excluded from medium-confidence creation — a brute-force attempt against `admin@host` must not create a phantom entity.
- **Service accounts** are excluded from the local namespace: `root`, `bin`, `daemon`, `sys`, `nobody`, `jenkins`, `ansible`, `deploy`, `terraform`, `gitlab-runner`, `postgres`, `mysql`, `redis`, `elasticsearch`, `kafka`, `admin`, `operator`, `service`.


## Host Entities — Ranked Single-Field Fallback

Host EUIDs use a **priority-ranked fallback chain** with no namespace concept. The first field present wins:

| Priority | EUID Output            | Source Field    |
| -------- | ---------------------- | --------------- |
| 1        | `host:{host.id}`       | `host.id`       |
| 2        | `host:{host.name}`     | `host.name`     |
| 3        | `host:{host.hostname}` | `host.hostname` |

**Example:** A machine with `host.id = HW-UUID-ABC123` produces EUID `host:HW-UUID-ABC123`. If that same machine were seen by an integration that only reports `host.name = prod-web-01`, and `host.id` is absent, the EUID would be `host:prod-web-01` — a **different entity**. This is the primary testing pitfall for hosts: the same physical machine can appear as two entities if different integrations populate different identity fields.

**Strategic motivation:** Host identity is simpler than user identity — there is no namespace. Any integration reporting `host.id`, `host.name`, or `host.hostname` can create or enrich a host entity. The ranking prefers `host.id` (hardware UUID, most stable) but falls back to DNS names when that is all an integration provides (common for network sensors, firewalls, and SIEMs that lack agent-level host instrumentation).

## Service Entities

Service EUIDs are the simplest: a direct mapping from one field, no ranking, no namespace.

| EUID Output              | Source Field   |
| ------------------------ | -------------- |
| `service:{service.name}` | `service.name` |

**Example:** `service:nginx` or `service:elastic-agent`.

## Key Implementation Details

- **Branch selection**: `entity.namespace == 'local'` → MC ranking; otherwise → HC ranking
- **First-match wins**: A composition only matches if ALL its fields are present and non-empty
- **Document `_id`**: MD5 hash of the EUID string (not the EUID itself)
- **EUID is immutable**: Once computed, it's the entity's permanent identity
- **Resolution uses EUID**: `resolved_to` stores the target entity's EUID string

## Common QA Scenarios

| Scenario | Why it happens |
|----------|---------------|
| "Why did clicking this user open a different user's flyout?" | Entity is an alias (`resolved_to` set). Flyout navigates to the golden/target entity. |
| "Why are there two entities for the same person?" | Same person, different IDP accounts (e.g., `user:emily@okta` vs `user:emily@entra_id`). Expected — resolution links them. |
| "Why is this user entity showing `user:jdoe@laptop-A@local`?" | MC entity from endpoint data. `entity.namespace == 'local'`, uses `user.name@host.id@local` format. |
| "Why does this entity have no email in its EUID?" | `user.email` was empty for that source event. Algorithm fell through to priority 2+ (user.id or user.name). |
| "Why did this entity not get created at all?" | Failed pipeline gates: either `documentsFilter` (pre-agg) or `postAggFilter` (post-agg) excluded the source events. |

## Code Locations

| File | Purpose |
|------|---------|
| `common/domain/definitions/user.ts` | User entity: HC/MC branches, confidence, namespace mapping |
| `common/domain/definitions/host.ts` | Host entity: 3-field linear ranking |
| `common/domain/definitions/service.ts` | Service entity: single-field identity |
| `common/domain/euid/memory.ts` | In-memory EUID calculation (`getEuidFromObject`) |
| `common/domain/euid/commons.ts` | Field ranking logic (`getEffectiveEuidRanking`) |
| `common/domain/euid/esql.ts` | ESQL generation for extraction pipelines |
| `common/domain/euid/field_evaluations.ts` | Field evaluation application |

All paths relative to `x-pack/solutions/security/plugins/entity_store/`.
