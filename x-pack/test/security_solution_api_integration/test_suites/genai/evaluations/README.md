## Summary

Introduces a new `security_solution/gen_ai_evals.yml` BuildKite pipeline for automatically running our Assistant and Attack Discovery evaluation suites weekly.

### To Run Locally:
Ensure you are authenticated with vault for LLM + LangSmith creds:

> See [internal docs](https://github.com/elastic/infra/blob/master/docs/vault/README.md#login-with-your-okta) for setup/login instructions.

Fetch Connectors and LangSmith creds:

> [!NOTE]
> In discussion with @elastic/kibana-operations it was preferred to use the ci-prod vault, but they are currently mirrored to `SECURITY_GEN_AI_VAULT` which can be modified manage_secrets.ts so we can self-manage to a degree.

```
cd x-pack/test/security_solution_api_integration
node scripts/genai/vault/retrieve_secrets.js  
```


Navigate to api integration directory, load the env vars, and start server:
```
cd x-pack/test/security_solution_api_integration
export KIBANA_SECURITY_TESTING_AI_CONNECTORS=$(base64 -w 0 < scripts/genai/vault/connector_config.json) && export KIBANA_SECURITY_TESTING_LANGSMITH_KEY=$(base64 -w 0 < scripts/genai/vault/langsmith_key.txt)
yarn genai_evals:server:ess
```

Then in another terminal, load vars and run the tests:
```
cd x-pack/test/security_solution_api_integration
export KIBANA_SECURITY_TESTING_AI_CONNECTORS=$(base64 -w 0 < scripts/genai/vault/connector_config.json) && export KIBANA_SECURITY_TESTING_LANGSMITH_KEY=$(base64 -w 0 < scripts/genai/vault/langsmith_key.txt)
yarn genai_evals:runner:ess
```

### To manually run on BuildKite:
Navigate to [BuildKite](https://buildkite.com/elastic?filter=ftr-security-solution-gen-ai-evaluations) and run `ftr-security-solution-gen-ai-evaluations` pipeline.

### To manually run on BuildKite for specific PR:
In `.buildkite/ftr_security_stateful_configs.yml`, temporarily move the `genai/evaluations/trial_license_complete_tier/configs/ess.config.ts` line down to the `enabled` section. Will see if we can do this without requiring a commit. @elastic/kibana-operations is it possible to set a buildkite env var that can be read in FTR tests when a specific GitHub label is added to the PR? I.e. can I create a `SecurityGenAI:Run Evals` label that when added will run this suite as part of the build?






