# Kibana Serverless Tests

The tests and helper methods (services, page objects) defined here in
`x-pack/test_serverless` cover the serverless functionality introduced by the
 `serverless`, `serverless_observability`, `serverless_search` and
 `serverless_security` plugins.

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
covering functionality that's shared across serverless projects. As a result, these tests
are automatically included in all project specific test configurations and don't have a
dedicated configuration file. We always run in the context of one of the serverless projects
and invoke the corresponding set of tests, which then also includes the `common` tests.

In case a common test needs to be skipped for one of the projects, there are the following
suite tags available to do so: `skipSvlOblt`, `skipSvlSearch`, `skipSvlSec`, which can be
added like this to a test suite:

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
