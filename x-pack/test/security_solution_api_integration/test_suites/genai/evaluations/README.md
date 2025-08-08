## Summary

This FTR suite is for running the Security GenAI Assistant and Attack Discovery evaluation suites. Evaluations can either be run locally, or on CI by adding the `ci:security-genai-run-evals` GitHub label to a PR. CI evaluations are also run weekly by means of the `kibana-ess-security-solution-gen-ai-evals` BuildKite pipeline (located in `security_solution/gen_ai_evals.yml`), and can also be manually triggered from the [pipeline](https://buildkite.com/elastic/kibana-ess-security-solution-gen-ai-evals) directly on BuildKite.

Most pre-requisites for running the evaluations are managed for you. Connector/LangSmith secrets are stored in vault, and managed via the scripts in `x-pack/test/security_solution_api_integration/scripts/genai/vault`. They are then read from ENV variables at test-time. Data pre-requisites are managed on test setup and include the installation of ptTinyElser, setup of the Knowledge Base, and ingestion of Attack Discovery alerts and KB entries.

> [!NOTE]
> In discussion with @elastic/kibana-operations it was preferred to use the ci-prod vault for which we do not have access. so they are also mirrored to the `secrets.elastic.co` vault which can be modified via manage_secrets.ts and surrounding scripts so we can self-manage to a degree.

### To Run Locally:

All commands can be run from security test root:

```
cd x-pack/test/security_solution_api_integration
```

Ensure you are authenticated with vault for Connector + LangSmith creds:

> See [internal docs](https://github.com/elastic/infra/blob/master/docs/vault/README.md#login-with-your-okta) for setup/login instructions.

Fetch config, which includes Connectors and LangSmith creds:

```
node scripts/genai/vault/retrieve_secrets  
```

Load the env vars, and start server:
```
export KIBANA_SECURITY_GEN_AI_CONFIG=$(base64 -w 0 < scripts/genai/vault/config.json)
yarn genai_evals:server:ess
```

Then in another terminal, load vars and run the tests:
```
export KIBANA_SECURITY_GEN_AI_CONFIG=$(base64 -w 0 < scripts/genai/vault/config.json)
yarn genai_evals:runner:ess
```

### To manually run on BuildKite:
Navigate to [BuildKite](https://buildkite.com/elastic/kibana-ess-security-solution-gen-ai-evals) and run `ftr-security-solution-gen-ai-evaluations` pipeline. If you want to run with a custom config, first modify `x-pack/test/security_solution_api_integration/scripts/genai/vault/config.json` and then run:

```
 node scripts/genai/vault/get_command --format env-var 
```

which can then be pasted into `Environment Variables` section of the BuildKite pipeline. This is helpful for running evals just against a specific model or to change the evaluator model.

### To manually run on BuildKite for specific PR:
Add `ci:security-genai-run-evals` label to PR

### To update secrets

As mentioned above, secrets are mirrored between two different vaults since access differs between local development and CI. If you need to modify either the list of connectors, the LangSmith API key, or the preferred evaluatorConnectorId, perform the following steps:

Navigate to the test directory and fetch the latest secrets from our `siem-team` vault:

```
cd x-pack/test/security_solution_api_integration
node scripts/genai/vault/retrieve_secrets
```

Modify `x-pack/test/security_solution_api_integration/scripts/genai/vault/config.json` accordingly.

Then, run the following command to upload the secrets back to the `siem-team` vault:

```
node scripts/genai/vault/upload_secrets --vault siem-team
```

Then finally, you must contact @elastic/kibana-operations and have them upload the secrets to the `ci-prod` vault. For this you can either have them run the following commands:

```
node scripts/genai/vault/retrieve_secrets.js --vault siem-team
node scripts/genai/vault/upload_secrets.js --vault ci-prod
```

Or you can run the below command and paste the results into https://p.elstc.co and share the link with them to make updating secrets a little easier: 

```
node scripts/genai/vault/get_command --format vault-write --vault ci-prod
```
