# Rule Execution Log

## Summary

Rule Execution Log is used to write various execution events to a number of destinations, and then query those
destinations to be able to show plain or aggregated execution data in the app.

Events we log:

- Rule execution status changes. See `RuleExecutionEventType['status-change']` and `RuleExecutionStatus`.
- Execution metrics. See `RuleExecutionEventType['execution-metrics']` and `RuleExecutionMetrics`.
- Simple messages. See `RuleExecutionEventType.message`.

Destinations we write execution logs to:

- Console Kibana logs.
  - Written via an instance of Kibana system `Logger`.
- Event Log (`.kibana-event-log-*` indices).
  - Written via an instance of `IEventLogger` from the `event_log` plugin.
- Rule's sidecar saved objects of type `siem-detection-engine-rule-execution-info`.
  - Written via an instance of `SavedObjectsClientContract`.

There are two main interfaces for using Rule Execution Log, these are entrypoints that you can use to start
exploring this implementation:

- `IRuleExecutionLogForExecutors` - intended to be used from rule executor functions, mainly for the purpose
  of writing execution events.
- `IRuleExecutionLogForRoutes` - intended to be used from the API route handlers, mainly for the purpose
  of reading (filtering, sorting, searching, aggregating) execution events.

## Writing status changes

When we log a rule status change, we do several things:

- Create or update a `siem-detection-engine-rule-execution-info` sidecar saved object.
  Every rule can have exactly 0 or 1 execution info SOs associated with it.
  We use it to quickly fetch N execution SOs for N rules to show the rules in a table.
- Write 2 events to Event Log: `execution-metrics` and `status-change`.
  These events can be used to show the Rule Execution Log UI on the Rule Details page.
- Write the status change message to console logs (if provided).
- Write the new status itself to console logs.

This is done by calling the `IRuleExecutionLogForExecutors.logStatusChange` method.

## Writing console logs

Console logs from rule executors are written via a logger with the name `plugins.securitySolution.ruleExecution`.
This allows to turn on _only_ rule execution logs in the Kibana config (could be useful when debugging):

```yaml
logging:
  appenders:
    custom_console:
      type: console
      layout:
        type: pattern
        highlight: true
        pattern: "[%date][%level][%logger] %message"
  root:
    appenders: [custom_console]
    level: off
  loggers:
    - name: plugins.securitySolution.ruleExecution
      level: debug # or trace
```

Every log message has a suffix with correlation ids:

```txt
[siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
```

You can also enable printing additional log metadata objects associated with every log record by changing the pattern:

```yaml
# The metadata object will be printed after the log message
pattern: "[%date][%level][%logger] %message %meta"
```

Example of such an object (see `ExtMeta` type for details):

```txt
{"rule":{"id":"420e1ed0-8f75-11ec-9aaf-c925ad1b24ee","uuid":"9be1325f-7b00-467b-80f1-90d594c22bf4","name":"Test ip range - exceptions with is operator","type":"siem.queryRule","execution":{"uuid":"8d79919b-b09e-4243-ac0c-a4115cd1225f"}},"kibana":{"spaceId":"default"}}
```

Example of logs written during a single execution of the "Endpoint Security" rule:

```txt
[2022-02-23T17:05:09.901+03:00][DEBUG][plugins.securitySolution.ruleExecution] [+] Starting Signal Rule execution [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:09.907+03:00][DEBUG][plugins.securitySolution.ruleExecution] interval: 5m [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:09.908+03:00][INFO ][plugins.securitySolution.ruleExecution] Changing rule status to "running" [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:10.595+03:00][WARN ][plugins.securitySolution.ruleExecution] This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ["logs-endpoint.alerts-*"] was found. This warning will continue to appear until a matching index is created or this rule is de-activated. If you have recently enrolled agents enabled with Endpoint Security through Fleet, this warning should stop once an alert is sent from an agent. [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:10.595+03:00][WARN ][plugins.securitySolution.ruleExecution] Changing rule status to "partial failure" [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.630+03:00][DEBUG][plugins.securitySolution.ruleExecution] sortIds: undefined [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.634+03:00][DEBUG][plugins.securitySolution.ruleExecution] totalHits: 0 [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.634+03:00][DEBUG][plugins.securitySolution.ruleExecution] searchResult.hit.hits.length: 0 [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.635+03:00][DEBUG][plugins.securitySolution.ruleExecution] totalHits was 0, exiting early [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.636+03:00][DEBUG][plugins.securitySolution.ruleExecution] [+] completed bulk index of 0 [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.636+03:00][DEBUG][plugins.securitySolution.ruleExecution] [+] Signal Rule execution completed. [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.638+03:00][DEBUG][plugins.securitySolution.ruleExecution] [+] Finished indexing 0 signals into .alerts-security.alerts [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
[2022-02-23T17:05:11.639+03:00][DEBUG][plugins.securitySolution.ruleExecution] [+] Finished indexing 0 signals searched between date ranges [
  {
    "to": "2022-02-23T14:05:09.775Z",
    "from": "2022-02-23T13:55:09.775Z",
    "maxSignals": 10000
  }
] [siem.queryRule][Endpoint Security][rule id 825b2fab-8b3e-11ec-a4a0-cf820453283c][rule uuid 9a1a2dae-0b5f-4c3d-8305-a268d404c306][exec id ebb7f713-b216-4c90-a456-6c1a6815a065][space default]
```

## Finding rule execution data in Elasticsearch

These are some queries for Kibana Dev Tools that you can use to find execution data associated with a given rule.

```txt
# Sidecar siem-detection-engine-rule-execution-info saved object
# Rule id: 825b2fab-8b3e-11ec-a4a0-cf820453283c
GET /.kibana/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "type": "siem-detection-engine-rule-execution-info"
          }
        },
        {
          "nested": {
            "path": "references", 
            "query": {
              "term": {
                "references.id": "825b2fab-8b3e-11ec-a4a0-cf820453283c"
              }
            }
          }
        }
      ]
    }
  }
}
```

```txt
# Events of type "status-change" written to Event Log
# Rule id: 825b2fab-8b3e-11ec-a4a0-cf820453283c
GET /.kibana-event-log-*/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": { "event.provider": "securitySolution.ruleExecution" }
        },
        {
          "term": { "event.action": "status-change" }
        },
        {
          "term": { "rule.id": "825b2fab-8b3e-11ec-a4a0-cf820453283c" }
        }
      ]
    }
  },
  "sort": [
    { "@timestamp": { "order": "desc" } },
    { "event.sequence": { "order": "desc" } }
  ]
}
```

```txt
# Events of type "execution-metrics" written to Event Log
# Rule id: 825b2fab-8b3e-11ec-a4a0-cf820453283c
GET /.kibana-event-log-*/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": { "event.provider": "securitySolution.ruleExecution" }
        },
        {
          "term": { "event.action": "execution-metrics" }
        },
        {
          "term": { "rule.id": "825b2fab-8b3e-11ec-a4a0-cf820453283c" }
        }
      ]
    }
  },
  "sort": [
    { "@timestamp": { "order": "desc" } },
    { "event.sequence": { "order": "desc" } }
  ]
}
```
