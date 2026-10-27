# @kbn/securitysolution-alerts-page-url

Builds the query string of a Security Alerts page link that shows a given set of alerts, and the
helpers that encode page URL state (filters, time range, page filters). The Agent Builder alerts
attachment and the AlertZero Alert Triage workflow build the same link, so they share this one function.
