---
type: policy_response_failure
link: https://www.elastic.co/docs/troubleshoot/security/elastic-defend#_resolve_the_issue
action.name: agent_connectivity
action.message: "Failed to connect to Agent"
os: [Windows, MacOS, Linux]
date: "2025-08-15"
---

## Summary
After Elastic Agent installs Endpoint, Endpoint connects to Elastic Agent over a local relay connection to report its health status and receive policy updates and response action requests. If that connection cannot be established, the Elastic Defend integration will cause Elastic Agent to be in an Unhealthy status, and Endpoint won’t operate properly.

## Remediation
To debug and resolve the issue, follow these steps:

1. Since 8.7.0, Endpoint diagnostics contain a file named analysis.txt that contains information about what may cause this issue. As of 8.11.2, Elastic Agent diagnostics automatically include Endpoint diagnostics. For previous versions, you can gather Endpoint diagnostics by running:

* sudo /opt/Elastic/Endpoint/elastic-endpoint diagnostics (Linux)
* sudo /Library/Elastic/Endpoint/elastic-endpoint diagnostics (macOS)
* c:\Program Files\Elastic\Endpoint\elastic-endpoint.exe diagnostics (Windows)

2. Make sure nothing else on your device is listening on ports 6788 or 6789 by running:

* sudo netstat -anp --tcp (Linux)
* sudo netstat -an -f inet (macOS)
* netstat -an (Windows)

3. Make sure localhost can be resolved to 127.0.0.1 by running:

* ping -4 -c 1 localhost (Linux)
* ping -c 1 localhost (macOS)
* ping -4 localhost (Windows)
