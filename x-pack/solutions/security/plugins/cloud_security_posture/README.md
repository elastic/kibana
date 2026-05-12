# Cloud Security Posture Kibana Plugin

Cloud Posture automates the identification and remediation of risks across cloud infrastructures

---

## Development

Read [Kibana Contributing Guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for more details

### DataView Migration Logic

The data view migration is split into two parts:

1. Deletion of old and legacy data views during the plugin initialization (only runs once when the CSP package is installed or when Kibana is started)
2. Creation of new data views when the user navigates to the CSP page (the check runs every time the user navigates to the CSP page to see if the data views need to be created)

When making changes to CSP data views, follow these guidelines:

#### When to Update Data View Version

Create a new data view version when:

1. **Index Pattern Changes**: Updating the underlying index pattern (e.g., from `logs-*` to `security_solution-*`)
2. **Field Mapping Updates**: Making significant changes to field mappings that could affect existing queries
3. **Breaking Changes**: Any change that would break existing saved searches, visualizations, or dashboards
4. **Data Source Migration**: Moving from one data source to another (e.g., from native to CDR indices)

#### How to Update Data View Version

1. **Update Constants** in `packages/kbn-cloud-security-posture/common/constants.ts`:

   - Add the current version to the OLD_VERSIONS array
   - Update the main constant to the new version `_v{n+1}`

   ```typescript
   // Array of old data view IDs for migration purposes
   export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS = [
     'security_solution_cdr_latest_misconfigurations', // v1
     'security_solution_cdr_latest_misconfigurations_v2', // v2 - Add current version here when moving to v3
     // Future deprecated versions will be added here
   ];

   // Current data view ID - increment version when making breaking changes
   export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX =
     'security_solution_cdr_latest_misconfigurations_v3'; // Updated to v3
   ```

2. **Update Tests** in `test/cloud_security_posture_functional/data_views/data_views.ts`:
   - Test deletion from v1 to current version (with space suffix)
   - Test deletion from legacy to current version (global to space-specific)
   - Test deletion of old and legacy data views during plugin initialization
   - Test creation of new data views when the user navigates to the CSP page

#### Example: Moving from v2 to v3

```typescript
// Step 1: Update the OLD_VERSIONS array in packages/kbn-cloud-security-posture/common/constants.ts
export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS = [
  'security_solution_cdr_latest_misconfigurations', // v1
  'security_solution_cdr_latest_misconfigurations_v2', // v2 - Added current version
];

// Step 2: Update the current version
export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX =
  'security_solution_cdr_latest_misconfigurations_v3'; // Now v3

// Note: Legacy versions (global data views) are tracked separately and rarely change
export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS = [];
```

## Testing

For general guidelines, read [Kibana Testing Guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html) for more details

### Tests

1. Unit Tests (Jest) - located in sibling files to the source code
1. [API Integration Tests](../../test/api_integration/apis/cloud_security_posture/config.ts)
1. [Telemetry Integration Tests](../../test/cloud_security_posture_api/config.ts)
1. [End-to-End Tests](../../test/cloud_security_posture_functional/config.ts)
1. [Serverless API Integration tests](../../test/serverless/api_integration/configs/config.ts)
1. [Serverless End-to-End Tests](../../test/serverless/functional/configs/config.ts)
1. [Cypress End-to-End Tests](../../test/security_solution_cypress/cypress/e2e/cloud_security_posture)

### Tools

Run **TypeScript**:

```bash
node scripts/type_check.js --project=x-pack/solutions/security/plugins/cloud_security_posture/tsconfig.json
```

Run **ESLint**:

```bash
yarn lint:es x-pack/solutions/security/plugins/cloud_security_posture
```

Run **i18n check**:

```bash
node scripts/i18n_check.js
```

> **Note**
>
> i18n should run on project scope as it checks translations files outside of our plugin.
>
> Fixes can be applied using the --fix flag
>
> 1. We shouldn't manually add/update/delete the localization files, nor change the translated strings.
> 2. The script will remove unused labels.
> 3. Regarding adding labels - this happens regularly and automated for the whole Kibana repository outside of our flows.

Run [**Unit Tests**](https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing):

```bash
yarn test:jest --config x-pack/solutions/security/plugins/cloud_security_posture/jest.config.js
```

> **Note**
>
> for a coverage report, add the `--coverage` flag, and run `open target/kibana-coverage/jest/x-pack/solutions/security/plugins/cloud_security_posture/index.html`

Run [**API Integration Tests**](https://docs.elastic.dev/kibana-dev-docs/tutorials/testing-plugins#):

```bash
yarn test:ftr --config x-pack/solutions/security/test/cloud_security_posture_api/config.ts
yarn test:ftr --config x-pack/solutions/security/test/api_integration/apis/cloud_security_posture/config.ts
yarn test:ftr --config x-pack/solutions/security/test/serverless/api_integration/configs/config.ts --include-tag=cloud_security_posture
```

Run [**End-to-End Tests**](https://www.elastic.co/guide/en/kibana/current/development-tests.html#_running_functional_tests):

```bash
yarn test:ftr --config x-pack/solutions/security/test/cloud_security_posture_functional/config.ts
yarn test:ftr --config x-pack/solutions/security/test/serverless/functional/configs/config.cloud_security_posture.ts
```

Run [**End-to-End Cypress Tests**](https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/test/security_solution_cypress/cypress):

> **Note**
>
> Run this from security_solution_cypress folder

```bash
yarn cypress:open:serverless
yarn cypress:open:ess
yarn cypress:cloud_security_posture:run:serverless
yarn cypress:cloud_security_posture:run:ess
```

#### Run **FTR tests (integration or e2e) for development**

Functional test runner (FTR) can be used separately with `ftr:runner` and `ftr:server`. This is convenient while developing tests.

For example,

run ESS (stateful) api integration tests:

```bash
yarn test:ftr:server --config x-pack/solutions/security/test/api_integration/config.ts
yarn test:ftr:runner --config x-pack/solutions/security/test/api_integration/apis/cloud_security_posture/config.ts
```

run ESS (stateful) telemetry integration tests:

```bash
yarn test:ftr:server --config x-pack/solutions/security/test/cloud_security_posture_api/config.ts
yarn test:ftr:runner --config x-pack/solutions/security/test/cloud_security_posture_api/config.ts
```

run ESS (stateful) e2e tests:

```bash
yarn test:ftr:server --config x-pack/solutions/security/test/cloud_security_posture_functional/config.ts
yarn test:ftr:runner --config x-pack/solutions/security/test/cloud_security_posture_functional/config.ts
```

run data view migration tests:

```bash
yarn test:ftr:server --config x-pack/solutions/security/test/cloud_security_posture_functional/data_views/config.ts
yarn test:ftr:runner --config x-pack/solutions/security/test/cloud_security_posture_functional/data_views/config.ts
```

run serverless api integration tests:

```bash
yarn test:ftr:server --config x-pack/solutions/security/test/serverless/api_integration/configs/config.ts
yarn test:ftr:runner --config x-pack/solutions/security/test/serverless/api_integration/configs/config.ts --include-tag=cloud_security_posture
```

run serverless e2e tests:

```bash
yarn test:ftr:server --config x-pack/solutions/security/test/serverless/functional/configs/config.cloud_security_posture.ts
yarn test:ftr:runner ---config x-pack/solutions/security/test/serverless/functional/configs/config.cloud_security_posture.ts
```

#### Run **Cypress tests (e2e) for development**

When developing feature outside our plugin folder, instead of using FTRs for e2e test, we may use Cypress. Before running cypress, make sure you have installed it first. Like FTRs, we can run cypress in different environment, for example:

run ess e2e tests:

```bash
yarn cypress:open:ess
```

run ess Cloud Security Posture e2e tests:

```bash
yarn cypress:cloud_security_posture:run:ess
```

run serverless e2e tests:

```bash
yarn cypress:open:serverless
```

run serverless Cloud Security Posture e2e tests:

```bash
yarn cypress:cloud_security_posture:run:serverless
```

Unlike FTR where we have to set server and runner separately, Cypress handles everything in 1 go, so just running the above the script is enough to get it running

### Troubleshooting

If you encounter an error related to running machine learning code, you should add the following string `'xpack.ml.enabled=false'` under the `esTestCluster` property in the `x-pack/solutions/security/test/functional/config.base.js` file.

Example:

```javascript
module.exports = {
  esTestCluster: {
    // ...existing configuration...
    serverArgs: [
      // ...existing arguments...
      'xpack.ml.enabled=false', // Add this line to disable ML
    ],
  },
  // ...other configurations...
};
```
