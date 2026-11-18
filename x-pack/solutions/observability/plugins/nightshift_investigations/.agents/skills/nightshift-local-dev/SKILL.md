---
name: nightshift-local-dev
description: Set up a local Kibana to run Nightshift investigations against the ORCA-bench telemetry cluster with the shared eval sandbox, in one command after `vault login`, or with `--river` in a River session. Use when you need realistic, reproducible incident data on a local Kibana (prompt A/B tests, demos, debugging the investigation agent), when local Nightshift reports `available:false` or sandbox `Unauthenticated`, or when rotating the shared `kibana-local-dev` sandbox credential.
---

# Nightshift on a local Kibana, with ORCA data

ORCA-bench is a static Elastic Cloud cluster holding six days (2026-04-19 to 2026-04-24 UTC) of
OpenTelemetry-demo telemetry, with 42 feature-flag incidents and SRE-curated ground truth. With the
shared eval sandbox it gives a local Kibana real investigations without minikube, a local
sandbox-service or a personal sandbox credential.

**Use it** for realistic, reproducible incident data on a local Kibana.

**Don't use it** when:

- you need data the agent can write to, or a scenario ORCA doesn't contain: run
  `node scripts/otel_demo.js` and a local sandbox-service, so the sandbox can reach your
  Elasticsearch.
- you want graded runs with judges: run the eval suite,
  `NIGHTSHIFT_DATASETS=orcabench node scripts/evals start --suite nightshift-investigations --profile dev-vault`.

## Setup

Needs only dev Vault access (no VPN, GCP or sandbox-service checkout) and a stateful Kibana in dev
mode with Elasticsearch connected to the Elastic Inference Service (EIS). The default investigation
model, `.anthropic-claude-5.5-sonnet-chat_completion`, is an EIS endpoint, so without EIS
investigations report `available:false`. `--eis` also sets the trial license the ORCA connector
needs.

```bash
pnpm es snapshot --eis    # terminal 1, reads the EIS key from Vault
pnpm start                # terminal 2
node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/setup_local_dev.js
```

`pnpm es snapshot` starts an empty cluster each time, so run the script again after restarting
Elasticsearch.

The script logs in to Vault when your token is missing or expired, then:

1. Reads the sandbox credential from `secret/kibana-issues/dev/kbn-evals/nightshift-local-dev` and
   the ORCA key (`nightshiftOrcaEs.apiKey`) from `secret/kibana-issues/dev/kbn-evals/nightshift`, and checks
   the credential against sandbox-api.
2. Writes a block between `# >>> nightshift local-dev ... >>>` markers to `config/kibana.dev.yml`
   (mode `0600`): the `nightshift.enabled` feature flag, the investigations, agentic investigations
   and proposals plugins, service accounts, and the eval sandbox and its key. A setting the file
   already sets to the same value is left out; one set to another value stops the script, which
   names it.
3. Waits for Kibana to restart, checks the license, and binds the default space to the Nightshift
   service accounts (creating their roles in Elasticsearch), as the app's onboarding does.
4. Creates the `.elasticsearch` connector `orcabench-es` (named `orcabench_es`, as in the evals) and
   saves it on the investigator agent, keeping its other connectors.
5. Adds the ORCA evals' custom context snippet to the space, pointing the agent at the demo's source
   (`github.com/open-telemetry/opentelemetry-demo` at ORCA's commit), and `github.com` to the space's
   sandbox egress allowlist so it can clone it. Other snippets and hosts stay.
6. Checks that investigations are available, that the connector is a sandbox connector saved on the
   investigator, that the space holds the snippet and the host, and that the key can count ORCA
   logs.

Re-running changes nothing, unless the credential was rotated. Flags: `--dry-run` (print the block,
secrets redacted), `--skip-connector` (only the config, Kibana not running yet), `--connector-only`
(only the Kibana steps), `--remove` (delete the connector, the snippet, the `github.com` egress and the block), `--kibana-url`
(default `http://localhost:5601`; a dev base path is detected), `--kibana-auth` (default
`elastic:changeme`, then `elastic_serverless:changeme`), `--es-url` (default
`http://localhost:9200`), `--kibana-config`.

On a local Serverless observability project with UIAM, the same script works:

```bash
pnpm es serverless --projectType observability --productTier complete --eis    # terminal 1
pnpm start --serverless=oblt --no-base-path --server.publicBaseUrl=http://localhost:5601  # terminal 2
node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/setup_local_dev.js
```

UIAM rejects basic auth for creating service accounts, so the script binds the space as the mock
IdP's `admin`, as Scout does. That login doesn't support a dev base path, hence `--no-base-path`;
`publicBaseUrl` keeps the investigation's `kibana.request` steps on the local Kibana.

## In a River session

A River session has no Vault access and holds no real credential. River's control plane keeps the
EIS key, the sandbox-api key and the ORCA key, and attaches them on the way out. The session only
sees placeholders:

- Elasticsearch reaches EIS through the River daemon on `http://127.0.0.1:3002` with a placeholder
  CCM key.
- Kibana reaches sandbox-api through the daemon's TLS relay on `localhost:3003`, trusting the CA in
  `/etc/river/relay-ca.pem`, with a placeholder `xpack.sandbox.api_key`.
- The `orcabench-es` connector holds `ApiKey river-secret:orca-es`. When a command runs in the
  sandbox, River replaces the placeholder with the real key, and only if the connector's hosts are
  the ones River has registered for that key.

Stateful (stop the River `elasticsearch` service first, since it starts Elasticsearch without EIS):

```bash
river service stop elasticsearch
pnpm es snapshot --license trial -E xpack.inference.elastic.url=http://127.0.0.1:3002   # terminal 1
KIBANA_EIS_CCM_API_KEY=river-eis-relay node scripts/eis.js                              # once it is green
pnpm start                                                                               # terminal 2
node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/setup_local_dev.js --river
```

Serverless (the images are pre-pulled in River's prepared image; stop `elasticsearch` and `kibana`
first, they use the same ports):

```bash
river service stop elasticsearch; river service stop kibana
pnpm es serverless --projectType observability --productTier complete -E xpack.inference.elastic.url=http://127.0.0.1:3002
KIBANA_EIS_CCM_API_KEY=river-eis-relay node scripts/eis.js
pnpm start --serverless=oblt --no-base-path --server.publicBaseUrl=http://localhost:5601
node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/setup_local_dev.js --river
```

`--river` reads nothing from Vault. It writes the relay settings and the placeholder key to the
managed block, creates the connector with the placeholder, and checks sandbox-api through the relay.
It skips the direct ORCA count, which needs the real key. The ORCA URL defaults to the evals cluster;
override it with `--orca-url`.

In River, `RunCommandBidi` is not relayed, so commands that use `kbn-tool` callbacks fail with
`UNIMPLEMENTED`; plain commands work. With UIAM, mock IdP logins need a numeric username, such as
`12345`.

- **`Unauthenticated` from the relay**: River has no sandbox-api key for this repository; ask a
  River maintainer.
- **`secret placeholder refused`**: the connector's host is not one River registered for
  `orca-es`. River must list `nightshift-orca.es.us-west2.gcp.elastic-cloud.com`, as a bare
  hostname, in its ORCA hosts.
- **EIS endpoints missing, or `eis.js` fails**: River is not configured to relay EIS for this
  repository.

## Run an investigation

Get questions and ground truth from the dataset `nightshift/orca-sampled50-v4`, pinned in
`x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/evals/investigation/orca_dataset.ts`.
Each example has `input.question` (ORCA's wording, with a stated current time),
`output.reference_answer` and `metadata.case_id`; 10 of the 50 are no-incident controls.

```bash
curl -s -u elastic:changeme -XPOST http://localhost:5601/internal/nightshift/investigations \
  -H 'kbn-xsrf: x' -H 'x-elastic-internal-origin: kibana' -H 'Content-Type: application/json' \
  -d '{"subject":{"type":"manual","id":"<unique>"},"message":"<question>","connector_id":".anthropic-claude-5.5-sonnet-chat_completion"}'
# -> {"investigation_id": "..."}
```

Poll `GET /internal/investigations/investigations/<id>` with `elastic-api-version: 1` and
`x-elastic-internal-origin: kibana` until `in_progress` is false, then read `metadata.summary`,
`metadata.verdict`, `hypotheses` and `proposals`. Runs take about 3 to 15 minutes.

- Connector ids come from `GET /internal/inference/connectors`. Mind the dots:
  `.anthropic-claude-5.5-sonnet-chat_completion`, not `-5-5-`.
- Manual starts are capped at 5 a day. Lift the cap with
  `PUT /internal/significant_events/run_quotas` (`elastic-api-version: 1`), body
  `{"investigationLimitsEnabled": false}`.
- Unlike the eval, the ORCA key is not bounded at each task's cutoff, so the agent can read
  telemetry after the stated current time.

## Troubleshooting

- **`available:false`**: usually Elasticsearch runs without EIS, so the default model
  `.anthropic-claude-5.5-sonnet-chat_completion` doesn't exist (the Kibana log says
  `NightshiftModelNotFoundError`). Restart it with `pnpm es snapshot --eis` and re-run the script.
  Otherwise a plugin is disabled or the space isn't bound; the script's last step says which check
  fails.
- **Sandbox `Unauthenticated`**: the credential was rotated. Re-run the script.
- **"already set outside the managed block"**: remove or comment out the named settings, for
  example a personal sandbox key, and re-run.

## Maintainers: rotate the shared credential

Everyone shares the sandbox account `kibana-local-dev` on the eval cluster, separate from the
evals' `local-eval-runner`. To rotate it you need a dev Vault login, gcloud access to
`elastic-observability`, `kubectl` and a sandbox-service checkout:

```bash
node x-pack/solutions/observability/plugins/nightshift_investigations/scripts/rotate_local_dev_sandbox_credential.js \
  --sandbox-service-dir ~/sandbox-service
```

It runs `add-dev-credential.py eval kibana-local-dev --json`, writes the result to Vault, reads it
back and checks that sandbox-api accepts it, without printing the password. If the Vault write
fails, the cluster already has the new password; fix the access and re-run, which rotates again.
`--from-file <json>` uploads an already minted `{"username","password"}` file instead of rotating.
After a rotation, every developer re-runs the setup script.

ORCA telemetry is CC BY 4.0 (Gong et al., arXiv:2607.28545). Keep the attribution when you share
results.
