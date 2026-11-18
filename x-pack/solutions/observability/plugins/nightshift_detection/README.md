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
  `.nightshift-detection_engine-*` goes through it, and so does the per-space run lock that
  `SpaceRunLock` takes in `.kibana_locks` (`@kbn/lock-manager`).

## Running it locally

Add to `config/kibana.dev.yml`:

```yaml
xpack.nightshiftDetection.enabled: true
xpack.security.serviceAccounts.enabled: true
```

## Setting up a space

The engine runs a space as the deployment's `nightshift_detection` service account. Kibana never
creates the account: a user with the `manage_security` cluster privilege and the Nightshift manage
privilege runs the setup, and the server only binds the space to the account it is given.

`POST /internal/nightshift/detection/service_account/_enable` with `{ "serviceAccountId": "<id>" }`
binds the space to an existing account. Calling it again with the same id changes nothing; another
space can reuse the account.

`GET /internal/nightshift/detection/service_account` reports the account a space runs as, the role
it must hold and whether the current user may set the space up.

The account's role must exist, and the engine never creates it:

- Stateful: create `nightshift_detection` with `ensureNightshiftServiceAccountRoles` from
  `@kbn/nightshift-shared` (tests, evals and local development do).
- Serverless: the role `_nightshift_detection` is predefined.
