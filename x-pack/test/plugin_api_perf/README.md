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


# Running the test against multiple Kibana and a single Elasticsearch
This is not a clean and ideal way of running this test, but it is a workaround that's worth understanding.

## Test Description
The idea is that we would like to test performance of running multiple Kibana instances side by side, both pointing at the same Elasticsearch cluster.

This is needed in order to verify that the distributed nature of Kibana doesn't introduce issues or break assumptions in our developed solutions.

The challenge is that the _plugin_ used to create the Perf test is exposed in the FTS, but not in a standard Kibana build.

Running two Kibana in FTS side by side is actually very tricky, so below is a step by step method for achieving this.
Ideally we can clean this up and make it easier and less hacky in the future, but for now, this documents how this can be achieved.

## Method
1. You need two cloned repos of Kibana, so clone a second Kibana of your personal form along side your existing clone. Personally I have two co-located Kibana folders (`./elastic/kibana` and `./elastic/_kibana`, where the first is my working clone and the other is never used for actual dev work, but that's just me -GM).
1. You can run the FTS in the main clone of your fork by running `node scripts/functional_tests_server.js --config=test/plugin_api_perf/config.js` in the `x-pack` folder.
1. Once you've began running the default FTS, you want your second FTS to run such that it is referencing the Elasticsearch instance started by that first FTS. You achieve this by exporting a `TEST_ES_URL` Environment variable that points at it. By default, you should be able to run this: `export TEST_ES_URL=http://elastic:changeme@localhost:9220`. Do this in a terminal window opened in your **second** clone of Kibana (in my case, the `./elastic/_kibana` folder).
1. One issue I encountered with FTS is that I can't tell it _not to start its own ES instance at all_. To achieve this, in `packages/kbn-test/src/functional_tests/tasks.js` you need to comment out the line that starts up its own ES (`const es = await runElasticsearch({ config, options: opts });` [line 85]  and `await es.cleanup();` shortly after)
1. Next you want each instance of Kibana to run with its own UUID as that is used to identify each Kibana's owned tasks. In the file `x-pack/test/functional/config.js` simple change the uuid on the line `--server.uuid=` into any random UUID.
1. Now that you've made these changes you can kick off your second Kibana FTS by running ths following in the second clone's `x-pack` folder: `TEST_KIBANA_PORT=5621 node scripts/functional_tests_server.js --config=test/plugin_api_perf/config.js`. This runs Kibana on a different port than the first FTS (`5621` instead of `5620`).
1. With two FTS Kibana running and both pointing at the same Elasticsearch. Now, you can run the actual perf test by running `node scripts/functional_test_runner.js --config=test/plugin_api_perf/config.js` in a third terminal

