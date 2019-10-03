# Task Manager Performance Integration Test 

This test provides a test framework for spawning multiple concurrent tasks in
Task Manager and measuring how well Task Manager performs in claiming, processing
and finalising these tasks.

We keep this test disabled as it is used on an ad hoc basis and we feel it is
worth keeping around for future use, rather than being rewritten time and time again.

## How To Run The Tests

### Setup
In the `./test_suites/task_manager/task_manager_perf_integration.ts` file you see the following configuration:

```json
{ tasksToSpawn: 10, durationInSeconds: 60 }
```

`tasksToSpawn` tells the test runner how many tasks to spawn. Each task has a 1s interval so it will try to rerun it every second.
`durationInSeconds` tells the test running how many seconds you'd like the test to run for.

### running

1. Enable the test in `./test_suites/task_manager/index.ts` by removing the `.skip` from the `describe.skip`.
1. Run the test server from within the `x-pack` folder: `node scripts/functional_tests_server.js --config=test/plugin_api_perf/config.js`
1. Run the test runner from within the `x-pack` folder: `node scripts/functional_test_runner.js --config=test/plugin_api_perf/config.js`

## The Results
After the test runs you should get the following output:
```

 └-: task_manager_perf
   └-> "before all" hook
   └-: stressing task manager
     └-> "before all" hook
     └-> should run 10 tasks every second for a minute
       └-> "before each" hook: global before each
       └-> "before each" hook
       │ debg Stress Test Result:
       │ debg Average number of tasks executed per second: 4.846153846153846
       │ debg Average time it took from the moment a task's scheduled time was reached, until Task Manager picked it up: 8220.473076923077
       └- ✓ pass  (1.0m) "task_manager_perf stressing task manager should run 10 tasks every second for a minute"
     └-> "after all" hook
   └-> "after all" hook


1 passing (1.0m)

```

If you look at the debug output you'll see a summary of how the test went:
You'll see the average number of tasks executed per second, over a period of each 5 second window (meaning we calculate the running average based on a sliding window of 5 seconds).
You'll also see the average time it takes from the moment a task's scheduled time was reached, until Task Manager picked it up for execution.