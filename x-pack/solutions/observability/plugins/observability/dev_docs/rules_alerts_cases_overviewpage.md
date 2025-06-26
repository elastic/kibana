
# Test plan for: Rules, Alerts, Overview page, and Cases

This plan will cover the UI part (not API) for:

- Rules
- Alerts
- Overview page
- Cases

## Data generation

> [!WARNING]
> This guide will not cover how to run Kibana and ES locally. It assumes both instances are running before starting the data ingestion 

> [!TIP]
> The following commands use [synthtrace](https://github.com/elastic/kibana/blob/main/packages/kbn-apm-synthtrace/README.md) to generate some data that will be used to test the rules.
Synthtrace has many scenarios, any of them could work as long as it has data that makes sense with the rules that need to be tested. 

For this test will use `logs_traces_hosts` scenario.

```
node scripts/synthtrace.js logs_traces_hosts --live
```

That will generate data in
`metrics-system*,metrics-kubernetes*,metrics-docker*,metrics-aws*`,
`traces-apm*,metrics-apm*,logs-apm*`,
`logs-*-*,cloud-logs-*-*`

> [!NOTE]
> The above indices will be used later to create the rules' data views.

## Rules and alerts

### Creation

- Login to Kibana
- Form Kibana side nav click `Alerts` under `Observability`
- Click `Manage rules` on the right top side.
- Click `Create Rule` button on the right top side.
- From the `Select rule type` modal select (Repeat this part for each rule). The above mentioned indices would be used either to create a data view or as index pattern:
  - Custom Threshold
  - Metric Threshold
  - Inventory Threshold
  - APM Latency threshold
  - APM Error count
  - APM Failed transaction rate
  - Anomaly (it's hard to setup up locally as it relies on ML. Use oblt-cli instead)
  - ESQ
  - Logs threshold

> [!NOTE]
>
> - Create rules with and without groupBy.
> - Create rules with and without filters.
> - Create rules with different types of aggregations (if applicable).
> - Create rules with check and unchecked Alert on no data.
> - Create rules with Actions (Log connector), and check if the action variables are logged.

### Rule details and rules actions

Visit the rule details page, then check and test:

- Alerts table
  - UI filter
  - Search bar
  - Time range
- Execution history with response filter and time range
- Alert activity by clicking on "Active now" and how that reflects on the alert table
- Enable/Disable the rule.
- Snooze the rule
- Edit the rule

### Alerts

Visit the alerts page, then check and test:

- Alert table
  - Update the columns and fields
  - Change the time range
  - Use __Group alerts by__ option
  - Change Table density and lines per row
  - Use `Actions` menu items (Add to exciting and new case, View rule details, etc.)
- Use the UI filters (Show all, Active, Recovered, and Untracked) and see how it reflects the results in the alert table
- Use the Search bar and see how it reflects the results in the alert table
- Click on the Disabled and Snoozed at the top, it should lead to the rules page with the right filters

## Overview page

Visit the Overview page under Observability, then check and test:

- The 4 sections (Alerts, Log Events, Hosts, and Services) are visible and show data.
- Change the time range at the top of the page, it should change the data shown in the 4 sections.
- Try the links of each section: "Show alerts", "Show logs", "Show inventory", and "Show service inventory".

> [!NOTE]
>
> If there is not data showing, check if the data generation is working, and the time range is correct.

## Cases

Visit the Cases page under Observability, then check and test:

- Create many cases with different types of Severity and description
- Cases table
  - Check all cases are visible
  - Apply filters and check how it reflects on the cases table
- Cases
  - Open one case
  - Add comments and change the Sort by.
  - Click on "Mark in progress"
  - Edit the fields in the right side panel
  - Change the status from the status drop down-menu at the top left.
  - Open the `Files` tab and add a file
    - Download it
    - Delete it
  - Open the `Observables` tab and add an Observable e.g host, IP
    - Edit it
    - Delete it
From the Alerts table, go to the Alerts page
  - On an alert click the more button `...` in the alert table, then click `Add to existing case`
  - On an alert click the more button `...` in the alert table, then click `Add to new case`
  - Click on the toast that appears after each action and verify that the alert was added correctly
  - Open the `Alerts` tab and check all the added alerts to that case
