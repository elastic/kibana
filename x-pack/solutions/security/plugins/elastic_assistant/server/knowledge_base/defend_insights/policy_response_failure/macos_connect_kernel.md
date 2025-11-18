---
type: policy_response_failure
link: https://www.elastic.co/docs/solutions/security/configure-elastic-defend/enable-access-for-macos#system-extension-endpoint
action.name: connect_kernel
action.message: "Failed to connect to kernel/system extension"
os: [MacOS]
date: "2025-08-15"
---

## Remediation
Elastic Endpoint will attempt to load a system extension during installation. This system extension must be loaded in order to provide insight into system events such as process events, file system events, and network events. A message prompting you to approve the system extension appears during installation.
