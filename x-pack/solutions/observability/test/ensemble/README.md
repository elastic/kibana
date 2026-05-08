# Ensemble Workflows

Automated end-to-end testing for Observability products. These workflows use [Ensemble](https://ensemble.elastic.dev) to spin up ESS clusters, deploy resources, and run tests.

## Prerequisites

- [Ensemble CLI](https://ensemble.elastic.dev) installed
- [GitHub CLI](https://cli.github.com/) (`gh`) authenticated
- GCP auth: `gcloud auth application-default login` (for cluster creation)

---

## Synthetics

Scalability testing for Synthetics private locations. Creates monitors, deploys Elastic Agent, and validates performance under load.

### Workflows

#### scalability.yaml

Full workflow - creates cluster from scratch.

```bash
cd x-pack/solutions/observability/test/ensemble/synthetics
GH_PAGER= ensemble client submit --config scalability.yaml --daemon
```

**Steps:**
1. **Find latest kibana version** - Fetches unstable build artifacts from CI
2. **Create cluster** - Spins up ESS cluster via `oblt-cli` with latest ES/Kibana images
3. **Run Synthetics Forge** - Creates space, agent policy, private location, and monitors
4. **Deploy Elastic Agent** - Runs agent container with Chromium/Playwright for browser monitors
5. **Wait for agent enrollment** - 20s wait for agent to check in
6. **Verify agent health** - Confirms agent enrolled via Fleet API
7. **Cleanup agent container** - Removes Docker container (if `cleanup_after=y`)
8. **Cleanup cluster** - Destroys ESS cluster (if `cleanup_after=y`)

#### scalability_dev.yaml

Uses an existing cluster. For iterating without waiting for cluster creation.

```bash
cd x-pack/solutions/observability/test/ensemble/synthetics
GH_PAGER= ensemble client submit --config scalability_dev.yaml --daemon
```

> `GH_PAGER=` disables gh CLI pager - required due to an Ensemble bug with `gh api` param execution.

### Without Ensemble

Run synthetics_forge directly:

```bash
HTTP=10 TCP=10 ICMP=10 BROWSER=5 \
node x-pack/scripts/synthetics_forge.js create
```

See [@kbn/synthetics-forge README](../../packages/kbn-synthetics-forge/README.md).
