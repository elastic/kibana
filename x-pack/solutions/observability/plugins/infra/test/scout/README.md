# Test distribution

We have 2 separate playwright configs, one for parallel tests under `/parallel_tests` and another one for sequential tests under `/tests`.
We're striving to implement as many parallel tests as possible, in order to improve test execution times.

So, by default, we should write all our tests under /parallel_tests having in mind that they will run alongside other suites and making use of the global setup hook for data loading,
instead of loading data separately in each test suite.

However, some tests might have special traits that make them unsuitable for parallel execution, like particular data needs in ES indexes that could impact other test setups if ran concurrently.
For these instances we have the sequential tests folder where each test will run in isolation and where no global setup hook exists, so each suite can set the stage as required. Just remember to
cleanup any stage you've setup after your suite is done so the next test can start on a clean slate. This should nonetheless be a special case, last resort, measure when writing tests. Try to think of a way to write your tests in a parallel-safe way before resorting to including them in the sequential run.

# How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

Then you can run the parallel tests in another terminal:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/infra/test/scout/ui/parallel.playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --project local --config x-pack/solutions/observability/plugins/infra/test/scout/ui/parallel.playwright.config.ts --grep @svlOblt
```

Alternatively, you can run sequential tests by passing in the proper playwright config:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/infra/test/scout/ui/playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --project local --config x-pack/solutions/observability/plugins/infra/test/scout/ui/playwright.config.ts --grep @svlOblt
```

Test results are available in `x-pack/solutions/observability/plugins/infra/test/scout/ui/output`
