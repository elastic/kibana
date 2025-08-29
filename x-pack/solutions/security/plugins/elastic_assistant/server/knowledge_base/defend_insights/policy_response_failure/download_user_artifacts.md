---
type: policy_response_failure
action.name: download_user_artifacts
action.message: "*"
os: [Windows, MacOS, Linux]
date: "2025-08-15"
---

## Remediation
Failure to download user artifacts (such as Trusted Apps or Event Filters) often stem from network connectivity or SSL/TLS certificate verification issues. To diagnose, run the following command on a problematic host and examine the Fleet Server section of the output:
* Linux: `sudo /opt/Elastic/Endpoint/elastic-endpoint test output`
* macOS: `sudo /Library/Elastic/Endpoint/elastic-endpoint test output`
* Windows: `C:\\Program Files\\Elastic\\Endpoint\\elastic-endpoint.exe test output`

If network connectivity is the problem and the output doesn't clarify the issue, consider using a tool like curl for further diagnosis. If incorrect proxy information is displayed, review the proxy configuration, noting that Defend advanced options can override these settings. For certificate issues, check the Fleet Server configuration and explore using one of the `advanced.artifacts.user.*` Defend advanced settings.
