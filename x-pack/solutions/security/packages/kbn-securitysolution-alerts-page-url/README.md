# @kbn/securitysolution-alerts-page-url

Builds the query string of a Security Alerts page link that shows a given set of alerts, and the
helpers that encode page URL state (filters, time range, page filters). The Agent Builder alerts
attachment and the AlertZero Alert Triage workflow build the same link, so they share this one function.

A selection is a list of alert ids, a list of alert tags (`kibana.alert.workflow_tags`), or both. The
link applies it as a single filter, and `buildAlertsSelectionQuery` returns the same query, so a count
of the selection can use the filter and time range the link uses. The Alerts page can still show fewer
alerts than such a count, as it hides building-block alerts by default. Each id makes the URL longer,
so a link carries at most `MAX_LINKED_ALERT_IDS` ids; reference a larger set by tag.
