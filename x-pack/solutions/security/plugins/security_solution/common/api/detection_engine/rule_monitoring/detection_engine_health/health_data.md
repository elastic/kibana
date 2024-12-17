# Detection Engine health data

This document describes the data (state, aggregated metrics, aggregated logs, and other data) we return or are planning to return from the Detection Engine health API.

Legend for the tables below:

- ✅ - implemented
- 🚧 - in development
- 👍 - planned
- ❓ - maybe planned
- ❌ - not planned or applicable
- TED - "total, enabled, disabled" (applies to the "number of rules" state or metrics)

## Health overview

Health overview data is intended to give a broad, high-level picture of detection rules' health and performance. It is returned from the following three endpoints:

- **Cluster health**: `/internal/detection_engine/health/_cluster`
  - Returns: health overview of the whole cluster
  - Scope: all detection rules in all Kibana spaces
- **Space health**: `/internal/detection_engine/health/_space`
  - Returns: health overview of a given Kibana space
  - Scope: all detection rules in the space
- **Rule health**: `/internal/detection_engine/health/_rule`
  - Returns: health overview of a given rule
  - Scope: a given detection rule in a given Kibana space

All three endpoints accept a datetime interval parameter (**"health interval"**) over which they calculate health metrics, such as the number of rule executions happened during this interval.

All three endpoints return:

- **Health state at the moment of the API call**. Applies to the "now" moment. Can answer the following type of questions:
  - "What rules do I have now?"
  - "Are my rules healthy now? What are their last execution statuses?"
  - "Are my rules running fast enough now? What are their last execution durations?"
- **Health stats over the specified "health interval"**. Can answer the following type of questions:
  - "Overall, were my rules healthy and performant last 24 hours?"
  - "How many rule executions in total happened last 24 hours?"
  - "What were typical rule execution errors and warnings last 24 hours?"
  - "How fast, on average, were my rules executing during this timeframe?", where "on average" can be, for example, a median, or a 95th percentile of the "execution duration" metric.
- **Health history over the specified "health interval"**. Shows dynamics of change of health stats, calculated within the "health interval" in the form of a histogram (the same stats are calculated over each of the discreet sub-intervals of the whole interval). Can answer the following type of questions:
  - "How was my rules' health and performance changing during the last 24 hours? Show me stats calculated for each hour."
  - "How many rule executions happened every hour of the last 24 hours?"
  - "What were typical rule execution errors and warnings every hour of the last 24 hours?"
  - "How fast, on average, were my rules executing every hour of the last 24 hours?"

Below is the data we return or could return from these three endpoints.

### Health overview: state at the moment of the API call

ℹ️ When we say "rule" we mean `{ space_id, rule_id, rule_name? }`.

| Data                                                                     | `_cluster` | `_space` | `_rule` |
| ------------------------------------------------------------------------ | ---------- | -------- | ------- |
| **RULE OBJECT**                                                          |            |          |         |
| rule object with all attributes                                          | ❌         | ❌       | ✅      |
| rule's execution summary (contains last execution status and metrics)    | ❌         | ❌       | ✅      |
| rule's exceptions                                                        | ❌         | ❌       | ❓      |
| rule's actions                                                           | ❌         | ❌       | ✅      |
| rule's action connectors                                                 | ❌         | ❌       | ❓      |
| **SYSTEM**                                                               |            |          |         |
| number of ES nodes: total                                                | 👍         | ❌       | ❌      |
| number of ES nodes of each role                                          | 👍         | ❌       | ❌      |
| number of Kibana instances: total                                        | 👍         | ❌       | ❌      |
| number of Kibana instances of each role                                  | 👍         | ❌       | ❌      |
| number of Kibana spaces: total                                           | 👍         | ❌       | ❌      |
| number of Kibana spaces: w/ alerting rules (of all types)                | 👍         | ❌       | ❌      |
| number of Kibana spaces: w/ detection rules                              | 👍         | ❌       | ❌      |
| **AGGREGATED RULES**                                                     |            |          |         |
| number of all rules: TED                                                 | ✅         | ✅       | ❌      |
| number of prebuilt rules: TED                                            | ✅         | ✅       | ❌      |
| number of custom rules: TED                                              | ✅         | ✅       | ❌      |
| number of rules of each type: TED                                        | ✅         | ✅       | ❌      |
| number of prebuilt rules of each type: TED                               | 👍         | 👍       | ❌      |
| number of custom rules of each type: TED                                 | 👍         | 👍       | ❌      |
| number of rules with exceptions: TED                                     | ❓         | ❓       | ❌      |
| number of rules with notification actions: TED                           | ❓         | ❓       | ❌      |
| number of rules with legacy notification actions: TED                    | ❓         | ❓       | ❌      |
| number of rules with response actions: TED                               | ❓         | ❓       | ❌      |
| **AGGREGATED LAST EXECUTION RESULTS**                                    |            |          |         |
| number of rules by execution outcome ("succeeded", "warning", "failed")  | ✅         | ✅       | ❌      |
| top X most common "failed" outcomes                                      | 👍         | 👍       | ❌      |
| top X most common "warning" outcomes                                     | 👍         | 👍       | ❌      |
| number of rules for each most common execution outcome                   | 👍         | 👍       | ❌      |
| rules for each most common execution outcome                             | 👍         | 👍       | ❌      |
| top X rules by execution duration (desc)                                 | 👍         | 👍       | ❌      |
| top X rules by search duration (desc)                                    | 👍         | 👍       | ❌      |
| top X rules by indexing duration (desc)                                  | 👍         | 👍       | ❌      |
| top X rules by detected gap duration (desc)                              | 👍         | 👍       | ❌      |
| top X rules by schedule delay aka drift (desc)                           | 👍         | 👍       | ❌      |
| top X rules by number of shards queried (desc)                           | 👍         | 👍       | ❌      |
| top X rules by number of shards queried in a particular data tier (desc) | 👍         | 👍       | ❌      |

### Health overview: stats and history over interval

ℹ️ [S, H] == [Stats over interval, History over interval]

| Data                                                                | `_cluster` [S,H] | `_space` [S,H] | `_rule` [S,H] |
| ------------------------------------------------------------------- | ---------------- | -------------- | ------------- |
| **AGGREGATED EXECUTION STATUSES**                                   |                  |                |               |
| number of executions: total                                         | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| number of executions: by outcome ("succeeded", "warning", "failed") | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| top X "failed" outcomes (status messages)                           | [👍, ❓]         | [👍, ❓]       | [👍, ❓]      |
| top X "warning" outcomes (status messages)                          | [👍, ❓]         | [👍, ❓]       | [👍, ❓]      |
| **AGGREGATED EXECUTION METRICS**                                    |                  |                |               |
| aggregated execution duration (percentiles: 50, 95, 99, 99.9)       | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| aggregated search duration (percentiles: 50, 95, 99, 99.9)          | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| aggregated indexing duration (percentiles: 50, 95, 99, 99.9)        | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| aggregated schedule delay aka drift (percentiles: 50, 95, 99, 99.9) | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| detected gaps: total number                                         | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| detected gaps: total duration                                       | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| number of detected alerts (those we generated in memory)            | [👍, 👍]         | [👍, 👍]       | [👍, 👍]      |
| number of created alerts (those we wrote to the `.alerts-*` index)  | [👍, 👍]         | [👍, 👍]       | [👍, 👍]      |
| number of not created alerts because of cirquit breaker             | [👍, 👍]         | [👍, 👍]       | [👍, 👍]      |
| number of executions when cirquit breaker was hit                   | [👍, 👍]         | [👍, 👍]       | [👍, 👍]      |
| number of triggered actions                                         | [❓, ❓]         | [❓, ❓]       | [❓, ❓]      |
| **AGGREGATED EXECUTION LOGS (MESSAGE EVENTS)**                      |                  |                |               |
| number of logged messages: total                                    | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| number of logged messages: by log level                             | [✅, ✅]         | [✅, ✅]       | [✅, ✅]      |
| top X errors (messages with log level "error")                      | [✅, ❓]         | [✅, ❓]       | [✅, ❓]      |
| top X warnings (messages with log level "warn")                     | [✅, ❓]         | [✅, ❓]       | [✅, ❓]      |
| top X error codes (we don't have error codes in our logs yet)       |                  |                |               |

## Health details

Detailed health data can be used for digging deeper into detection rules' health and performance, when the overall picture is clear. It should be returned from dedicated endpoints. Each kind of details we can calculate within either of two scopes:

- The whole cluster, i.e. all Kibana spaces.
- A given Kibana space.

**NOTE**: As of now, we don't have any endpoints that would return detailed data.

ℹ️ When we say "rule" we mean `{ space_id, rule_id, rule_name? }`.

| Data                                                                                                                                                                                      | Scope: cluster | Scope: space |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------ |
| **RULES SORTED BY EXECUTION STATUSES**                                                                                                                                                    |                |              |
| top X rules by number of execution outcomes: total (desc) - in other words, rules that were running most often within a given interval                                                    | 👍             | 👍           |
| top X rules by number of execution outcomes: by outcome (desc) - in other words, rules that were failing/succeeding/etc most often within a given interval                                | 👍             | 👍           |
| **RULES SORTED BY EXECUTION METRICS**                                                                                                                                                     |                |              |
| top X rules by execution duration (percentile, desc)                                                                                                                                      | 👍             | 👍           |
| top X rules by search duration (percentile, desc)                                                                                                                                         | 👍             | 👍           |
| top X rules by indexing duration (percentile, desc)                                                                                                                                       | 👍             | 👍           |
| top X rules by detected gap duration (percentile, desc)                                                                                                                                   | 👍             | 👍           |
| top X rules by schedule delay aka drift (percentile, desc)                                                                                                                                | 👍             | 👍           |
| top X rules by number of shards queried (percentile, desc)                                                                                                                                | 👍             | 👍           |
| top X rules by number of shards queried in a particular data tier (percentile, desc)                                                                                                      | 👍             | 👍           |
| top X rules that are consuming the most total execution time - summing execution time over the executions for that rule, so it accounts for rules that are running more often             | 👍             | 👍           |
| **RULES SORTED BY EXECUTION LOGS (MESSAGE EVENTS)**                                                                                                                                       |                |              |
| top X rules by number of logged messages (log level, desc) - errors and warnings are most interesting                                                                                     | 👍             | 👍           |
| **SOURCE INDICES / DATA QUALITY**                                                                                                                                                         |                |              |
| all rules that are querying indices with future timestamps + the actual index names with future timestamps in them (the API would need to check all rule's index patterns and data views) | 👍             | 👍           |
