---
type: policy_response_failure
link: https://www.elastic.co/docs/solutions/security/configure-elastic-defend/enable-access-for-macos#allow-filter-content
action.name: detect_network_events
action.message: "Failed to start network event reporting"
os: [MacOS]
date: "2025-08-15"
---

## Remediation
After successfully loading the ElasticEndpoint system extension, an additional message appears, asking to allow Elastic Endpoint to filter network content.

Click Allow to enable content filtering for the ElasticEndpoint system extension. Without this approval, Elastic Endpoint cannot receive network events and, therefore, cannot enable network-related features such as host isolation.
