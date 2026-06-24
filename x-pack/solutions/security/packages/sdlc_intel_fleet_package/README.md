# SDLC Intelligence Fleet package

Elastic Fleet integration package for the SDLC Intelligence platform: Elasticsearch index templates, ES|QL views, Kibana dashboards, and GitHub ingest workflow definitions.

## Package layout

```
sdlc_intel-0.1.0/
├── manifest.yml
├── elasticsearch/
│   ├── index_template/     # github-intel-* and sdlc-* indices
│   └── esql_view/
├── kibana/
│   ├── dashboard/
│   ├── lens/
│   ├── index_pattern/
│   └── workflow/           # Import manually until Fleet workflow asset is supported
│       └── github-catalog-repos.yaml
└── docs/
```

## Build zip

From this directory:

```bash
cd sdlc_intel-0.1.0
zip -r ../.target/sdlc_intel-0.1.0.zip .
```

Install via **Fleet → Integrations → Upload integration** (or your local package registry workflow).

## GitHub ingest workflow

The **SDLC GitHub catalog repos (GraphQL)** workflow uses the `.github` connector GraphQL ingest plane:

1. Create a **GitHub** connector (`.github`) with a PAT or OAuth token scoped for `read:org`, `read:project`, and `repo`.
2. Install this Fleet package (creates `github-intel-sync-state` and `github-intel-repos` index templates).
3. Import the workflow:
   - **Workflows → Examples → SDLC GitHub catalog repos (GraphQL)**, or
   - Copy `kibana/workflow/github-catalog-repos.yaml` into Workflows.
4. Set `consts.githubConnectorId` to your connector instance ID and adjust `consts.orgLogin` if needed.
5. Enable the workflow (daily schedule + manual trigger).

The workflow paginates up to 15 pages (1,500 repos) per run via `orgCatalog.repos`, writes checkpoints to `github-intel-sync-state`, and upserts repo documents to `github-intel-repos`.

## Related Kibana code

- GitHub GraphQL ingest actions: `src/platform/packages/shared/kbn-connector-specs/src/specs/github/`
- Bundled workflow example: `src/platform/packages/shared/kbn-workflows/spec/examples/sdlc_github_catalog_repos.yml`
