# Handoff: Entity Store — rank `user.entity.id` for the AWS namespace (Kibana side)

For an agent working in the Kibana checkout (`/Users/alex.prozorov/dev/kibana`; it was on branch `graph-layer-control`, HEAD `81b2f9a64987`, 2026-10-06 — run `git status` and check the branch before editing). The task, proposed changes and definition of done are in the ticket; this file adds the context from the CloudTrail side that the ticket does not carry.

## Where the work is tracked (do not restate it here)

- Kibana ticket (the task): https://github.com/elastic/kibana/issues/296026
- Parent ticket (decision text, Option A vs B — Option B was chosen): https://github.com/elastic/security-team/issues/19869
- Integration PR that produces the new data: https://github.com/elastic/integrations/pull/21870 (code in commit `8149d6c9db`, branch `19869-cloudtrail-align-fields`)

## What CloudTrail now emits (the contract your change consumes)

Verified from the pipeline test fixtures: `packages/aws/data_stream/cloudtrail/_dev/test/pipeline/*-expected.json`.

| Field | Value |
|---|---|
| `user.entity.id` | One ARN per event. IAM user: `arn:aws:iam::<acct>:user/<name>`. Assumed role: the **role** ARN `arn:aws:iam::<acct>:role/<path/role>`, not the per-session `arn:aws:sts::…:assumed-role/…` ARN. Root: `arn:aws:iam::<acct>:root`. Fixtures: 110 user, 15 role, 1 root. |
| `user.id` | Unchanged, deliberately **not** the ARN: the CloudTrail `principalId` (`AIDA…`; `AROA…:<session>` for roles; the account ID for root). |
| `user.email` | Set for SSO sessions (email as session name) and whenever `user.name` contains `@` (59 of 106 `IAMUser` fixture events). It currently outranks `user.id`, so the new ranking must put `user.entity.id` **above** `user.email`. |
| `user.target.entity.id` | Mixed: role ARNs, but also MFA device ARNs (`arn:aws:iam::…:mfa/…`) and, per the field description, user names, access key IDs, group and role names. |
| `event.kind` | Always `event`, never `asset`. No `host.id`. So CloudTrail documents **cannot create users** (they fail the `postAggFilter`); they can only update an entity that already exists. That is the intent: the ranking only helps once Cloud Asset Inventory has created `user:<ARN>@aws`. |
| service actors | Service-linked roles and `AWSService` callers have no `user.*` fields at all (they get `service.name`). |

Namespace: I expect `aws`, derived from the first chunk of `data_stream.dataset` (`aws.cloudtrail`) or `event.module`. The expected fixtures contain no `data_stream.*` fields, and I only checked this with a Python re-implementation of the user definition (not run against real Kibana). Verify it in the real code.

## Inventory side (what must produce the same ID)

Source: asset discovery in the cloudbeat repo, `internal/inventory` (clone at `/Users/alex.prozorov/dev/cloudbeat`, `origin/main` `dbdeea68`, 2026-10-04).

- **IAM users and roles:** `user.id` = ARN and `user.entity.id` = the same ARN. `event.kind: asset`, `event.module: asset_discovery`, `cloud.provider: aws` → namespace `aws` (existing mapping in `user.ts`). The inventory package does not map `user.email`, and the store reads unmapped fields as null, so these resolve by `user.id` → `user:<ARN>@aws`.
- **EC2 instance documents:** `user.id` = the role ARN resolved from the instance profile (or the profile ARN), but `user.entity.id` = the **instance** ARN (`WithUser` sets the user's entity to the asset's own entity). This is the hazard the ticket describes. It is inferred from the code; a value-level query on a real index (669 values shared, 19 only in `user.entity.id`) is consistent with it but not confirmed per document.

## Kibana code already read (paths relative to `x-pack/`)

- `platform/plugins/shared/entity_store/common/domain/definitions/user.ts`:
  - `documentsFilter`: outcome is not `failure` AND `user.email`, `user.id` or `user.name` non-empty.
  - `fieldEvaluations` for `entity.namespace`: the `local` gate (`user.name` + `host.id`), the `asset_discovery` + `cloud.provider` mapping, `sourceMatchesAny` for okta/entra/o365/AD, fallback `unknown`.
  - `euidRanking`: a `local` branch, then default: email, id, `name@domain`, name, each with `@namespace`.
  - `postAggFilter`: the entity already exists, OR namespace is `local`, OR `event.kind` includes `asset`.
- `platform/plugins/shared/entity_store/common/domain/euid/identity_fields.ts`: `identitySourceFields` is derived from `euidRanking` (minus field-evaluation destinations). **Any field added to the ranking automatically becomes a graph actor source field.**
- `solutions/security/packages/kbn-cloud-security-posture/common/constants.ts` (`getGraphActorEuidSourceFields`, `getGraphTargetEuidSourceFields`): target source fields are the identity fields with `.target.` inserted.
- `solutions/security/plugins/cloud_security_posture/server/routes/graph/target_euid.ts`: the target EUID is the actor EUID fragment with a textual `replaceAll` of each source field, so `user.entity.id` becomes `user.target.entity.id`.
- `.../graph/fetch_events_graph.ts`: `MV_EXPAND` on typed actor and target source fields, plus `TO_STRING` casts for all identity fields.
- Extraction: `server/domain/logs_extraction/logs_extraction_query_builder.ts` and `query_builder_commons.ts`, which run with `SET unmapped_fields="nullify"`.
- Tests: `platform/plugins/shared/entity_store/common/domain/euid/` (`esql`, `dsl`, `kql`, `painless` tests and `__snapshots__/`).

## Open design questions (nothing decided)

1. **Can the ranking express a value guard?** I did not check whether `euidRanking` or `fieldEvaluations` can test a value (starts-with or regex on `user.entity.id`). Look at the ranking and `Condition` types in `entity_schema.ts`. If not, a `fieldEvaluations` clause could compute a derived field, or the ranking could apply only to non-asset events (which does not fix the target side).
2. **The guard must also hold for targets.** Because the target EUID is a textual substitution, check the generated ES|QL for `user.target.entity.id` and confirm an MFA ARN or bare name cannot become `user:<value>@aws`.
3. **Branch order.** The new `aws` branch must come before the default branch and must not disturb the `local` branch.
4. **`documentsFilter` change.** Adding `user.entity.id` there changes which documents enter extraction for every namespace. Inventory EC2 documents already pass via `user.id`.

## Verification to do

- Confirm the EC2 hazard per document:
  ```esql
  FROM logs-cloud_asset_inventory.asset_inventory-*
  | WHERE cloud.provider == "aws" AND user.entity.id IS NOT NULL AND user.entity.id != user.id
  | STATS docs = COUNT(*), distinct_entity_ids = COUNT_DISTINCT(user.entity.id), sample = MV_FIRST(VALUES(user.entity.id)) BY entity.sub_type
  ```
  Expect one `AWS EC2 Instance` row (about 19 IDs) with an `arn:aws:ec2:` sample.
- I did **not** run any Kibana tests in this session. The likely command is `yarn test:jest x-pack/platform/plugins/shared/entity_store/common/domain/euid` (unverified).

## Environment notes

- A local dev Elasticsearch is on `localhost:9200`. Do not run anything that rewrites data against it, and do not record its credentials in files.
- `gh` is at `/opt/homebrew/bin/gh` (not on PATH in agent shells). The token has no `project` scope, so board fields for the three tickets (#19869, #19870, kibana#296026) could not be verified.
- This file is untracked and meant to stay uncommitted. Never put working notes inside a package folder: package validation rejects extra files there.

## Suggested skills

- `tdd` (or `superpowers:test-driven-development`): the EUID behavior is covered by snapshot and unit tests, so write the cases first.
- `get-context-on-domain`: Entity Store EUID and graph history, before changing the ranking.
- `entity-maintainer-integrations`: background on Entity Store v2 fields and ES|QL conventions.
- `code-review` and `create-pr` when the change is ready.
