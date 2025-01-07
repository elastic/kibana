# Kibana Serverless Tests

The tests and helper methods (services, page objects) defined here in
`x-pack/test_serverless` cover the serverless functionality introduced by the
 `serverless`, `serverless_observability`, `serverless_search` and
 `serverless_security` plugins.

 For how to set up Docker for serverless ES images, please refer to
 [packages/kbn-es/README](https://github.com/elastic/kibana/blob/main/packages/kbn-es/README.mdx).

## Serverless testing structure and conventions

### Overview

The serverless test structure corresponds to what we have in `x-pack/test` with
API tests in `api_integration` and UI tests in `functional`, each with their
set of helper methods and sub-directories for
- `common` functionality shared across serverless projects (core, shared UX, ...)
- `observability` project specific functionality
- `search` project specific functionality
- `security` project specific functionality

The `shared` directory contains fixtures, services, ... that are shared across
`api_integration` abd `functional` tests.

```
x-pack/test_serverless/
├─ api_integration
│  ├─ services
│  ├─ test_suites
│  │  ├─ common
│  │  ├─ observability
│  │  ├─ search
│  │  ├─ security
├─ functional
│  ├─ page_objects
│  ├─ services
│  ├─ test_suites
│  │  ├─ common
│  │  ├─ observability
│  │  ├─ search
│  │  ├─ security
├─ shared
│  ├─ services
│  ├─ types
```

### Common tests

As outlined above, tests in the `common` API integration and functional test suites are
covering functionality that's shared across serverless projects. That's why these tests
don't have a dedicated config file and instead need to be included in project specific
configurations.

**If you add a new `api_integration` or `functional` `common` sub-directory, remember to add it to the corresponding `common_configs` of all projects (`x-pack/test_serverless/[api_integration|functional]/test_suites/[observability|search|security]/common_configs`).**

In case a common test needs to be skipped for one of the projects 
(in both regular pipelines that start KBN in serverless mode [against serverless ES] & pipelines creating serverless projects in MKI [Cloud]),
there are the following suite tags available to do so: 
`skipSvlOblt`, `skipSvlSearch`, `skipSvlSec`, which can be added like this to a test suite:

```
describe('my test suite', function () {
  this.tags(['skipSvlOblt', 'skipSvlSearch', 'skipSvlSec']);
  // or for a single tag: this.tags('skipSvlSec');
  [...]
});
```

Tests that are designed to only run in one of the projects should be added to the project
specific test directory and not to `common` with two skips.

Note, that `common` tests are invoked three times in a full test run: once per project to make
sure the covered shared functionality works correctly in every project. So when writing tests there, be mindful about the test run time.

See also the README files for [Serverless Common API Integration Tests](https://github.com/elastic/kibana/blob/main/x-pack/test_serverless/api_integration/test_suites/common/README.md) and [Serverless Common Functional Tests](https://github.com/elastic/kibana/blob/main/x-pack/test_serverless/functional/test_suites/common/README.md).

### Shared services and page objects

Test services and page objects from `x-pack/test/[api_integration|functional]`
are available for reuse.

Serverless specific services and page objects are implemented in
`x-pack/test_serverless/[api_integration|functional|shared]` only and may not be added
to or make modifications in `x-pack/test`.

With this helper method reuse, we have to avoid name clashes and go with the
following namespaces:

| project       | namespace for helper methods |
| ------------- | ---------------------------- |
| common        | svlCommon                    |
| observability | svlOblt                      |
| search        | svlSearch                    |
| security      | svlSec                       |

### Adding Serverless Tests

As outlined above, serverless tests are separated from stateful tests (except
the reuse of helper methods), which includes a new base configuration. All
tests that should run in a serverless environment have to be added to the 
`x-pack/test_serverless`.

Tests in this area should be clearly designed for the serverless environment,
particularly when it comes to timing for API requests and UI interaction.

### Roles-based testing

Each serverless project has its own set of SAML roles with [specfic permissions defined in roles.yml](https://github.com/elastic/kibana/blob/main/packages/kbn-es/src/serverless_resources/project_roles)
and in oder to properly test Kibana functionality, test design requires to login with
a project-supported SAML role. FTR provides `svlUserManager` service to do SAML authentication, that allows UI tests to set
the SAML cookie in the browser context and generates api key to use in the api integration tests. See examples below.

General recommendations:
- use the minimal required role to access tested functionality
- when feature logic depends on both project type & role, make sure to add separate tests
- avoid using basic authentication, unless it is the actual test case
- run the tests against real project(s) on MKI to validate it is stable


#### Functional UI test example

Recommendations:
- in each test file top level `describe` suite should start with `loginWithRole` call in `before` hook
- no need to log out, you can change role by calling `loginWithRole` again.
- for the common tests you can use `loginWithPrivilegedRole` to login as Editor/Developer 

```
describe("my test suite", async function() {
  before(async () => {
    await PageObjects.svlCommonPage.loginWithRole('viewer');
    await esArchiver.load(...);
    await PageObjects.dashboard.navigateToApp();
  });

  it('test step', async() => {
    await PageObjects.dashboard.loadSavedDashboard('old dashboard');
    await PageObjects.dashboard.waitForRenderComplete();
    ...
  });
});
```

#### API integration test example

API Authentication in Kibana: Public vs. Internal APIs

Kibana provides both public and internal APIs, each requiring authentication with the correct privileges. However, the method of testing these APIs varies, depending on how they are untilized by end users.

- Public APIs: When testing HTTP requests to public APIs, API key-based authentication should be used. It reflects how an end user calls these APIs. Due to existing restrictions, we utilize `Admin` user credentials to generate API keys for various roles. While the API key permissions are correctly scoped according to the assigned role, the user will internally be recognized as `Admin` during authentication.

- Internal APIs: Direct HTTP requests to internal APIs are generally not expected. However, for testing purposes, authentication should be performed using the Cookie header. This approach simulates client-side behavior during browser interactions, mirroring how internal APIs are indirectly invoked.

Recommendations:
- use `roleScopedSupertest` service to create a supertest instance scoped to a specific role and predefined request headers
- `roleScopedSupertest.getSupertestWithRoleScope(<role>)` authenticates requests with an API key by default
- pass `useCookieHeader: true` to use Cookie header for request authentication
- don't forget to invalidate API keys by using `destroy()` on the supertest scoped instance in the `after` hook

```
describe("my public APIs test suite", async function() {
    before(async () => {
      supertestViewerWithApiKey =
        await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
          withInternalHeaders: true,
        });
    });

    after(async () => {
      await supertestViewerWithApiKey.destroy();
    });

    it(''test step', async () => {
      const { body, status } = await supertestViewerWithApiKey
        .delete('/api/spaces/space/default')
      ...
    });
});
```

```
describe("my internal APIs test suite", async function() {
    before(async () => {
      supertestViewerWithCookieCredentials =
        await roleScopedSupertest.getSupertestWithRoleScope('admin', {
          useCookieHeader: true, // to avoid generating API key and use Cookie header instead
          withInternalHeaders: true,
        });
    });

    after(async () => {
      // no need to call '.destroy' since we didn't create API key and Cookie persist for the role within FTR run
    });

    it(''test step', async () => {
      await supertestAdminWithCookieCredentials
        .post(`/internal/kibana/settings`)
        .send({ changes: { [TEST_SETTING]: 500 } })
        .expect(200);
      ...
    });
});
```

#### Testing with custom roles

With custom native roles now enabled for the Security and Search projects on MKI, the FTR supports
defining and authenticating with custom roles in both UI functional tests and API integration tests.

To test role management within the Observability project, you can execute the tests using the existing [config.feature_flags.ts](x-pack/test_serverless/functional/test_suites/observability/config.feature_flags.ts), where this functionality is explicitly enabled. Though the config is not run on MKI, it provides the ability to test custom roles in Kibana CI before the functionality is enabled in MKI. When roles management is enabled on MKI, these tests can be migrated to the regular FTR config and will be run on MKI.

For compatibility with MKI, the role name `customRole` is reserved for use in tests. The test user is automatically assigned to this role, but before logging in via the browser, generating a cookie header, or creating an API key in each test suite, the role’s privileges must be updated.

Note: We are still working on a solution to run these tests against MKI. In the meantime, please tag the suite with `skipMKI`.

FTR UI test example:
```
// First, set privileges for the custom role
await samlAuth.setCustomRole({
  elasticsearch: {
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      feature: {
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
});
// Then, log in via the browser as a user with the newly defined privileges
await pageObjects.svlCommonPage.loginWithCustomRole();

// Make sure to delete the custom role in the 'after' hook
await samlAuth.deleteCustomRole();
```

FTR api_integration test example:
```
// First, set privileges for the custom role
await samlAuth.setCustomRole({
  elasticsearch: {
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      feature: {
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
});

// Then, generate an API key with the newly defined privileges
const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('customRole');

// Remember to invalidate the API key after use and delete the custom role
await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
await samlAuth.deleteCustomRole();
```

### Testing with feature flags

**tl;dr:** Tests specific to functionality behind a feature flag need special
handling and are by default only tested locally / in CI but excluded from regular
test runs in MKI.

New features might be gated behind a feature flag and can only be enabled
through a yml configuration entry. By default, these features are not enabled
so they're not available in a regular serverless MKI project, which would make
end-to-end tests for such a feature fail. In order to still have tests for
features behind a feature flag, these tests need to be separated from the
regular tests.

For every project's `test_suites` directory, there are feature flags specific
config (`config.feature_flags.ts`) and index (`index.feature_flags.ts`) files
next to the regular `config.ts` and `index.ts`. These extra files are used to
cover all feature flag tests of the respective area.
If you want to add feature flag specific tests:
- Add your feature flag(s) to the `kbnServerArgs` in the `config.feature_flags.ts` file
- Load your test file(s) in the `index.feature_flags.ts` file

As mentioned above, these tests are not part of the regular test run against MKI
projects. If you still want to run feature flag tests against an MKI project,
this requires a Kibana docker build that has the feature flags enabled by default.
This docker image can then be used to create a project in serverless QA and the
feature flags tests can be pointed to the project.

## Run tests
Similar to how functional tests are run in `x-pack/test`, you can point the
functional tests server and test runner to config files in this `x-pack/test_serverless`
directory, e.g. from the `x-pack` directory run:
```
node scripts/functional_tests_server.js --config test_serverless/api_integration/test_suites/search/config.ts

node scripts/functional_test_runner.js --config test_serverless/api_integration/test_suites/search/config.ts
```

## Run tests on MKI
There is no need to start servers locally, you just need to create MKI project and copy urls for Elasticsearch and Kibana. Make sure to update urls with username/password and port 443 for Elasticsearch. FTR has no control over MKI and can't update your projects so make sure your `config.ts` does not specify any custom arguments for Kibana or Elasticsearch. Otherwise, it will be ignored. You can run the tests from the `x-pack` directory:
```
TEST_CLOUD=1 TEST_CLOUD_HOST_NAME="CLOUD_HOST_NAME" TEST_ES_URL="https://elastic:PASSWORD@ES_HOSTNAME:443" TEST_KIBANA_URL="https://elastic:PASSWORD@KIBANA_HOSTNAME" node scripts/functional_test_runner --config test_serverless/api_integration/test_suites/search/config.ts --exclude-tag=skipMKI
```

Steps to follow to run on QA environment:
- Go to `CLOUD_HOST_NAME` and create a project.
- Go to `CLOUD_HOST_NAME/account/keys` and create Cloud specific API Key.
- We need the key from step 2 to obtain basic auth credentials for ES and Kibana.
  Make a POST request to the following endpoint.
  ```
  POST CLOUD_HOST_NAME/api/v1/serverless/projects/<project-type>/<project-id>/_reset-internal-credentials
  Authorization: ApiKey <Cloud-API-key>
  Content-Type: application/json
  ```

  In response you should get credentials.
  ```
  {
    "password": "testing-internal_pwd",
    "username": "testing-internal"
  }
  ```
  We would use these credentials for `TEST_ES_URL="https://USERNAME:PASSWORD@ES_HOSTNAME:443"` and `TEST_KIBANA_URL="https://USERNAME:PASSWORD@KIBANA_HOSTNAME"`
- Now we need to create a user with the roles we want to test. Go to members page - `CLOUD_HOST_NAME/account/members` and click `[Invite member]`.
  - Select the access level you want to grant and your project type. For example, to create a user with viewer role, toggle `[Instanse access]`, select project (should correspond to your project type, i.e Security), select `Viewer` role.
  - Create `.ftr/role_users.json` in the root of Kibana repo. Add record for created user.
    ```
    {
      "viewer": {
        "password": "xxxx",
        "email": "email_of_the_elastic_cloud_account"
      }
    }
    ```
- Now run the tests from the `x-pack` directory
```
TEST_CLOUD=1 TEST_CLOUD_HOST_NAME="CLOUD_HOST_NAME" TEST_ES_URL="https://testing-internal:testing-internal_pwd@ES_HOSTNAME:443" TEST_KIBANA_URL="https://testing-internal:testing-internal_pwd@KIBANA_HOSTNAME:443" node scripts/functional_test_runner.js --config test_serverless/functional/test_suites/security/common_configs/config.group1.ts --exclude-tag=skipMKI
```


## Skipping tests for MKI run
The tests that are listed in the the regular `config.ts` generally should work in both Kibana CI and MKI. However some tests might not work properly against MKI projects by design.
Tag the tests with `skipMKI` to be excluded for MKI run. It works only for the `describe` block:
```
describe("my test suite", async function() {
    this.tags(['skipMKI']);
    ...
});
```

If you are running tests from your local against MKI projects, make sure to add `--exclude-tag=skipMKI` to your FTR command.

## Run tests with dockerized package registry

For tests using package registry we have enabled a configuration that uses a dockerized lite version to execute the tests in the CI, this will reduce the flakyness of them when calling the real endpoint.

To be able to run this version locally you must have a docker daemon running in your system and set `FLEET_PACKAGE_REGISTRY_PORT` env var. In order to set this variable execute

```
export set FLEET_PACKAGE_REGISTRY_PORT=12345
```

To unset the variable, and run the tests against the real endpoint again, execute

```
unset FLEET_PACKAGE_REGISTRY_PORT 
```
