# Rule creation evaluation entry point

The suite binds the per-space Rule Coverage worker through the production workers PATCH API,
seeds a pending `security.coverage` knowledge indicator in `security-investigations`, and runs
that worker. It scores the rule-creation child dispatched by coverage review, not a direct
run of the globally managed rule-creation workflow. Preview and proposal children inherit the
worker's service account. Product workflows are not modified by the suite.

Both `alertzero_fast` (coverage check) and `alertzero_reasoning` (draft creation) are bound to
the model under test and restored afterward. Coverage review can judge a gap already covered;
in that case the client fails explicitly because no rule-creation draft ran. It does not turn
that path into a successful empty/N/A score. Dataset `confidence` remains metadata: the
production coverage review does not forward it to rule creation.

Use a dedicated eval stack and space. The client cancels active coverage-chain executions at
setup and drains the immediate scheduled tick produced by enabling a worker before seeding.
Examples run serially through the concurrency-limited sweep. Before the next example, the
client cancels its owned review/creation executions and deletes its KI. The worker remains
bound, with assisted autonomy and a 999-day schedule interval, on this disposable stack.

## Opt-in live plumbing check

With the Scout `evals_detection_watch_rule_creation` stack running and both inference features
configured, run:

```sh
RULE_CREATION_LIVE_SMOKE=1 node scripts/jest \
  --config x-pack/solutions/security/packages/kbn-evals-suite-detection-watch-rule-creation/jest.config.js \
  --runInBand --testPathPattern=coverage_chain.live
```

Optional environment overrides: `TEST_KIBANA_URL`, `TEST_ES_URL`, `TEST_USERNAME`, `TEST_PASSWORD`.
The check uses the actual client, HTTP APIs and Elasticsearch, verifies a draft/pending proposal,
and prints creation/preview/proposal execution identities. A canned inference endpoint proves
plumbing only; real-model smoke and cross-family evaluations are required for score claims.
