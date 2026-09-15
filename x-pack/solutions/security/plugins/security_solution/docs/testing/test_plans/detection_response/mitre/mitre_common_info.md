# Common information about Managed MITRE ATT&CK <!-- omit from toc -->

> [!TIP]
> Test plans in this folder:
> - [Managed MITRE Data Layer](./managed_mitre_data_layer.md) — SO population, feature flag, entities API, data client, multi-version, error handling
> - [Managed MITRE UI Integration](./managed_mitre_ui.md) — MITRE hook, technique picker, coverage overview

## Table of contents <!-- omit from toc -->

<!--
Please use the "Markdown All in One" VS Code extension to keep the TOC in sync with the text:
https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
-->

- [Tickets](#tickets)
- [Terminology](#terminology)
- [Common assumptions](#common-assumptions)
- [Common product requirements](#common-product-requirements)

## Tickets

- [Managed MITRE workstream epic](https://github.com/elastic/security-team/issues/9627)
- [Sub-epic](https://github.com/elastic/security-team/issues/17157)

## Terminology

- **Entities API**: `GET /internal/mitre/entities` — the internal API route that returns MITRE entities filtered by framework, version, type, and status.
- **MITRE entity**: a tactic, technique, or subtechnique stored as a `mitre-attack-entity` Saved Object. All entities share common fields: `id`, `name`, `reference`, `framework`, `framework_version`, `revoked`, and `deprecated`.
  - **Tactic**: the highest level of the MITRE ATT&CK matrix, representing broad adversary goals (e.g. Execution, Persistence). Has a `position` field used to order columns in the coverage overview.
  - **Technique**: a specific method an adversary uses to achieve a tactic goal. Has a `tactic_ids` array linking it to one or more parent tactics — a technique can belong to multiple tactics.
  - **Sub-technique**: a more granular variant of a technique. Has a `tactic_ids` array inherited from its parent and a `technique_id` linking it directly to its parent technique.
- **Data client**: server-side read-only client exported from the `mitre_attack` plugin's start contract. Exposes `getById()`, `list()`, and `search()` methods. `list()` returns typed buckets (`tactics`, `techniques`, `subtechniques`) plus `byId` and `subtechniquesByTechniqueId` lookup maps. `getById()` and `search()` return individual full entities.
- **`status` parameter**: controls whether inactive entities are included. `'active'` (default) returns only entities where both `revoked` and `deprecated` are false. `'all'` returns all entities regardless of status.
- **Population**: the `bulkCreate` call in the `mitre_attack` plugin's `start()` lifecycle that writes all entities from the bundled artifact into the `.kibana_security_solution` index using deterministic SO IDs of the form `{framework}:{framework_version}:{mitre_id}`.
- **Legacy blob**: `mitre_tactics_techniques.ts`, the existing hardcoded TypeScript file retained as the feature-flag-off fallback.

## Common assumptions

- Unless explicitly stated otherwise, the `managedMitreSourceEnabled` feature flag is **enabled** and MITRE entity Saved Objects have been populated from the bundled artifact.

## Common product requirements

- The switch from the legacy hardcoded data source to the managed data source introduces no visible change to user-facing MITRE data or workflows.
- When the feature flag is disabled, all existing MITRE functionality continues to work exactly as before with no degradation.
- Updating to a new MITRE framework version requires no extra code changes or Kibana upgrades — populating a new artifact version is sufficient.
