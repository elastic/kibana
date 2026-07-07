---
type: policy_response_failure
action.name: connect_kernel
action.message: "Failed to open kernel device"
os: [Windows]
date: "2025-08-15"
---

## Remediation
The Endpoint service may have started before the driver.  If so, this should auto-resolve within a few seconds.

The driver service may be in a delete-pending state due to an installation issue.  This may be caused by a failed attempt by a local administrator to stop or delete the ElasticEndpointDriver service.  If so, rebooting the system will resolve the issue.
