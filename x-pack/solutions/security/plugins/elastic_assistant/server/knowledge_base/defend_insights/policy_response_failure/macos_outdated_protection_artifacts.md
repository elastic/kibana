---
type: policy_response_failure
action.name: download_global_artifacts
action.message: 'Global artifacts snapshot {version} does not match target snapshot: {date}'
os: [MacOS]
date: '2025-08-15'
---

## Remediation

Protection artifacts version is out of date. Check if automatic updates are enabled for the policy under the protection updates tab.

Artifact snapshots are enabled (requested), but the artifacts currently in use don’t yet match the expected snapshot. This is typically due to propagation delays on the Global Artifacts CDN. The Endpoint should fetch the requested artifacts once they’re available. For troubleshooting, run:

- `sudo /Library/Elastic/Endpoint/elastic-endpoint test output`

Note: `latest` is a special label that means “no snapshot—use the most recent artifacts.” This status can appear whenever a new snapshot is set in policy—for example, during a transition from `latest` to `YYYY-MM-DD`, or from one `YYYY-MM-DD` date to another.
