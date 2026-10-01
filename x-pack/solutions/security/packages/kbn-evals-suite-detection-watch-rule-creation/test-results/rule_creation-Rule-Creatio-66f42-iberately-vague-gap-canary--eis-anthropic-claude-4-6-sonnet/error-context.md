# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rule_creation.spec.ts >> Rule Creation Worker >> quality gate trips on a deliberately vague gap (canary)
- Location: x-pack/solutions/security/packages/kbn-evals-suite-detection-watch-rule-creation/evals/rule_creation.spec.ts:110:28

# Error details

```
Error: Managed workflow "system-security-rule-creation" is not installed. It is installed at plugin start by the alertzero plugin (installStatic / ALERTZERO_WATCH_WORKFLOW_IDS), so this usually means the alertzero plugin is disabled or the Workflows feature is unavailable. This suite does not create the workflow itself: it must measure the workflow that ships. Original error: [GET - http://localhost:5620/api/workflows/workflow/system-security-rule-creation] request failed (attempt=1/0): undefined -- Status: 404, Cause: [GET http://localhost:5620/api/workflows/workflow/system-security-rule-creation] 404 Not Found -- {"statusCode":404,"error":"Not Found","message":"Workflow not found"} -- and ran out of retries
```

# Test source

```ts
  1   | /*
  2   |  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
  3   |  * or more contributor license agreements. Licensed under the Elastic License
  4   |  * 2.0; you may not use this file except in compliance with the Elastic License
  5   |  * 2.0.
  6   |  */
  7   | 
  8   | /*
  9   |  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
  10  |  * Elastic License 2.0; you may not use this file except in compliance with the Elastic License
  11  |  * 2.0.
  12  |  */
  13  | 
  14  | import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
  15  | import type { HttpHandler } from '@kbn/core/public';
  16  | import type { ToolingLog } from '@kbn/tooling-log';
  17  | import {
  18  |   RULE_CREATION_WORKFLOW_ID,
  19  |   WORKFLOWS_API_VERSION,
  20  |   DRAFT_STEP_ID,
  21  |   REVIEW_STEP_ID,
  22  | } from './constants';
  23  | 
  24  | // The model connector (used by the workflow's ai.agent step) is not checked here — if it is
  25  | // misconfigured the workflow execution will fail loudly on its own. Only the judge connector
  26  | // can fail silently: a missing judge causes LLM evaluators to return N/A with no obvious error.
  27  | export const ensureJudgeConnectorAccessible = async ({
  28  |   fetch,
  29  |   connector,
  30  |   log,
  31  | }: {
  32  |   fetch: HttpHandler;
  33  |   connector: AvailableConnectorWithId;
  34  |   log: ToolingLog;
  35  | }): Promise<void> => {
  36  |   log.info(`Verifying AI connector: ${connector.name} (${connector.id})`);
  37  |   try {
  38  |     await fetch(`/api/actions/connector/${encodeURIComponent(connector.id)}`, { method: 'GET' });
  39  |     log.info('AI connector is accessible — proceeding with eval run');
  40  |   } catch (err) {
  41  |     throw new Error(
  42  |       `AI connector "${connector.name}" (${connector.id}) is not accessible. ` +
  43  |         `Ensure it is configured and enabled in Stack Management > Connectors ` +
  44  |         `before running this eval suite. ` +
  45  |         `Original error: ${err instanceof Error ? err.message : String(err)}`
  46  |     );
  47  |   }
  48  | };
  49  | 
  50  | /**
  51  |  * The step names the client and evaluators address. The managed workflow's yaml is the source of
  52  |  * truth — this pins the contract the suite depends on so renaming a step in the yaml fails setup
  53  |  * here instead of surfacing as opaque timeouts in every downstream lookup.
  54  |  */
  55  | /**
  56  |  * Prompt clauses the scored evaluators depend on. Kept as loose patterns: this asserts the
  57  |  * behaviour contract is present, not the exact wording (the wording itself is pinned by
  58  |  * workflow_contract.test.ts against the checked-in definition).
  59  |  */
  60  | export const REQUIRED_STEP_IDS = [DRAFT_STEP_ID, REVIEW_STEP_ID] as const;
  61  | 
  62  | /**
  63  |  * Parses the installed workflow's step names out of its yaml without a yaml dependency:
  64  |  * every `  - name: <id>` under the `steps:` key is a step declaration. Any non-indented
  65  |  * line moves the cursor to that top-level key, so `- name:` items under `outputs:` or
  66  |  * `triggers:` are never collected.
  67  |  */
  68  | const parseStepNames = (yaml: string): string[] => {
  69  |   const names: string[] = [];
  70  |   let inSteps = false;
  71  |   for (const line of yaml.split('\n')) {
  72  |     if (/^\S/.test(line)) {
  73  |       inSteps = /^steps:/.test(line);
  74  |     } else {
  75  |       const match = /^ {2}- name: (.+)$/.exec(line);
  76  |       if (inSteps && match) {
  77  |         names.push(match[1].trim());
  78  |       }
  79  |     }
> 80  |   }
      |               ^ Error: Managed workflow "system-security-rule-creation" is not installed. It is installed at plugin start by the alertzero plugin (installStatic / ALERTZERO_WATCH_WORKFLOW_IDS), so this usually means the alertzero plugin is disabled or the Workflows feature is unavailable. This suite does not create the workflow itself: it must measure the workflow that ships. Original error: [GET - http://localhost:5620/api/workflows/workflow/system-security-rule-creation] request failed (attempt=1/0): undefined -- Status: 404, Cause: [GET http://localhost:5620/api/workflows/workflow/system-security-rule-creation] 404 Not Found -- {"statusCode":404,"error":"Not Found","message":"Workflow not found"} -- and ran out of retries
  81  |   return names;
  82  | };
  83  | 
  84  | /**
  85  |  * Asserts the managed rule-creation workflow the alertzero plugin installs at start is present, and
  86  |  * returns its yaml.
  87  |  *
  88  |  * This deliberately does NOT create the workflow. The eval must measure the artifact production
  89  |  * ships — if the suite carried its own copy of the yaml, or created one on the fly, it would score
  90  |  * green against a document that no user ever runs while the real workflow regressed unobserved.
  91  |  * A missing workflow is an environment failure and should fail loudly here rather than surface as
  92  |  * mystery zeroes across every evaluator.
  93  |  */
  94  | export const assertWorkflowInstalled = async ({
  95  |   fetch,
  96  |   log,
  97  | }: {
  98  |   fetch: HttpHandler;
  99  |   log: ToolingLog;
  100 | }): Promise<{ yaml: string }> => {
  101 |   log.info(`Checking managed workflow: ${RULE_CREATION_WORKFLOW_ID}`);
  102 |   let workflow: { yaml: string };
  103 |   try {
  104 |     workflow = await fetch<{ yaml: string }>(
  105 |       `/api/workflows/workflow/${RULE_CREATION_WORKFLOW_ID}`,
  106 |       {
  107 |         method: 'GET',
  108 |         version: WORKFLOWS_API_VERSION,
  109 |         headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
  110 |       }
  111 |     );
  112 |     log.info('Managed workflow is installed — proceeding with eval run');
  113 |   } catch (err) {
  114 |     throw new Error(
  115 |       `Managed workflow "${RULE_CREATION_WORKFLOW_ID}" is not installed. It is installed at ` +
  116 |         `plugin start by the alertzero plugin (installStatic / ALERTZERO_WATCH_WORKFLOW_IDS), so this ` +
  117 |         `usually means the alertzero plugin is disabled or the Workflows feature is unavailable. ` +
  118 |         `This suite does not create the workflow itself: it must measure the workflow that ships. ` +
  119 |         `Original error: ${err instanceof Error ? err.message : String(err)}`
  120 |     );
  121 |   }
  122 | 
  123 |   // The installed document must still expose the step ids the client and evaluators
  124 |   // address by name. A rename in the managed yaml previously surfaced downstream as an
  125 |   // opaque "step not found in waiting state" poll timeout, not a setup failure.
  126 |   const stepNames = parseStepNames(workflow.yaml);
  127 |   const missing = REQUIRED_STEP_IDS.filter((id) => !stepNames.includes(id));
  128 |   if (missing.length > 0) {
  129 |     throw new Error(
  130 |       `Managed workflow "${RULE_CREATION_WORKFLOW_ID}" no longer declares step(s) ` +
  131 |         `${missing.join(', ')} (found: ${stepNames.join(', ')}). The eval client and evaluators ` +
  132 |         `address steps by id — update DRAFT_STEP_ID / REVIEW_STEP_ID in src/constants.ts when ` +
  133 |         `the managed yaml renames them.`
  134 |     );
  135 |   }
  136 | 
  137 |   return workflow;
  138 | };
  139 | 
```