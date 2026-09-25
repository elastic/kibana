# cloud-fp-synthetic corpus

> **PROVISIONAL — synthetic fixtures.** All events are hand-constructed ECS documents, NOT real telemetry.
> Labels are derived from the rules' documented `false_positives` notes, not from observed data.
> Use for detection-logic sanity and FP-condition modeling only; not a fidelity benchmark.

## Method
1. Top 28 cloud-identity rules by `fp_prior_score` from `rule-fp-priors/rules_fp_priors.csv` (queries + false_positives notes cached in `cloud_rules.json`).
2. `build_cloud_fp.py` renders benign-context ECS events per rule: every positive KQL clause satisfied, every negated clause avoided (verified field-by-field — see per-fixture clause check below; 0 negation violations).
3. Threshold rules emit N events ≥ the rule's cardinality; new_terms/query rules emit 1 first-seen event.
4. `label=false_positive`, `label_provenance=synthetic`, `source_ref=<rule id> | FP note text`, `gold_rationale` = the benign condition realized from the note.
5. Inconclusive variants neutralize exactly one required clause (partial match) → `label=inconclusive`.

## Counts
- **73 false_positive** fixtures across 28 rules
- **5 inconclusive** partial-match variants
- Per primary data_stream.dataset (FP only): {'azure.activitylogs': 15, 'azure.platformlogs': 4, 'azure.signinlogs': 4, 'azure.aadgraphactivitylogs': 1, 'okta.system': 13, 'gcp.audit': 2, 'aws.cloudtrail': 28, 'endpoint.events.process': 2, 'endpoint.events.network': 1, 'o365.audit': 3}

## Not-renderable
None — all 28 rules had actionable false_positives notes; 0 rules excluded.

## Per-fixture clause verification
### cloud-fp-d4e5f6a7-0 (false_positive)
- condition: Planned retention-policy cleanup of expired backup snapshots by the backup automation owner during an approved maintenance window
- clause check: 4/4 matched, violations: 0
### cloud-fp-d4e5f6a7-1 (false_positive)
- condition: Planned retention-policy cleanup of expired backup snapshots by the backup automation owner during an approved maintenance window
- clause check: 4/4 matched, violations: 0
### cloud-fp-d4e5f6a7-2 (false_positive)
- condition: Planned retention-policy cleanup of expired backup snapshots by the backup automation owner during an approved maintenance window
- clause check: 4/4 matched, violations: 0
### cloud-fp-c3d4e5f6-0 (false_positive)
- condition: Storage administrator deleting an old snapshot during routine maintenance per data-retention policy
- clause check: 4/4 matched, violations: 0
### cloud-fp-b2c3d4e5-0 (false_positive)
- condition: Planned decommissioning project deleting five retired storage accounts, ticketed through change management
- clause check: 3/3 matched, violations: 0
### cloud-fp-b2c3d4e5-1 (false_positive)
- condition: Planned decommissioning project deleting five retired storage accounts, ticketed through change management
- clause check: 3/3 matched, violations: 0
### cloud-fp-b2c3d4e5-2 (false_positive)
- condition: Planned decommissioning project deleting five retired storage accounts, ticketed through change management
- clause check: 3/3 matched, violations: 0
### cloud-fp-b2c3d4e5-3 (false_positive)
- condition: Planned decommissioning project deleting five retired storage accounts, ticketed through change management
- clause check: 3/3 matched, violations: 0
### cloud-fp-b2c3d4e5-4 (false_positive)
- condition: Planned decommissioning project deleting five retired storage accounts, ticketed through change management
- clause check: 3/3 matched, violations: 0
### cloud-fp-a1b2c3d4-0 (false_positive)
- condition: Storage administrator deleting a storage account during environment cleanup
- clause check: 3/3 matched, violations: 0
### cloud-fp-d8f4e3b0-0 (false_positive)
- condition: Authorized large-scale migration project removing restore point collections for VMs being decommissioned
- clause check: 3/3 matched, violations: 0
### cloud-fp-d8f4e3b0-1 (false_positive)
- condition: Authorized large-scale migration project removing restore point collections for VMs being decommissioned
- clause check: 3/3 matched, violations: 0
### cloud-fp-d8f4e3b0-2 (false_positive)
- condition: Authorized large-scale migration project removing restore point collections for VMs being decommissioned
- clause check: 3/3 matched, violations: 0
### cloud-fp-97266eb4-0 (false_positive)
- condition: Platform administrator using Serial Console break-glass access to recover a VM unreachable after a misconfigured NSG change
- clause check: 5/5 matched, violations: 0
### cloud-fp-60884af6-0 (false_positive)
- condition: System administrator running a diagnostic command on a VM through Run Command during an incident-response session
- clause check: 5/6 matched, violations: 0
### cloud-fp-13a3cc0e-0 (false_positive)
- condition: Observability agent with partial RBAC receiving Forbidden on resource types it watches; baseline-validated service account, not enumeration
- clause check: 6/7 matched, violations: 0
### cloud-fp-13a3cc0e-1 (false_positive)
- condition: Observability agent with partial RBAC receiving Forbidden on resource types it watches; baseline-validated service account, not enumeration
- clause check: 6/7 matched, violations: 0
### cloud-fp-13a3cc0e-2 (false_positive)
- condition: Observability agent with partial RBAC receiving Forbidden on resource types it watches; baseline-validated service account, not enumeration
- clause check: 6/7 matched, violations: 0
### cloud-fp-13a3cc0e-3 (false_positive)
- condition: Observability agent with partial RBAC receiving Forbidden on resource types it watches; baseline-validated service account, not enumeration
- clause check: 6/7 matched, violations: 0
### cloud-fp-9e8d9bb5-0 (false_positive)
- condition: Developer running Azure CLI from a new VPN egress IP while WAM attaches the compliant enrolled workstation device id; first sight of the IP
- clause check: 7/10 matched, violations: 0
### cloud-fp-a3cc60d8-0 (false_positive)
- condition: Newly deployed sanctioned third-party SaaS app with SharePoint integration accessing OneDrive during initial rollout
- clause check: 4/7 matched, violations: 0
### cloud-fp-c22f89d9-0 (false_positive)
- condition: Approved internal automation SDK obtaining tokens through the Microsoft Authentication Broker with a non-browser user agent; baselined developer tooling
- clause check: 6/7 matched, violations: 0
### cloud-fp-fd9d2933-0 (false_positive)
- condition: First-time use of a newly installed sanctioned PowerShell module by the user against AAD Graph; validated against app id and user history
- clause check: 3/4 matched, violations: 0
### cloud-fp-763b0a74-0 (false_positive)
- condition: Passwordless onboarding edge case: WHfB sign-in moments before device registration completed; validated against device registration timeline
- clause check: 7/8 matched, violations: 0
### cloud-fp-50887ba8-0 (false_positive)
- condition: Okta administrators sharing a shared conference-room workstation behind the corporate proxy for legitimate multi-account administration
- clause check: 3/5 matched, violations: 0
### cloud-fp-50887ba8-1 (false_positive)
- condition: Okta administrators sharing a shared conference-room workstation behind the corporate proxy for legitimate multi-account administration
- clause check: 3/5 matched, violations: 0
### cloud-fp-50887ba8-2 (false_positive)
- condition: Okta administrators sharing a shared conference-room workstation behind the corporate proxy for legitimate multi-account administration
- clause check: 3/5 matched, violations: 0
### cloud-fp-fb3ca230-0 (false_positive)
- condition: Frequent device switcher moving between managed and unmanaged devices; applications tag OS as null/unrecognized producing multiple OS names per dt_hash
- clause check: 3/4 matched, violations: 0
### cloud-fp-fb3ca230-1 (false_positive)
- condition: Frequent device switcher moving between managed and unmanaged devices; applications tag OS as null/unrecognized producing multiple OS names per dt_hash
- clause check: 3/4 matched, violations: 0
### cloud-fp-621e92b6-0 (false_positive)
- condition: User with simultaneous sessions on laptop and mobile device after standard MFA push approval
- clause check: 3/5 matched, violations: 0
### cloud-fp-621e92b6-1 (false_positive)
- condition: User with simultaneous sessions on laptop and mobile device after standard MFA push approval
- clause check: 3/5 matched, violations: 0
### cloud-fp-621e92b6-2 (false_positive)
- condition: User with simultaneous sessions on laptop and mobile device after standard MFA push approval
- clause check: 3/5 matched, violations: 0
### cloud-fp-e90ee3af-0 (false_positive)
- condition: Helpdesk running standard onboarding day-one password setup for five new hires; volume matches organization's onboarding batch size
- clause check: 2/2 matched, violations: 0
### cloud-fp-e90ee3af-1 (false_positive)
- condition: Helpdesk running standard onboarding day-one password setup for five new hires; volume matches organization's onboarding batch size
- clause check: 2/2 matched, violations: 0
### cloud-fp-e90ee3af-2 (false_positive)
- condition: Helpdesk running standard onboarding day-one password setup for five new hires; volume matches organization's onboarding batch size
- clause check: 2/2 matched, violations: 0
### cloud-fp-e90ee3af-3 (false_positive)
- condition: Helpdesk running standard onboarding day-one password setup for five new hires; volume matches organization's onboarding batch size
- clause check: 2/2 matched, violations: 0
### cloud-fp-e90ee3af-4 (false_positive)
- condition: Helpdesk running standard onboarding day-one password setup for five new hires; volume matches organization's onboarding batch size
- clause check: 2/2 matched, violations: 0
### cloud-fp-5dd3358c-0 (false_positive)
- condition: Controller upgrade changed the client library version, producing a first-seen user agent for the known cert-manager service account
- clause check: 4/7 matched, violations: 0
### cloud-fp-e1147459-0 (false_positive)
- condition: New internal CI runner introduced a novel user agent; expected client to be baselined then excluded after review
- clause check: 3/5 matched, violations: 0
### cloud-fp-171d3cdd-0 (false_positive)
- condition: Administrator behind the corporate NAT gateway mistyped the root password for the second account; both accounts are in the admin's documented scope
- clause check: 5/5 matched, violations: 0
### cloud-fp-171d3cdd-1 (false_positive)
- condition: Administrator behind the corporate NAT gateway mistyped the root password for the second account; both accounts are in the admin's documented scope
- clause check: 5/5 matched, violations: 0
### cloud-fp-185c782e-0 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-1 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-2 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-3 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-4 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-5 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-6 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-7 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-8 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-9 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-10 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-11 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-12 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-13 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-14 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-15 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-16 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-17 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-18 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-185c782e-19 (false_positive)
- condition: Scheduled secret-rotation job legitimately retrieving its 20 managed secrets in one batch window
- clause check: 4/6 matched, violations: 0
### cloud-fp-5f0234fd-0 (false_positive)
- condition: Broken ETL automation referencing a deprovisioned bucket prefix from a fixed pipeline host; external-account AccessDenied billing noise pattern
- clause check: 4/4 matched, violations: 0
### cloud-fp-5f0234fd-1 (false_positive)
- condition: Broken ETL automation referencing a deprovisioned bucket prefix from a fixed pipeline host; external-account AccessDenied billing noise pattern
- clause check: 4/4 matched, violations: 0
### cloud-fp-5f0234fd-2 (false_positive)
- condition: Broken ETL automation referencing a deprovisioned bucket prefix from a fixed pipeline host; external-account AccessDenied billing noise pattern
- clause check: 4/4 matched, violations: 0
### cloud-fp-5f0234fd-3 (false_positive)
- condition: Broken ETL automation referencing a deprovisioned bucket prefix from a fixed pipeline host; external-account AccessDenied billing noise pattern
- clause check: 4/4 matched, violations: 0
### cloud-fp-5f0234fd-4 (false_positive)
- condition: Broken ETL automation referencing a deprovisioned bucket prefix from a fixed pipeline host; external-account AccessDenied billing noise pattern
- clause check: 4/4 matched, violations: 0
### cloud-fp-5d9a3c71-0 (false_positive)
- condition: Permissive NACL passthrough design on an isolated subnet relying on security groups; change pre-approved through the architecture review board
- clause check: 6/8 matched, violations: 0
### cloud-fp-c371e9fc-0 (false_positive)
- condition: DevOps engineer running a legitimate SSM SendCommand to collect uptime from a fleet during patch verification
- clause check: 2/7 matched, violations: 0
### cloud-fp-2dba3edf-0 (false_positive)
- condition: Custom inventory health script calling Azure WireServer with curl from its signed location under /opt; validated scheduled task
- clause check: 4/7 matched, violations: 0
### cloud-fp-cf2b8cf5-0 (false_positive)
- condition: Operator administering an instance through SSM Session Manager tailing an application log; authorized break-fix session
- clause check: 2/17 matched, violations: 0
### cloud-fp-491651da-0 (false_positive)
- condition: IT administrator using PnP PowerShell for a scheduled site migration/backup of department documents
- clause check: 5/5 matched, violations: 0
### cloud-fp-3896d4c0-0 (false_positive)
- condition: User traveling legitimately between US and Germany offices; login cadence matches flight itinerary
- clause check: 6/9 matched, violations: 0
### cloud-fp-3896d4c0-1 (false_positive)
- condition: User traveling legitimately between US and Germany offices; login cadence matches flight itinerary
- clause check: 6/9 matched, violations: 0
### cloud-fp-d4e5f6a7-inc3 (inconclusive)
- condition: Snapshot deletion attempted but status_code=Failed: partial query match (operation matches, status clause does not); retention cleanup likely but unconfirmed
- clause check: 3/4 matched, violations: 0
### cloud-fp-50887ba8-inc3 (inconclusive)
- condition: Session start behind proxy with dt_hash but event_type=user.session.start: user.authentication* clause not matched; shared-host hypothesis unconfirmed
- clause check: 2/5 matched, violations: 0
### cloud-fp-5f0234fd-inc5 (inconclusive)
- condition: S3 AccessDenied present but tls.client.server_name missing: threshold grouping key absent; enumeration-vs-broken-automation undecided
- clause check: 3/4 matched, violations: 0
### cloud-fp-171d3cdd-inc2 (inconclusive)
- condition: ConsoleLogin failure from corporate NAT but user_identity.type=IAMUser: Root clause not matched; spraying-vs-typo undecided
- clause check: 4/5 matched, violations: 0
### cloud-fp-3896d4c0-inc2 (inconclusive)
- condition: Single successful portal login from one country: cardinality of 2 countries not reached; travel-vs-VPN undecided
- clause check: 6/9 matched, violations: 0
