# SDLC Intelligence Fleet package

Elastic Fleet integration package for the SDLC Intelligence platform: Elasticsearch index templates, ES|QL views, Kibana dashboards, and GitHub/Slack ingest workflow definitions.

## Package layout

```
sdlc_intel-0.1.0/
├── manifest.yml
├── elasticsearch/
│   ├── index_template/     # github-intel-*, slack-intel-*, sdlc-* indices
│   ├── esql_view/
│   └── ilm_policy/         # sdlc_intel_retention (365d delete phase)
├── kibana/
│   ├── dashboard/
│   ├── lens/
│   ├── index_pattern/
│   └── workflow/           # Auto-installed when workflowsManagement plugin is enabled
│       ├── github-*.yaml
│       └── slack-*.yaml
└── docs/
```

## Build zip

From this directory:

```bash
cd sdlc_intel-0.1.0
zip -r ../.target/sdlc_intel-0.1.0.zip .
```

Install via **Fleet → Integrations → Upload integration** (or your local package registry workflow).

## Fleet integration vars

When adding the integration policy, set:

| Var | Purpose |
|-----|---------|
| `github_connector_id` | Kibana `.github` connector ID — auto-substituted into workflow YAML on install |
| `slack_connector_id` | Kibana `.slack2` connector ID |
| `org_login` | GitHub organization login (default: `elastic`) — replaces `REPLACE_WITH_ORG_LOGIN` in GitHub workflows |
| `salesforce_connector_id` | Kibana `.salesforce` connector ID — feedback-loop Case ingest |
| `salesforce_case_github_field` | Salesforce Case custom field API name for GitHub issue URL (default: `Engineering_Issue_URL__c`) |
| `sdh_repo_pattern` | GitHub search repo qualifier for SDH repos (default: `sdh-*`) |
| `sdh_label` | GitHub label for SDH issues in product repos (default: `sdh`) |
| `salesforce_product_area_field` | Salesforce Case product area field (default: `Product_Area__c`) |

If vars are unset, workflows retain `REPLACE_WITH_*` placeholders for manual editing.

## ILM retention

Fleet installs `elasticsearch/ilm_policy/sdlc_intel_retention.json` during package install (unless Fleet internal ILM is disabled). All 22 index templates reference `index.lifecycle.name: sdlc_intel_retention`.

| Phase | Age | Action |
|-------|-----|--------|
| Hot | 0 | Priority 100 |
| Warm | 30 days | Priority 50 |
| Delete | 365 days | Delete backing index |

Indices use fixed names with workflow upserts (not data streams). ILM delete applies to the **index age**, not per-document `@timestamp`. After 365 days from index creation, Elasticsearch deletes the entire backing index; workflows recreate it on the next run. Tune the delete phase in a forked policy if your deployment needs longer retention.

## Ingest workflows

Workflows use connector ingest actions (`github.runQueryTemplate`, `slack2.listUsers`, `slack2.getChannelHistory`, `slack2.getConversationReplies`, etc.).

1. Create **GitHub** (`.github`) and **Slack** (`.slack2`) connectors with appropriate OAuth scopes.
2. Install this Fleet package (creates index templates, ILM policy, dashboards; installs workflow YAML when `workflowsManagement` is available).
3. Add an integration policy with connector IDs, or set `consts` manually and enable workflows.

### GitHub workflows

| Workflow | Schedule | Template / action | Target index |
|----------|----------|-------------------|--------------|
| **catalog repos** | daily | `orgCatalog.repos` | `github-intel-repos` |
| **catalog teams** | daily | `orgCatalog.teams` | `github-intel-teams` |
| **catalog org members** | daily | `orgCatalog.members` | `github-intel-people` |
| **catalog team members** | daily | `orgCatalog.teamMembers` | `github-intel-people`, `github-intel-relationships` |
| **catalog projects** | daily | `orgCatalog.projects` | `github-intel-projects` |
| **catalog project items** | daily | `orgCatalog.projectItems` | `github-intel-project-items` |
| **catalog project views** | daily | `orgCatalog.projectViews` | `github-intel-project-views` |
| **activity issues** | every 30m | `activity.searchIssues` | `github-intel-issues` |
| **activity pull requests** | every 30m | `activity.searchPullRequests` | `github-intel-pull-requests` |
| **enrich issues graph** | hourly | `graph.issueGraph` | `github-intel-issues`, `github-intel-comments`, `github-intel-relationships` |
| **enrich PRs graph** | hourly | `graph.pullRequestGraph` | `github-intel-pull-requests`, `github-intel-relationships` |
| **normalize project items** | every 6h | ES field parse + `fields[]` | `github-intel-project-items` |
| **build team dimension** | daily | team catalog projection | `sdlc-team-dimension` |
| **cross-link entities** | every 2h | PR/issue/project edges + PR state rollup | `github-intel-relationships`, `github-intel-project-items` |
| **project epic phases** | every 6h | Epic projection | `sdlc-epic-phases` |
| **enrich epic phases** | every 6h | Child tickets, merged PRs, phase gates | `sdlc-epic-phases`, `github-intel-epic-tickets` |
| **build release calendar** | every 12h | Epic release projection | `sdlc-release-calendar` |

**Recommended order:** catalog (repos → teams → org members → team members → projects → project items → project views) → **normalize project items** → **build team dimension** → **project epic phases** → **build release calendar** → activity (issues → PRs) → enrichment (issues graph → PRs graph) → **cross-link entities** → **enrich epic phases**.

### Slack workflows

| Workflow | Schedule | Action | Target index |
|----------|----------|--------|--------------|
| **catalog users** | daily | `slack2.listUsers` | `slack-intel-people` |
| **channel history** | hourly | `slack2.getChannelHistory` | `slack-intel-messages` |
| **thread replies** | every 2h | `slack2.getConversationReplies` | `slack-intel-messages` |

Slack OAuth scopes must include `channels:history`, `groups:history`, `users:read`, and channel read scopes.

### Salesforce + SDH feedback loop (Phase C1)

| Workflow | Schedule | Action / template | Target index |
|----------|----------|-------------------|--------------|
| **catalog cases** | hourly | `salesforce.soqlIngest` | `salesforce-intel-cases` |
| **catalog SDH issues** | hourly | `activity.searchIssues` (`repo:sdh-*`) | `github-intel-sdh-issues` |
| **cross-link feedback loop** | every 2h | Case URL field + SDH body CaseNumber search | `github-intel-relationships`, case/SDH indices |

**Recommended order:** **catalog cases** → **catalog SDH issues** → **cross-link feedback loop**.

Configure a `.salesforce` connector with OAuth API access. Set `salesforce_case_github_field` to your Case custom field that stores the GitHub issue URL. SDH issues are indexed separately from product-repo `github-intel-issues` (Option B).

Cross-link writes `customer_case_links_sdh` relationship edges when:

1. A Case stores a GitHub issue URL in the configured Salesforce field and a matching SDH issue exists.
2. An SDH issue title/body contains a Salesforce `CaseNumber` for an unlinked Case.

### Phase C2 — SDH → product engineering plane

| Workflow | Schedule | Action / template | Target index |
|----------|----------|-------------------|--------------|
| **catalog SDH labeled issues** | hourly | `activity.searchIssues` (`label:sdh`) | `github-intel-sdh-issues` |
| **cross-link SDH to product** | every 2h | SDH body product-issue URL search | `github-intel-relationships`, `github-intel-sdh-issues` |

**Extended order:** C1 workflows → **catalog SDH labeled issues** → **github-activity-issues** → **cross-link SDH to product**.

Phase C2 adds:

- **`sdh_links_product`** edges when an SDH issue body references a product-repo GitHub issue URL
- **`label:sdh`** ingest path for SDH issues tracked in product repos (not only `sdh-*` repos)
- **`salesforce_product_area_field`** on Cases for team/product taxonomy joins
- **`sdlc-feedback-loop-enriched-view`** ES\|QL view: Case → SDH → product issue (LOOKUP JOIN)
- Ingest health dashboard now includes `salesforce-intel-sync-state` checkpoints

Relationship types in `github-intel-relationships`:

| Relation | From | To |
|----------|------|-----|
| `customer_case_links_sdh` | Salesforce Case Id | SDH issue URL |
| `sdh_links_product` | SDH issue URL | Product issue URL |

## Dashboards

| Dashboard | Data source | Purpose |
|-----------|-------------|---------|
| **SDLC Executive roadmap** | `sdlc-epic-phases` | Epic count, coverage, status, roadmap stage |
| **SDLC Project item pipeline** | `sdlc-project-items-enriched-view` | Ticket types, teams, roadmap stages from ES\|QL |
| **SDLC Team dimension** | `sdlc-team-dimension` + `sdlc-epic-phases` | Org teams and epic ownership |
| **SDLC GitHub sync overview** | `sdlc-github-raw-summary-view` | Raw ingest page/item counts per project |
| **SDLC Epic phase gates** | `sdlc-epic-phases` + `sdlc-epic-tickets-by-repo-view` | Child ticket coverage, PR linkage, gate pass rates |
| **SDLC Ingest health** | `sdlc-ingest-health-view` | Checkpoint lag, stale workflows, last run status |
| **SDLC Salesforce feedback loop** | `sdlc-salesforce-feedback-view`, `sdlc-feedback-loop-enriched-view` | Case ↔ SDH linkage and Case → SDH → product three-hop view |

## Fleet workflow auto-install

When the `workflowsManagement` plugin is enabled, Fleet installs package workflows from `kibana/workflow/*.yaml` during package installation. Workflow IDs follow the pattern `fleet-{spaceId}-{pkgName}-{file-base}`.

Connector IDs, org login, Salesforce field names, SDH repo pattern, and SDH label from the integration policy vars replace `REPLACE_WITH_GITHUB_CONNECTOR_ID`, `REPLACE_WITH_SLACK_CONNECTOR_ID`, `REPLACE_WITH_SALESFORCE_CONNECTOR_ID`, `REPLACE_WITH_SALESFORCE_CASE_GITHUB_FIELD`, `REPLACE_WITH_SALESFORCE_PRODUCT_AREA_FIELD`, `REPLACE_WITH_SDH_REPO_PATTERN`, `REPLACE_WITH_SDH_LABEL`, and `REPLACE_WITH_ORG_LOGIN` during install.

On package uninstall, workflow assets are deleted via `workflowsManagement.deleteWorkflows`.

## Validation

```bash
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/specs/github/graphql/templates.test.ts
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/specs/slack/slack.test.ts
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/specs/salesforce/salesforce.test.ts
node scripts/jest src/platform/packages/shared/kbn-workflows/spec/examples/sdlc_intel_package.test.ts
node scripts/jest x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_workflow_assets.test.ts
```

## Related Kibana code

- GitHub GraphQL ingest actions: `src/platform/packages/shared/kbn-connector-specs/src/specs/github/`
- Slack ingest actions: `src/platform/packages/shared/kbn-connector-specs/src/specs/slack/`
- Salesforce ingest actions: `src/platform/packages/shared/kbn-connector-specs/src/specs/salesforce/`
- Fleet workflow installer: `x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_workflow_assets.ts`
- Fleet workflow uninstall: `x-pack/platform/plugins/shared/fleet/server/services/epm/packages/remove.ts`
- Bundled workflow examples: `src/platform/packages/shared/kbn-workflows/spec/examples/sdlc_*.yml`
