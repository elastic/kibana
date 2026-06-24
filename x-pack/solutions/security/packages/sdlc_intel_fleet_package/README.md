# SDLC Intelligence Fleet package

Elastic Fleet integration package for the SDLC Intelligence platform: Elasticsearch index templates, ES|QL views, Kibana dashboards, and GitHub/Slack ingest workflow definitions.

## Package layout

```
sdlc_intel-0.1.0/
├── manifest.yml
├── elasticsearch/
│   ├── index_template/     # github-intel-*, slack-intel-*, sdlc-* indices
│   └── esql_view/
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

## Ingest workflows

Workflows use connector ingest actions (`github.runQueryTemplate`, `slack2.listUsers`, `slack2.getChannelHistory`, etc.).

1. Create **GitHub** (`.github`) and **Slack** (`.slack2`) connectors with appropriate OAuth scopes.
2. Install this Fleet package (creates index templates; installs workflow YAML when `workflowsManagement` is available).
3. If workflows are not auto-installed, import from **Workflows → Examples** or copy YAML from `kibana/workflow/`.
4. Set connector IDs in each workflow's `consts` and enable.

### GitHub workflows

| Workflow | Schedule | Template / action | Target index |
|----------|----------|-------------------|--------------|
| **catalog repos** | daily | `orgCatalog.repos` | `github-intel-repos` |
| **catalog teams** | daily | `orgCatalog.teams` | `github-intel-teams` |
| **catalog org members** | daily | `orgCatalog.members` | `github-intel-people` |
| **catalog team members** | daily | `orgCatalog.teamMembers` | `github-intel-people`, `github-intel-relationships` |
| **catalog projects** | daily | `orgCatalog.projects` | `github-intel-projects` |
| **catalog project items** | daily | `orgCatalog.projectItems` | `github-intel-project-items` |
| **activity issues** | every 30m | `activity.searchIssues` | `github-intel-issues` |
| **activity pull requests** | every 30m | `activity.searchPullRequests` | `github-intel-pull-requests` |
| **enrich issues graph** | hourly | `graph.issueGraph` | `github-intel-issues`, `github-intel-comments`, `github-intel-relationships` |
| **enrich PRs graph** | hourly | `graph.pullRequestGraph` | `github-intel-pull-requests`, `github-intel-relationships` |

**Recommended order:** catalog (repos → teams → org members → team members → projects → project items) → activity (issues → PRs) → enrichment (issues graph → PRs graph).

### Slack workflows

| Workflow | Schedule | Action | Target index |
|----------|----------|--------|--------------|
| **catalog users** | daily | `slack2.listUsers` | `slack-intel-people` |
| **channel history** | hourly | `slack2.getChannelHistory` | `slack-intel-messages` |

Slack OAuth scopes must include `channels:history`, `groups:history`, `users:read`, and channel read scopes.

## Fleet workflow auto-install

When the `workflowsManagement` plugin is enabled, Fleet installs package workflows from `kibana/workflow/*.yaml` during package installation. Workflow IDs follow the pattern `fleet-{spaceId}-{pkgName}-{file-base}`.

## Related Kibana code

- GitHub GraphQL ingest actions: `src/platform/packages/shared/kbn-connector-specs/src/specs/github/`
- Slack ingest actions: `src/platform/packages/shared/kbn-connector-specs/src/specs/slack/`
- Fleet workflow installer: `x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_workflow_assets.ts`
- Bundled workflow examples: `src/platform/packages/shared/kbn-workflows/spec/examples/sdlc_*.yml`
