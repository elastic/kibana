# Quickstart for Developers

These tools make it fast and easy to create detection rules, exceptions, value lists, and source data for testing.

## Usage

`node x-pack/solutions/security/plugins/security_solution/scripts/quickstart/run.js`: Runs the script defined in `scratchpad.ts`
Options:
--username: User name to be used for auth against elasticsearch and kibana (Default: elastic).
--password: User name Password (Default: changeme)
--kibana: The url to Kibana (Default: http://127.0.0.1:5601). In most cases you'll want to set this URL to include the basepath as well.
--apikey: The API key for authentication, overrides username/password - use for serverless projects

`scratchpad.ts` already contains code to set up clients for Elasticsearch and Kibana. In addition it provides clients for Security Solution, Lists, and Exceptions APIs, built on top of the Kibana client. However, it does not create any rules/exceptions/lists/data - it's a blank slate for you to immediately begin creating the resources you want for testing. Please don't commit data-generating code to `scratchpad.ts`! Instead, when you have built a data-generating script that might be useful to others, please extract the useful components to the `quickstart/modules` folder and leave `scratchpad.ts` empty for the next developer.

## Auth

Most modules talk to Kibana through its public APIs, so the default `elastic` superuser works fine. Some modules, however, may need to write saved objects directly to the Kibana system indices (`.kibana*`) via the ES client - for example, to setup prebuilt `security-rule` assets in `.kibana_security_solution`. The `elastic` superuser cannot access Kibana system indices, so those modules fail with an authorization error.

To run them, use a user that also has the `system_indices_superuser` role. For a local stack, create a `test` user with roles `superuser` + `system_indices_superuser` and run:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/quickstart/run.js --username test --password changeme
```

### Environments

The API clients are designed to work with any delivery method - local, cloud, or serverless deployments. For deployments that do not allow username/password auth, use an API key.

## Modules

Extracting data-generating logic into reusable modules that other people will actually use is the hardest part of sharing these scripts. To that end, it's crucial that the modules are organized as neatly as possible and extremely clear about what they do. If the modules are even slightly confusing, it will be faster for people to rebuild the same logic than to figure out how the existing scripts work.

### Data

Functions to create documents with various properties. This initial implementation has a function to create a document with an arbitrary number of fields and arbitrary amount of data in each field, but should be extended with more functions to create sets of documents with specific relationships such as X total documents with Y number of unique hosts etc.

### Entity Analytics

Functions to help install fake entity analytics data. Useful for testing alert enrichment based on entity analytics.

### Exceptions

Functions to help create exceptions with various properties. For example, one helper takes an array of values and automatically creates a value list exception item from that array - internally, it creates the value list and an exception item that references the list.

### Frozen (TODO)

Functions to help create frozen tier data quickly. These functions (once implemented) will take existing data and immediately move it to frozen for test purposes.

### Lists

Functions to help interact with the Lists APIs. The initial helper function makes it easy to import a value list from an array, since the process of attaching a file to a request (as the API expects) is not that intuitive.

### Mappings

Functions to help setup mappings. Provides the ECS mapping as well as helpers to generate mappings with tons of fields.

### Rules

Functions to help create rules along with data specific to each rule (WIP). Each sample rule defined in this folder should have an associated function to generate data that triggers alerts for the rule.

### ML Coverage Loss

Seeds the state needed to reproduce the ML coverage-loss upgrade behavior (#239884 / #279791): a legacy ML job plus prebuilt ML rules whose upgrade would drop that job, surfacing a `machine_learning_job_id` NON_SOLVABLE conflict. Also seeds control fixtures (a clean ML upgrade and a non-ML rule) so you can confirm the conflict fires only when it should. Exposes `seedMlCoverageLossState`, `teardownMlCoverageLossState`, and `verifySeededUpgrades`. See the example below.

## Speed

To run a number of API requests in parallel, use `concurrentlyExec` from @kbn/securitysolution-utils.

## Examples

### Create a Rule

```
// Extra imports
import { concurrentlyExec } from '@kbn/securitysolution-utils/src/client_concurrency';
import { basicRule } from './modules/rules/new_terms/basic_rule';
import { duplicateRuleParams } from './modules/rules';

// ... omitted client setup stuff

// Core logic
const ruleCopies = duplicateRuleParams(basicRule, 200);
const functions = ruleCopies.map((rule) => () => detectionsClient.createRule({ body: rule }));
const responses = await concurrentlyExec(functions);
```

### Create 200 Rules and an Exception for each one

```
// Extra imports
import { concurrentlyExec } from '@kbn/securitysolution-utils/src/client_concurrency';
import { basicRule } from './modules/rules/new_terms/basic_rule';
import { duplicateRuleParams } from './modules/rules';
import { buildCreateRuleExceptionListItemsProps } from './modules/exceptions';

// ... omitted client setup stuff

// Core logic
const createRuleResponse = await detectionsClient.createRule({ body: basicRule });
const bulkActionResponse = await detectionsClient.performRulesBulkAction({
  query: { dry_run: false },
  body: {
    ids: Array(200).fill(createRuleResponse.data.id),
    action: 'duplicate',
    duplicate: {
      include_exceptions: true,
      include_expired_exceptions: false,
    },
  },
});
const createdRules: RuleResponse[] = bulkActionResponse.data.attributes.results.created;

// This map looks a bit confusing, but the concept is simple: take the rules we just created and
// create a *function* per rule to create an exception for that rule. We want a function to call later instead of just
// calling the API immediately to limit the number of requests in flight (with `concurrentlyExec`)
const exceptionsFunctions = createdRules.map(
(r) => () =>
    exceptionsClient.createRuleExceptionListItems(
    buildCreateRuleExceptionListItemsProps({ id: r.id })
    )
);
const exceptionsResponses = await concurrentlyExec(exceptionsFunctions);
```

### Run 10 Rule Preview Requests Simultaneously

```
const previewPromises = range(50).map(
  (idx) => () =>
    detectionsClient.rulePreview({
      body: {
        ...getBasicRuleMetadata(),
        type: 'query',
        timeframeEnd: '2024-08-21T20:37:37.114Z',
        invocationCount: 1,
        from: 'now-6m',
        interval: '5m',
        index: [index],
        query: '*',
      },
    })
);

const results = (await concurrentlyExec(previewPromises, 50)).map(
  (result) => result.data.logs
);
```

### Seed ML coverage-loss upgrade conflict

Reproduces the legacy-ML-job coverage-loss upgrade state (#239884 / #279791).

```
import { seedMlCoverageLossState } from './modules/ml_coverage_loss';

await seedMlCoverageLossState({ esClient, kbnClient, detectionsClient, log });
```

Notes:

- This seeds rule assets by writing directly to the `.kibana_security_solution` system index, so it
  must run as a user with the `system_indices_superuser` role — the default `elastic` superuser
  cannot access system indices. See [Auth for modules that write to system indices](#auth-for-modules-that-write-to-system-indices).
- Creating the ML job needs a trial/platinum license. On a basic-license stack pass
  `{ createMlJob: false }` — the upgrade conflict still reproduces (the diff is content-based and
  does not depend on the job being installed).
- To install *every* job in the affected list instead of just the one the rule fixtures need, pass `{ installAllAffectedJobs: true }`.
- To reset, import and call `teardownMlCoverageLossState({ esClient, kbnClient, log })`.
- Then open Rule Management → Rule Updates: fixtures A & B show **Review** (coverage-loss warning on
  `machine_learning_job_id`); the non-affected ML rule and the query rule update cleanly.

It also seeds four **name-field upgrade** fixtures (non-ML `query` rules where only the `name` field
differs between versions), crossing customized × base-version-missing so you can exercise the upgrade
actions — with and without preview — under Enterprise, Platinum, and Basic licenses:

| ruleId | customized name? | base present? | `name` conflict |
| --- | --- | --- | --- |
| `test-name-upgrade-stock-with-base` | no | yes | none (clean update) |
| `test-name-upgrade-customized-with-base` | yes | yes | non-solvable |
| `test-name-upgrade-stock-no-base` | no | no | none (updates to target) |
| `test-name-upgrade-customized-no-base` | yes | no | solvable |

- On Enterprise (customization enabled) the flyout shows the three-way-diff resolver; below Enterprise
  (Platinum/Basic) it shows the read-only diff and the upgrade takes Elastic's target version.
- The customized fixtures should be seeded on a customization-enabled (Enterprise/trial) license so
  `is_customized` is recorded — same caveat as the customized ML fixture. Query rules themselves
  install and upgrade on every tier.
- `verifySeededUpgrades` prints a PASS/FAIL row per checked field (the `name` conflicts above are
  asserted alongside the `machine_learning_job_id` ones).

## Future Work

### Interactive Mode

It may be useful to have a mode where the CLI waits for input from the user and creates resources selected from a predefined list.

### Resource Tracking/Cleanup

It may also be useful to have the tooling automatically keep track of the created resources so they can be deleted automatically when finished.
