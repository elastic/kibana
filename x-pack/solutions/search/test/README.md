# Search Solution Test Directory

This directory contains test suites specific to the Search solution. For comprehensive FTR (Functional Test Runner) documentation, architecture details, and testing best practices, see the main platform documentation: [`x-pack/platform/test/README.md`](../../../platform/test/README.md).

## Platform Services and Page Objects Integration

Search tests leverage platform-shared services and page objects from the `@kbn/test-suites-xpack-platform` package, extending them with solution-specific functionality as needed.

Platform services are available from:

- `@kbn/test-suites-xpack-platform/api_integration/services`
- `@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services`
- `@kbn/test-suites-xpack-platform/functional/services`

Platform page objects are available from:

- `@kbn/test-suites-xpack-platform/functional/page_objects`

Platform base configurations are available from:

- `@kbn/test-suites-xpack-platform/functional/config.base.ts`
- `@kbn/test-suites-xpack-platform/api_integration/config.ts`

Example configuration:

```typescript
// config.ts
import { FtrConfigProviderContext } from '@kbn/test';
import { services as platformServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { pageObjects as platformPageObjects } from '@kbn/test-suites-xpack-platform/functional/page_objects';
import { SearchSpecificService } from './services/search_service';
import { SearchPageObject } from './page_object/search_page_object';

export default function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/functional/config.base.ts')
  );

  return {
    ...baseConfig.getAll(), // Extend base platform config
    services: {
      ...platformServices,
      searchService: SearchSpecificService, // Solution-specific extension
    },
    pageObjects: {
      ...platformPageObjects,
      searchPageObject: SearchPageObject, // Solution-specific page objects
    },
    // ... rest of config
  };
}
```

### Service Extension Guidelines

When extending functionality:

**✅ Extend platform services** when adding shared functionality that could benefit other solutions

**✅ Create solution-specific services** only for Search-unique functionality

## Test Organization

### API Integration Tests

#### `/api_integration` - Search API Tests

**Location**: `x-pack/solutions/search/test/api_integration/`
**Use for**: Search-specific API testing, stateful-only environments

#### `/api_integration_deployment_agnostic` - Cross-Environment API Tests (good to add in the future)

**Location**: `x-pack/solutions/search/test/api_integration_deployment_agnostic/`
**Use for**: Search-specific API tests designed to run in both stateful and serverless environments

### UI Testing

#### `/functional` - Search Functional Tests

**Location**: `x-pack/solutions/search/test/functional_search/`
**Use for**: End-to-end UI tests for Search apps

## Running Tests

### Local Development

```bash
# Start test server for API integration tests
node scripts/functional_tests_server.js --config x-pack/solutions/search/test/api_integration/apis/search_playground/config.ts

# Run API integration tests
node scripts/functional_test_runner.js --config x-pack/solutions/search/test/api_integration/apis/search_playground/config.ts

# Start test server for functional tests
node scripts/functional_tests_server.js --config x-pack/solutions/search/test/functional_search/config.ts

# Run functional tests
node scripts/functional_test_runner.js --config x-pack/solutions/search/test/functional_search/config.ts
```

**Note**: The config paths shown above are examples. Replace it with the actual path to the config file for the test suite you want to run.

## Best Practices

- **Reuse platform services** whenever possible to maintain consistency
- **Contribute shared functionality** back to platform services rather than duplicating code
- **Follow naming conventions** established in platform documentation
- **Use deployment-agnostic patterns** when tests should work in both stateful and serverless environments
