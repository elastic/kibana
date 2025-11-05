# Security Solution Test Directory

This directory contains test suites specific to the Security solution. For comprehensive FTR (Functional Test Runner) documentation, architecture details, and testing best practices, see the main platform documentation: [`x-pack/platform/test/README.md`](../../../platform/test/README.md).

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
import { SecuritySpecificService } from './services/security_service';
import { SecurityPageObject } from './page_object/security_page_object';

export default function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/functional/config.base.ts')
  );

  return {
    ...baseConfig.getAll(), // Extend base platform config
    services: {
      ...platformServices,
      securityService: SecuritySpecificService, // Solution-specific extension
    },
    pageObjects: {
      ...platformPageObjects,
      securityPageObject: SecurityPageObject, // Solution-specific page objects
    },
    // ... rest of config
  };
}
```

### Service Extension Guidelines

When extending functionality:

**✅ Extend platform services** when adding shared functionality that could benefit other solutions

**✅ Create solution-specific services** only for Search-unique functionality

## Running Tests

### Local Development

```bash
# Start test server for API integration tests
node scripts/functional_tests_server.js --config x-pack/solutions/security/test/api_integration/apis/cloud_security_posture/config.ts

# Run API integration tests
node scripts/functional_test_runner.js --config x-pack/solutions/security/test/api_integration/apis/cloud_security_posture/config.ts

# Start test server for functional tests
node scripts/functional_tests_server.js --config x-pack/solutions/security/test/cloud_security_posture_functional/config.ts

# Run functional tests
node scripts/functional_test_runner.js --config x-pack/solutions/security/test/cloud_security_posture_functional/config.ts
```

**Note**: The config paths shown above are examples. Replace it with the actual path to the config file for the test suite you want to run.

## Best Practices

- **Reuse platform services** whenever possible to maintain consistency
- **Contribute shared functionality** back to platform services rather than duplicating code
- **Follow naming conventions** established in platform documentation
- **Use deployment-agnostic patterns** when tests should work in both stateful and serverless environments
