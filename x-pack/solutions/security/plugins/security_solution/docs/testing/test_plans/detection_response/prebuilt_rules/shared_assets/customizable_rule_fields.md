# Customizable rule fields

These are fields in the detection rule schema that are able to be customized on a prebuilt rule.

| Rule type        | Field name in UI          | Diffable rule field       |
| ---------------- | ------------------------- | ------------------------- |
| All rule types   | Rule name                 | `name`                    |
| All rule types   | Rule description          | `description`             |
| All rule types   | Tags                      | `tags`                    |
| All rule types   | Default severity          | `severity`                |
| All rule types   | Severity Override         | `severity_mapping`        |
| All rule types   | Default risk score        | `risk_score`              |
| All rule types   | Risk score override       | `risk_score_mapping`      |
| All rule types   | Reference URLs            | `references`              |
| All rule types   | False positive examples   | `false_positives`         |
| All rule types   | MITRE ATT&CK™ threats     | `threat`                  |
| All rule types   | Setup guide               | `setup`                   |
| All rule types   | Investigation guide       | `note`                    |
| All rule types   | Related integrations      | `related_integrations`    |
| All rule types   | Required fields           | `required_fields`         |
| All rule types   | Rule schedule             | `rule_schedule`           |
| All rule types   | Max alerts per run        | `max_signals`             |
| All rule types   | Rule name override        | `rule_name_override`      |
| All rule types   | Timestamp override        | `timestamp_override`      |
| All rule types   | Timeline template         | `timeline_template`       |
| All rule types   | Building block `*`        | `building_block`          |
| All rule types   | Investigation fields      | `investigation_fields`    |
| All rule types   | Data source `**`          | `data_source`             |
| All rule types   | Suppress alerts           | `alert_suppression`       |
| Custom Query     | Custom query              | `kql_query`               |
| Saved Query      | Custom query              | `kql_query`               |
| EQL              | EQL query                 | `eql_query`               |
| ESQL             | ESQL query                | `esql_query`              |
| Threat Match     | Custom query              | `kql_query`               |
| Threat Match     | Indicator index patterns  | `threat_index`            |
| Threat Match     | Indicator index query     | `threat_query`            |
| Threat Match     | Indicator mapping         | `threat_mapping`          |
| Threat Match     | Indicator prefix override | `threat_indicator_path`   |
| Threshold        | Custom query              | `kql_query`               |
| Threshold        | Threshold config          | `threshold`               |
| Machine Learning | Machine Learning job      | `machine_learning_job_id` |
| Machine Learning | Anomaly score threshold   | `anomaly_threshold`       |
| New Terms        | Custom query              | `kql_query`               |
| New Terms        | Fields                    | `new_terms_fields`        |
| New Terms        | History Window Size       | `history_window_start`    |

- `*` Building block field is used to mark alerts as building block alerts.
- `**` Data Source represents index patterns or a data view. Machine Learning rules don't have data_source field.
