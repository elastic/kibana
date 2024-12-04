# Deployment-Agnostic Tests Guidelines

## Definition
A deployment-agnostic API integration test is a test suite that fulfills the following criteria:

**Functionality**: It tests Kibana APIs that are logically identical in both stateful and serverless environments for the same roles.

**Design**: The test design is clean and does not require additional logic to execute in either stateful or serverless environments.

A deployment-agnostic test should be loaded in stateful and at least 1 serverless FTR config files.

## Tests, that are not deployment-agnostic:
- tests verifying Kibana behavior under a basic license.
- tests dependent on ES/Kibana server arguments, that are not set in Elastic Cloud
- tests requiring a custom plugin to be loaded specifically for testing purposes.
- tests dependent on varying user privileges between serverless and stateful environments.

## Tests Design Requirements
A deployment-agnostic test is contained within a single test file and always utilizes the [DeploymentAgnosticFtrProviderContext](https://github.com/elastic/kibana/blob/main/x-pack/test/api_integration/deployment_agnostic/ftr_provider_context.d.ts) to load compatible FTR services. A compatible FTR service must support:

- **Serverless**: Both local environments and MKI (Managed Kubernetes Infrastructure).
- **Stateful**: Both local environments and Cloud deployments.

To achieve this, services cannot use `supertest`, which employs an operator user for serverless and a system index superuser for stateful setups. Instead, services should use a combination of `supertestWithoutAuth` and `samlAuth` to generate an API key for user roles and make API calls. For example, see the [data_view_api.ts](https://github.com/elastic/kibana/blob/main/x-pack/test/api_integration/deployment_agnostic/services/data_view_api.ts) service.

Note: The `supertest` service is still available and can be used to **set up or tear down the environment** in `before` / `after` hooks. However, it **should not be used to test APIs**, such as making API calls in `it` blocks.

### How It Works
Most existing stateful tests use basic authentication for API testing. In contrast, serverless tests use SAML authentication with project-specific role mapping.

Since both Elastic Cloud (ESS) and Serverless rely on SAML authentication by default, and stateful deployments also support SAML, *deployment-agnostic tests configure Elasticsearch and Kibana with SAML authentication to use the same authentication approach in all cases*. For roles, stateful deployments define 'viewer', 'editor', and 'admin' roles with serverless-alike permissions.

### When to Create Separate Tests
While the deployment-agnostic testing approach is beneficial, it should not compromise the quality and simplicity of the tests. Here are some scenarios where separate test files are recommended:

- **Role-Specific Logic**: If API access or logic depends on roles that differ across deployments.
- **Environment Constraints**: If a test can only run locally and not on MKI or Cloud deployments.
- **Complex Logic**: If the test logic requires splitting across multiple locations.

## File Structure
We recommend following this structure to simplify maintenance and allow other teams to reuse code (e.g., FTR services) created by different teams:

```
x-pack/test/<my_own_api_integration_folder>
├─ deployment_agnostic
│  ├─ apis
│  │  ├─ <api_1>
│  │  │  ├─ <test_1_1>
│  │  │  ├─ <test_1_2>
│  │  ├─ <api_2>
│  │  │  ├─ <test_2_1>
│  │  │  ├─ <test_2_2>
│  ├─ configs
│  │  ├─ stateful
│  │  │  ├─ <stateful>.index.ts  // e.g., oblt.index.ts
│  │  │  ├─ <stateful>.config.ts // e.g., oblt.stateful.config.ts
│  │  ├─ serverless
│  │     ├─ <serverless_project>.index.ts             // e.g., oblt.index.ts
│  │     ├─ <serverless_project>.serverless.config.ts // e.g., oblt.serverless.config.ts
│  ├─ ftr_provider_context.d.ts  // with types of services from './services'
│  ├─ services
│     ├─ index.ts // only services from 'x-pack/test/api_integration/deployment_agnostic/services'
│     ├─ <deployment_agnostic_service_1>.ts
│     ├─ <deployment_agnostic_service_2>.ts
```

## Loading Your Tests Properly
When Platform teams add deployment-agnostic tests, it is expected that these tests are loaded in `configs/stateful/platform.index.ts` and at least one of the `<serverless_project>.serverless.config` files under `configs/serverless` folder.

When a Solution team (e.g., one of the Oblt teams) adds deployment-agnostic tests, it is expected that these tests are loaded in both `configs/stateful/oblt.index.ts` and `configs/serverless/oblt.index.ts`.

## Step-by-Step Guide
1. Define Deployment-Agnostic Services

Under `x-pack/test/<my_own_api_integration_folder>/deployment_agnostic/services`, create `index.ts` and load base services from `x-pack/test/api_integration/deployment_agnostic/services`:

```ts
import { services as deploymentAgnosticServices } from './../../api_integration/deployment_agnostic/services';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...deploymentAgnosticServices,
  // create a new deployment-agnostic service and load here
};
```

We suggest adding new services to `x-pack/test/api_integration/deployment_agnostic/services` so other teams can benefit from them.

2. Create `DeploymentAgnosticFtrProviderContext` with Services Defined in Step 2

Create `ftr_provider_context.d.ts` and export `DeploymentAgnosticFtrProviderContext`:
```ts
import { GenericFtrProviderContext } from '@kbn/test';
import { services } from './services';

export type DeploymentAgnosticFtrProviderContext = GenericFtrProviderContext<typeof services, {}>;
```

3. Add Tests

API Authentication in Kibana: Public vs. Internal APIs

Kibana provides both public and internal APIs, each requiring authentication with the correct privileges. However, the method of testing these APIs varies, depending on how they are untilized by end users.

- Public APIs: When testing HTTP requests to public APIs, API key-based authentication should be used. It reflect how end user call these APIs. Due to existing restrictions, we utilize `Admin` user credentials to generate API keys for various roles. While the API key permissions are correctly scoped according to the assigned role, the user will internally be recognized as `Admin` during authentication.

- Internal APIs: Direct HTTP requests to internal APIs are generally not expected. However, for testing purposes, authentication should be performed using the Cookie header. This approach simulates client-side behavior during browser interactions, mirroring how internal APIs are indirectly invoked.

Recommendations:
- use `roleScopedSupertest` service to create supertest instance scoped to specific role and pre-defined request headers
- `roleScopedSupertest.getSupertestWithRoleScope(<role>)` authenticate requests with API key by default
- pass `useCookieHeader: true` to use Cookie header for requests authentication
- don't forget to invalidate API key using `destroy()` on supertest scoped instance in `after` hook

Add test files to `x-pack/test/<my_own_api_integration_folder>/deployment_agnostic/apis/<my_api>`:

test example
```ts
export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestViewerWithApiKey: SupertestWithRoleScopeType;
  let supertestEditorWithCookieCredentials: SupertestWithRoleScopeType;

  describe('test suite', () => {
    before(async () => {
      supertestViewerWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        withInternalHeaders: true,
        withCustomHeaders: { 'accept-encoding': 'gzip' },
      });
      supertestEditorWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope('editor', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
    });
    after(async () => {
      // always invalidate API key for the scoped role in the end
      await supertestViewerWithApiKey.destroy();
      // supertestEditorWithCookieCredentials.destroy() has no effect because Cookie session is cached per SAML role
      // and valid for the whole FTR config run, no need to call it
    });
    it(`uses compression when there isn't a referer`, async () => {
      const response = await supertestViewerWithApiKey.get('/app/kibana');
      expect(response.header).to.have.property('content-encoding', 'gzip');
    });

    it(`can run rule with Editor privileges`, async () => {
      const response = await supertestEditorWithCookieCredentials
        .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
        .expect(204);
      });
  });
}
```
Load all test files in `index.ts` under the same folder.

4. Add Tests Entry File and FTR Config File for **Stateful** Deployment

Create `configs/stateful/plaform.index.ts` tests entry file and load tests:

```ts
import { DeploymentAgnosticFtrProviderContext } from './ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('apis', () => {
    loadTestFile(require.resolve('./../../apis/<my_api>'));
  });
}
```

Create `configs/stateful/platform.stateful.config.ts` and link tests entry file:

```ts
import { createStatefulTestConfig } from './../../api_integration/deployment_agnostic/default_configs/stateful.config.base';
import { services } from './services';

export default createStatefulTestConfig({
  testFiles: [require.resolve('./platform.index.ts')],
  services,
  junit: {
    reportName: 'Stateful - Deployment-agnostic API Integration Tests',
  },
});
```
5. Add Tests Entry File and FTR Config File for Specific **Serverless** Project

Example for Observability project:

oblt.index.ts
```ts
import { DeploymentAgnosticFtrProviderContext } from './ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic api integration tests', () => {
    loadTestFile(require.resolve('./../../apis/<my_api>'));
  });
}
```

oblt.serverless.config.ts
```ts
import { createServerlessTestConfig } from './../../api_integration/deployment_agnostic/default_configs/serverless.config.base';
import { services } from './services';

export default createServerlessTestConfig({
  serverlessProject: 'oblt',
  services,
  testFiles: [require.resolve('./oblt.index.ts')],
  junit: {
    reportName: 'Serverless Observability - Deployment-agnostic API Integration Tests',
  },
});
```

ES and Kibana project-specific arguments are defined and loaded from `serverless.config.base`. These arguments are copied from the Elasticsearch and Kibana controller repositories.

Note: The FTR (Functional Test Runner) does not have the capability to provision custom ES/Kibana server arguments into the serverless project on MKI. Any custom arguments listed explicitly in this config file will apply **only to a local environment**.
We do not recommend use of custom server arguments because it may lead to unexpected test failures on MKI.

6. Add FTR Configs Path to FTR Manifest Files Located in `.buildkite/`

## Running the tests

### Stateful

```sh
# start server
node scripts/functional_tests_server --config x-pack/test/api_integration/deployment_agnostic/configs/stateful/<solution>.stateful.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/test/api_integration/deployment_agnostic/configs/stateful/<solution>.stateful.config.ts --grep=$
```

### Serverless

```sh
# start server
node scripts/functional_tests_server --config x-pack/test/api_integration/deployment_agnostic/configs/serverless/<solution>.serverless.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/test/api_integration/deployment_agnostic/configs/serverless/<solution>.serverless.config.ts --grep=$
```

## Tagging and Skipping the Tests
Since deployment-agnostic tests are designed to run both locally and on MKI/Cloud, we believe no extra tagging is required. If a test is not working on MKI/Cloud or both, there is most likely an issue with the FTR service or the configuration file it uses.

When a test fails on CI, automation will apply `.skip` to the top-level describe block. This means the test will be skipped in **both serverless and stateful environments**. If a test is unstable in a specific environment only, it is probably a sign that the test is not truly deployment-agnostic.

## Migrating existing tests
If your tests align with the outlined criteria and requirements, you can migrate them to deployment-agnostic by following these steps:

1. Move your tests to the `x-pack/test/api_integration/deployment_agnostic/apis/<plugin>` directory.
2. Update each test file to use the `DeploymentAgnosticFtrProviderContext` context and load the required FTR services it provides.
3. Ensure the `roleScopedSupertest` or `samlAuth` service is used instead for `supertest` for authentication and test API calls.
4. Remove all usage of the `supertest` service. It is authenticated as system index superuser and often causes test failures on Cloud, where priveleges are more strict.
5. Avoid modifying `config` files, as this could disrupt test runs in Cloud environments.
6. Include your tests in both the platform and at least one solution index file.
7. Execute your tests locally against a local environment.
8. Verify your tests by running them locally against a real MKI project and an ESS deployment to ensure full compatibility.
