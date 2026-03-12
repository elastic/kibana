# Cloud Security Posture Functional Tests

This folder contains functional tests for the Cloud Security Posture features in Kibana.

## Folder Structure

```
cloud_security_posture_functional/
├── pages/                    # Test files (test suites and test cases)
├── page_objects/             # Page object classes with reusable functions
├── constants/                # Test subject IDs used by page objects
├── es_archives/              # Elasticsearch data archives for tests
├── services/                 # Custom FTR services
├── mocks/                    # Mock data for tests
├── agentless/                # Agentless-specific tests
├── cloud_tests/              # Cloud-specific tests
├── data_views/               # Data views tests
├── config.ts                 # Main test configuration
├── config.agentless.ts       # Agentless test configuration
├── config.cloud.ts           # Cloud test configuration
└── ftr_provider_context.d.ts # Type definitions for FTR provider
```

## Key Directories

### `/pages`

Contains all test files. Each test file exports a default function that receives the FTR provider context:

```typescript
export default function ({ getPageObjects, getService }: SecurityTelemetryFtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'alerts', 'expandedFlyoutGraph']);
  const alertsPage = pageObjects.alerts;

  describe('Test Suite Name', function () {
    it('test case description', async () => {
      // Test implementation
    });
  });
}
```

The `pages/index.ts` file controls which test files are executed. Test files are loaded using `loadTestFile(require.resolve('./test_file'))`.

### `/page_objects`

Contains page object classes that encapsulate page interactions and provide reusable functions. These are registered in `page_objects/index.ts` and accessible via `getPageObjects()`.

Available page objects:

- `alerts` - Alerts page interactions
- `networkEvents` - Network events page interactions
- `expandedFlyoutGraph` - Graph visualization flyout interactions
- `genericEntityFlyout` - Generic entity flyout interactions
- `timeline` - Timeline page interactions
- `findings` - Findings page interactions
- `cloudPostureDashboard` - CSP dashboard interactions
- `cisAddIntegration` - CIS integration form interactions
- `vulnerabilityDashboard` - Vulnerability dashboard interactions
- `rule` - Rule page interactions
- `benchmark` - Benchmark page interactions
- `cspSecurity` - Security common utilities

### `/constants`

Contains test subject IDs used by page objects. Import from `../constants/test_subject_ids`:

```typescript
import { testSubjectIds } from '../constants/test_subject_ids';

const { ALERT_TABLE_ROW_CSS_SELECTOR, GRAPH_PREVIEW_CONTENT_TEST_ID } = testSubjectIds;
```

### `/es_archives`

Contains Elasticsearch data archives (mappings.json and data.json) used to set up test data:

- `security_alerts_modified_mappings` - Alerts with actor/target mappings
- `security_alerts_ecs_only_mappings` - Alerts with ECS-only mappings
- `logs_gcp_audit` - GCP audit log data
- `entity_store` - Entity store data (v1)
- `entity_store_v2` - Entity store data (v2)
- `contextual_flyout_*` - Various flyout test data

## Executing Tests

Run tests using two terminal commands from the Kibana root directory:

### 1. Start the test server

```bash
yarn test:ftr:server --config x-pack/solutions/security/test/cloud_security_posture_functional/config.ts
```

### 2. Run the test runner (in a separate terminal)

```bash
yarn test:ftr:runner --config x-pack/solutions/security/test/cloud_security_posture_functional/config.ts
```

### Running specific tests

To run specific test files, modify `pages/index.ts` to comment/uncomment the relevant `loadTestFile()` calls.

## Utility Functions

API utility functions are imported from `../../cloud_security_posture_api/utils`:

```typescript
import {
  waitForPluginInitialized,
  cleanupEntityStore,
  waitForEntityDataIndexed,
  enableAssetInventory,
  executeEnrichPolicy,
} from '../../cloud_security_posture_api/utils';
```

## Coding Style Guidelines

### Test File Structure

1. Use `describe` blocks for test suites with descriptive names
2. Use `it` blocks for individual test cases
3. Use `before` and `after` hooks for setup and teardown
4. Add tags for test categorization: `this.tags(['cloud_security_posture_graph_viz'])`

### Page Object Pattern

1. Extend `FtrService` for page object classes
2. Use `this.ctx.getService()` to access FTR services
3. Use `this.ctx.getPageObjects()` to access other page objects
4. Import test subject IDs from constants

Example:

```typescript
import { FtrService } from '@kbn/test-suites-xpack-platform/functional/ftr_provider_context';
import { testSubjectIds } from '../constants/test_subject_ids';

export class MyPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  async myMethod(): Promise<void> {
    await this.testSubjects.click(testSubjectIds.MY_TEST_SUBJECT_ID);
  }
}
```

### Common Services

- `es` - Elasticsearch client
- `retry` - Retry utilities for async operations
- `supertest` - HTTP request testing
- `esArchiver` - Load/unload ES archives
- `kibanaServer` - Kibana server utilities
- `testSubjects` - Find elements by test subject ID
- `log` - Logger service

### Assertions

Use `expect` from `@kbn/expect`:

```typescript
import expect from '@kbn/expect';

expect(nodes.length).to.be(expected);
await this.testSubjects.existOrFail('elementTestId');
await this.testSubjects.missingOrFail('elementTestId');
```

### Async/Await

All test operations are asynchronous. Use `async/await` consistently:

```typescript
it('test case', async () => {
  await alertsPage.navigateToAlertsPage();
  await alertsPage.waitForListToHaveAlerts();
  await alertsPage.flyout.expandVisualizations();
});
```

### Linting

Ensure linting passes before committing. The codebase uses ESLint with the `// eslint-disable-next-line import/no-default-export` comment for test file default exports.

