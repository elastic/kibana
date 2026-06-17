# Observability Demo Data (dev only)

`devOnly` plugin that powers the "Run in browser" action of the Demo data &
Observability bootstrapping section in the Observability Onboarding app.

Because [`@kbn/synthtrace`](../../../../../src/platform/packages/shared/kbn-synthtrace/README.md)
is `devOnly` and excluded from production builds, this plugin (which depends on
it) is also `devOnly`. The production `observability_onboarding` plugin never
imports it; instead it feature-detects the routes below at runtime.

## Routes

- `GET /internal/observability_demo_data/synthtrace/status` — returns
  `{ available: true }` so the UI can show the "Run in browser" button.
- `POST /internal/observability_demo_data/synthtrace/run` — runs a curated
  synthtrace scenario server-side (historical mode only) and bulk-indexes the
  generated documents into Elasticsearch. Returns `{ scenarioId, eventsIndexed }`.

Live mode is intentionally not supported here; copy the CLI command instead.

### Run request body

```json
{
  "scenarioId": "infra_hosts_semconv_with_apm_hosts",
  "from": "now-1w",
  "to": "now",
  "clean": false,
  "connection": {
    "esUrl": "https://my-deployment.es.us-central1.gcp.cloud.es.io:9243",
    "kibanaUrl": "https://my-deployment.kb.us-central1.gcp.cloud.es.io:9243",
    "username": "elastic",
    "password": "<password>"
  }
}
```

When `connection` is omitted, the route uses Kibana's internal Elasticsearch
client and the plugin config defaults below.

## Configuration

The synthtrace clients install Fleet integration packages over HTTP, so the
plugin needs a Kibana target with credentials. Defaults match the synthtrace
CLI (localhost, `elastic`/`changeme`) and can be overridden:

```yaml
xpack.observability_demo_data.synthtrace.kibanaUrl: 'http://localhost:5601'
xpack.observability_demo_data.synthtrace.username: 'elastic'
xpack.observability_demo_data.synthtrace.password: 'changeme'
# or
xpack.observability_demo_data.synthtrace.apiKey: '<base64 api key>'
```

The onboarding UI also exposes connection overrides per run (useful for Elastic
Cloud deployments where `.kb` / `.es` URLs are derived from the current origin).
