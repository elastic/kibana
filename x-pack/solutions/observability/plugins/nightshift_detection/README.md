# Nightshift detection

The detection engine of Nightshift. It runs detection strategies per space on a schedule and stores
what they find as detection signals. This plugin is server-only and built with Kibana DI
(`server/setup/`).

## Availability

The plugin is off by default (`xpack.nightshiftDetection.enabled: false`) and off in every shipped
config. When loaded, `AvailabilityService` also requires the `nightshift.enabled` feature flag, an
Observability project on Serverless, the `nightshift:detection-engine` pricing feature and an
Enterprise license.

## Elasticsearch clients

Two clients, two identities:

- `DetectionEngineDataClient`: the space's detection service account, request-scoped. Generators read
  customer data with it.
- `DetectionEngineSystemClient`: `asInternalUser` (kibana_system). Every read and write on
  `.nightshift-detection_engine-*` goes through it.

## Running it locally

Add to `config/kibana.dev.yml`:

```yaml
xpack.nightshiftDetection.enabled: true
xpack.security.serviceAccounts.enabled: true
```
