# Nightshift detection

The detection engine of Nightshift: it runs detection strategies per space on a one-minute tick and
stores what they find as detection signals. It replaces Discovery; the design is in
[nightshift-program#2053](https://github.com/elastic/nightshift-program/issues/2053). This plugin is server-only and built with Kibana DI (`server/setup/`).

Phase 1 ([nightshift-program#2054](https://github.com/elastic/nightshift-program/issues/2054)) lays the skeleton: the plugin, the strategy contracts, the
signal format and store, the state index with its run lease, the service account setup and the
bound workflow that calls `_tick`. No strategy detects anything yet.

## Availability

The plugin is off by default (`xpack.nightshiftDetection.enabled: false`) and off in every shipped
config. When loaded, `AvailabilityService` also requires the `nightshift.enabled` feature flag, an
Observability project on Serverless, the `streams:significant-events` pricing feature and an
Enterprise license.

## Elasticsearch clients

Two clients, two identities:

- `EngineDataClient`: the space's detection service account, request-scoped. Generators read
  customer data with it.
- `DetectionEngineSystemClient`: `asInternalUser` (kibana_system). Every read and write on
  `.nightshift-detection_engine-*` goes through it.

## Terms

The prototype used other names. The code uses the one pager's:

| Prototype | Code |
| --- | --- |
| `ISignalStrategy` | `DetectionStrategy` token |
| `StrategyObservation`, `EngineSignal` | `DetectionSignal` |
| `triage_step` | detection signals triager |
| triage agent | judge |
| `run_activity` | activity log |

## Running it locally

Add to `config/kibana.dev.yml`:

```yaml
xpack.nightshiftDetection.enabled: true
xpack.security.serviceAccounts.enabled: true
```
