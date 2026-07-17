/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureSignificantEvent } from './types';

export const significantEvents: FixtureSignificantEvent[] = [
  {
    "event_id": "5bf13839-d661-45bd-9528-c22d51c37d83",
    "timestamp": "2026-07-16T19:47:47.857Z",
    "created_at": "2026-07-16T19:47:47.857Z",
    "discovery_id": "396c406b-6121-43e1-87e3-800ad7a10aea",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__m365-defender-azure-ad-oauth-invalid-cli-e23a0314",
    "status": "acknowledged",
    "title": "Connectors — M365 Defender: OAuth invalid_client",
    "summary": "M365 Defender connector is failing Azure AD OAuth authentication with invalid_client errors, blocking log ingestion for the integration. Errors are ongoing and stationary — the connector has been unable to authenticate since at least 19:27Z and is still failing as of 19:46Z. Action: validate the Azure AD app registration (client ID, client secret/certificate, and token endpoint) for the M365 Defender integration.",
    "criticality": 30,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "M365 Defender Azure AD OAuth invalid_client"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Retrieve the M365 Defender integration's Azure AD app registration and verify the client ID and client secret/certificate are current and not expired: `kubectl get secret -n <agentless-namespace> <m365-defender-secret> -o yaml`",
      "Rotate the Azure AD client secret for the M365 Defender app registration in the Azure portal (portal.azure.com → App registrations → Certificates & secrets) and update the agentless integration configuration in Kibana.",
      "If the app registration was recently modified or the tenant changed, re-authorize the integration via Kibana Fleet → Integrations → M365 Defender → Edit and re-enter credentials."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "42f89228-7ff2-4d61-bccc-81948780c7ce",
    "timestamp": "2026-07-16T19:16:18.653Z",
    "created_at": "2026-07-16T19:16:18.653Z",
    "discovery_id": "0559d092-e6e3-4dbf-9d8a-df32fd25af22",
    "discovery_slug": "logs-agent_builder.otel-default__tool-call-key-is-missing-for-index-0-in-5e134986",
    "status": "acknowledged",
    "title": "Agent Builder — tool execution: tool argument validation failures",
    "summary": "Agent Builder tool argument validation failures spiked (p≈2.9e-9) with confirmed errors prior to the detection window. Current state is uncertain: the stream has no telemetry since the detection window opened (telemetry gap confirmed). Cannot confirm whether the spike has resolved or the service is down. Verify Agent Builder service health and telemetry pipeline before closing.",
    "criticality": 45,
    "confidence": 0.4,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool argument validation failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify Agent Builder service health and confirm telemetry is flowing: kubectl get pods -n agent-builder -l app=agent-builder and check if the OTel exporter is running and connected",
      "If the service is running, check for recent deployments that may have introduced the tool_calls serialization bug: kubectl rollout history deployment/agent-builder -n agent-builder",
      "If the spike has subsided, review the tool-calling chunk serialization code to ensure tool name, arguments, and toolCallId are always populated before emitting streamed chunks"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "7cd37d21-bbb9-452e-82c1-9a2a6b1cf468",
    "timestamp": "2026-07-16T19:15:51.850Z",
    "created_at": "2026-07-16T19:15:51.850Z",
    "discovery_id": "2b7123c7-289b-45b1-a91d-8d33773ae2ec",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-wa-737753b6",
    "status": "acknowledged",
    "title": "Elasticsearch controller — orchestration: errors and warnings observed",
    "summary": "Elasticsearch controller is emitting warning/error logs at a stationary rate, confirmed active as of 19:10Z. The specific error signature is not yet identified due to field projection limitations. No confirmed exposed downstream services or user impact. Review controller logs directly to extract the specific warning/error message and assess whether reconciliation is failing.",
    "criticality": 30,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Extract the specific error/warning message from the elasticsearch-controller: kubectl logs -n elastic-system -l app.kubernetes.io/name=elasticsearch-controller --tail=50 | grep -E 'error|warning|Error|Warning'",
      "Check for any Elasticsearch cluster reconciliation failures: kubectl get elasticsearch -A and kubectl describe elasticsearch <name> -n <namespace> to review status conditions",
      "Review recent controller events for reconciliation errors: kubectl get events -n elastic-system --field-selector reason=ReconciliationError --sort-by='.lastTimestamp'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "ad959c89-0fcd-4e9e-906e-5039b7e6a576",
    "timestamp": "2026-07-16T19:15:26.102Z",
    "created_at": "2026-07-16T19:15:26.102Z",
    "discovery_id": "237c6d35-480a-4de5-a8ae-013ac00593ac",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-3c83a8a7",
    "status": "acknowledged",
    "title": "UIAM — authentication via proxy: request failures",
    "summary": "UIAM authentication via proxy is experiencing ongoing request failures (HTTP 4xx/5xx on *_authenticate* paths), confirmed active as of 19:12Z. The failure mechanism (UIAM/IdP vs proxy backend) is not yet identified due to missing error body content. No confirmed exposed downstream dependency edges. Investigate proxy logs for specific status codes and upstream error details to identify the failing component.",
    "criticality": 55,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Extract the specific HTTP status code and error body for failing authenticate requests: kubectl logs -n <proxy-namespace> <proxy-pod> | grep -E '_authenticate.*[45][0-9][0-9]' to identify whether failures are 401/403 (auth) or 502/503 (upstream)",
      "Check UIAM service health and recent deployments: kubectl get pods -n uiam -l app.kubernetes.io/role=uiam-external and kubectl rollout history deployment/uiam-external -n uiam",
      "If UIAM pods are crashing or restarting, check pod events and logs: kubectl describe pod -n uiam -l app.kubernetes.io/role=uiam-external and kubectl logs -n uiam -l app.kubernetes.io/role=uiam-external --tail=100"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "1c478824-3d3d-4e66-ba19-963fbffcccb3",
    "timestamp": "2026-07-16T19:14:48.766Z",
    "created_at": "2026-07-16T19:14:48.766Z",
    "discovery_id": "51229487-2f6a-4821-81e4-e817b58168ca",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connect-call-failed-22-8a646d10",
    "status": "acknowledged",
    "title": "Connectors — SSH transport: connection failures",
    "summary": "Connectors SSH transport is experiencing ongoing connection failures (Connect call failed, error 22) in agentless logs. Affects connector tasks that depend on SSH connectivity; no exposed downstream services identified. Failures are stationary (flat rate, no recovery), confirmed active as of 19:12Z. Investigate the failing connector target(s) to determine whether the issue is network reachability, authentication, or client-side configuration.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the failing connector by filtering agentless logs for error.message containing 'Connect call failed' and label connector_id, then check the connector's SSH target host reachability: kubectl exec -n <connector-namespace> <connector-pod> -- nc -zv <target-host> 22",
      "Verify SSH credentials and key configuration for the affected connector in Kibana Connectors UI: navigate to Stack Management > Connectors, locate the failing connector by ID, and re-test the connection",
      "If the target host is unreachable, check network policy and firewall rules for the agentless pod namespace: kubectl get networkpolicy -n <connector-namespace> and confirm egress to the SSH target is permitted"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "fee500c8-5fb1-401f-b72b-64e497636558",
    "timestamp": "2026-07-16T19:14:47.876Z",
    "created_at": "2026-07-16T19:14:47.876Z",
    "discovery_id": "8caf90d5-b027-408e-9369-b5a3a6e4106c",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-output-write-latency-degr-55e16c43",
    "status": "acknowledged",
    "title": "Agentless output — libbeat pipeline: write latency elevated",
    "summary": "Agentless libbeat output pipeline is experiencing elevated write latency (p99 > 5000ms), confirmed active as of 19:12Z. Write errors are absent (0 rows), indicating backpressure rather than hard failures. Affects timeliness of agentless data delivery to Elasticsearch. No exposed downstream services identified. Check Elasticsearch output backpressure and queue depth for the agentless libbeat pipeline.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Write Errors",
      "Libbeat Output Write Latency Spike"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Elasticsearch cluster health and indexing backpressure for the agentless output target: curl -s -u elastic:<password> https://<es-host>:9200/_cluster/health?pretty and review rejected_execution_count in thread pool stats",
      "Inspect libbeat pipeline queue depth and output metrics for the affected agentless pods: kubectl logs -n <agentless-namespace> <agentless-pod> | grep -E 'output.write.latency|queue.filled'",
      "If Elasticsearch is rejecting bulk requests, scale the indexing tier or reduce the libbeat output batch size by patching the agent policy output configuration in Fleet"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "54ffd721-1b6b-46e7-ab32-94c861accc44",
    "timestamp": "2026-07-16T18:57:38.468Z",
    "created_at": "2026-07-16T18:57:38.468Z",
    "discovery_id": "e1f4c4b3-e48c-4945-b299-df02e1e6485d",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-35a7b648",
    "status": "acknowledged",
    "title": "Agentless components — runtime startup: seccomp panic and FAILED-state churn",
    "summary": "Agentless components: Heartbeat/Synthetics and other units are crash-looping due to a seccomp policy conflict at startup. Affects agentless runtime in logging-gcp-us-central1. Multiple components (heartbeat, synthetics, cloudbeat) confirmed entering FAILED state as of 18:53Z; panic is ongoing. Roll back the Heartbeat/Synthetics component to stop the crash-loop.",
    "criticality": 50,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration",
      "Okta Developer Org Deactivated (E0000260)",
      "Connectors Service Type Not Configured",
      "GCP Invalid Credentials JSON in Cloudbeat",
      "Agentless Unit Spawn Fatal Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the Heartbeat/Synthetics component to the previous version to stop the seccomp panic crash-loop: `kubectl rollout undo deployment/<heartbeat-synthetics-deployment> -n <agentless-namespace>` — the panic is in beats v7@v7.0.0-alpha2.0.20260714222447-8f4bbab772a2 at seccomp.go:55",
      "If rollback is not immediately available, force-restart the affected agentless pods to clear the crash-loop state: `kubectl delete pod -l k8s.elastic.co/agentless-integration-name=elastic_security -n <agentless-namespace>` to allow the scheduler to reschedule with a clean state",
      "Investigate and fix the GCP invalid credentials JSON and AWS OTel missing credentials configuration for the affected agentless stacks by updating the integration policy credentials via Fleet: `curl -X PUT https://<kibana>/api/fleet/package_policies/<policy_id> -H 'kbn-xsrf: true' -d '{...corrected_credentials...}'`"
    ],
    "dependency_edges": [],
    "root_cause": "Heartbeat/Synthetics is crash-looping because a seccomp policy is already registered during startup, triggering a panic and causing repeated unit failures."
  },
  {
    "event_id": "a07d905f-4a8c-4c03-9575-a8e44ba73856",
    "timestamp": "2026-07-16T18:56:29.147Z",
    "created_at": "2026-07-16T18:56:29.147Z",
    "discovery_id": "ff71d5da-ee3e-4e42-a72d-1e0ff3fadc9a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-cb11b484",
    "status": "acknowledged",
    "title": "Agentless collector — ingestion pipeline: CEL failures and output read errors",
    "summary": "Agentless collector: CEL input failures (malformed URL / unsupported protocol scheme) and libbeat output read errors confirmed active as of 18:53Z. Affects agentless data collection pipeline in logging-gcp-us-central1. No exposed user-facing dependency edges; impact is bounded to agentless ingestion quality. Failures are stable/ongoing. Identify the failing CEL integration URL(s) and restore valid endpoint configuration.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure",
      "Libbeat Pipeline Active Events Near Queue Capacity",
      "Libbeat Output Read Errors",
      "Libbeat Output Write Errors",
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the failing CEL integration(s) by querying for error.message : 'unsupported protocol scheme' in logging-gcp-us-central1-logs-agentless-log-default and extract the input_source field to find the malformed URL; then update the integration policy via Fleet UI or API: `curl -X PUT https://<kibana>/api/fleet/package_policies/<policy_id> -H 'kbn-xsrf: true' -d '{...corrected_url...}'`",
      "Check libbeat output read errors by reviewing the agentless pod logs for the affected namespace: `kubectl logs -n <agentless-namespace> <agentless-pod> -c agentless | grep 'read error'` to identify the Elasticsearch output connectivity issue",
      "If the Libbeat pipeline queue is near capacity, restart the affected agentless pod to clear the backlog: `kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>`"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless collector is degrading because CEL input requests are failing due to malformed URLs (unsupported protocol scheme) while the Beats output is reporting read errors, causing ingestion instability."
  },
  {
    "event_id": "3354f135-67f4-452c-9eae-6d50b31c958e",
    "timestamp": "2026-07-16T18:34:52.014Z",
    "created_at": "2026-07-16T18:34:52.014Z",
    "discovery_id": "3f90aa51-d198-450d-b6cd-d81067f60d5f",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-e49485ca",
    "status": "acknowledged",
    "title": "Agentless OTel collector — awscredentialsprovider: missing credentials configuration",
    "summary": "Agentless OTel collector is in a crash-loop due to missing AWS credentials configuration. All AWS CloudWatch agentless inputs (ELB, RDS, SQS, EC2, ECS, Lambda) are blocked from collecting data. The collector exits immediately on startup with invalid configuration errors for the awscredentialsprovider extension across all 6 AWS service collectors. Failure confirmed still active at 18:29Z. Assign to the integration owner to supply valid AWS credentials or configure the default SDK credential chain in the agentless policy.",
    "criticality": 55,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat",
      "Component State Transitioned to FAILED (component.state)",
      "OTel Collector Invalid Configuration Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the awscredentialsprovider configuration for all affected AWS OTel collector instances: in the agentless integration configuration, either supply valid AWS credentials (access_key_id + secret_access_key), configure an IAM role via assume_role, or set a named profile — or remove the auth block entirely to use the default SDK credential chain.",
      "Identify affected agentless policies: `GET .fleet-agent-policies/_search` filtered by integration type containing 'aws_cloudwatch', then update each policy's AWS credentials in Kibana → Fleet → Agent Policies → [policy] → Edit integration.",
      "After updating credentials, force a policy re-deployment: `POST kbn:/api/fleet/agent_policies/<policy_id>/reassign` or trigger a re-enrollment of the affected agentless agents from Fleet UI to restart the OTel collector with the corrected configuration."
    ],
    "dependency_edges": [],
    "root_cause": "OTel collector is failing because the awscredentialsprovider extension has no usable credentials configured (credentials/assume_role/profile missing) for multiple AWS CloudWatch inputs (ELB, RDS, SQS, EC2, ECS, Lambda), causing configuration validation to fail and the collector to crash-loop."
  },
  {
    "event_id": "dbc2d0d0-d156-44db-9db7-691edb05b022",
    "timestamp": "2026-07-16T18:33:56.266Z",
    "created_at": "2026-07-16T18:33:56.266Z",
    "discovery_id": "42d75914-278f-48a5-b956-6644dc48627a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-service-type-not-configured-d2be8b5d",
    "status": "acknowledged",
    "title": "Connectors — configuration: service type missing",
    "summary": "A connector (connectors-py) is failing because its service type is not configured. The connector cannot start or run sync jobs until the configuration is completed. The error is still active as of 18:29Z. Assign to the connector owner to set the service type in the connector configuration.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the misconfigured connector: `GET .elastic-connectors/_search` filtered by `service_type: null` or empty, then set the service type in Kibana → Search → Connectors → [connector] → Edit configuration.",
      "After setting the service type, trigger a full sync from Kibana → Search → Connectors → [connector] → Sync to verify the connector starts successfully.",
      "If the connector was deployed via API, update it: `PUT .elastic-connectors/_doc/<connector_id>` with `{\"service_type\": \"<correct_type>\"}` and restart the connector process."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors are failing because the connector configuration is missing the required service type, preventing the connector from starting or running jobs."
  },
  {
    "event_id": "2fa77dfa-0128-414d-a800-16ef8650252d",
    "timestamp": "2026-07-16T18:31:03.984Z",
    "created_at": "2026-07-16T18:31:03.984Z",
    "discovery_id": "890affcb-eac7-42a7-922d-1da66becef9b",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-python-client-api-retry-error-35376e66",
    "status": "acknowledged",
    "title": "Connectors — backend API: client retries and errors",
    "summary": "Connectors (connectors-py) are encountering repeated Elasticsearch API errors (404) causing client retries. Sync jobs for affected connectors may be delayed or failing. The most recent failure was observed at 18:29Z. Assign to the connector owner to identify the missing index or misconfigured API target and restore it.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Python Client API Retry Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected connector index by checking: `GET .elastic-connectors/_search` filtered by `status: error` to find which connector's target index is missing or inaccessible.",
      "Recreate or restore the missing target index: `PUT /<connector-index-name>` with the appropriate mapping, then trigger a full sync from Kibana → Search → Connectors → [connector] → Sync.",
      "If the 404 is transient, restart the connector service: `kubectl rollout restart deployment/elastic-connectors -n <namespace>` to clear the retry backoff state."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors are failing because the Elasticsearch client is receiving 404 API errors on the 'refresh' method, causing repeated retry attempts and preventing sync job completion."
  },
  {
    "event_id": "89121e47-6472-435c-be90-21894c45a252",
    "timestamp": "2026-07-16T18:31:03.968Z",
    "created_at": "2026-07-16T18:31:03.968Z",
    "discovery_id": "05f27b1c-8879-4fa9-aa19-9e2e9da0e74a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-retryable-http-request-failures-23ba08b5",
    "status": "acknowledged",
    "title": "Agentless HTTPJSON integrations — authentication: oauth token failures",
    "summary": "Agentless HTTPJSON integrations are failing to collect data due to OAuth authentication errors. Affected integrations include M365 Defender (Azure AD invalid_client) and at least one other integration returning 403 Forbidden on token fetch. All three detection rules remain active as of 18:29Z. Retryable HTTP request failures are ongoing. Assign to the integration owner to correct OAuth credentials/app registration; no platform-level workaround is available until credentials are fixed.",
    "criticality": 50,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden",
      "M365 Defender Azure AD OAuth invalid_client",
      "HTTPJSON Retryable HTTP Request Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected integration(s) by running: `GET .fleet-agents/_search` filtered by `policy_id` and cross-referencing the agentless log stream for the failing oauth2 client_id, then update the OAuth client secret in Kibana → Stack Management → Integrations → [affected integration] → Edit.",
      "For M365 Defender: re-register or rotate the Azure AD app client secret in Azure Portal → App Registrations → [app] → Certificates & Secrets, then update the secret value in the Elastic integration configuration.",
      "If the 403 is due to expired credentials, re-authorize the OAuth app and restart the agentless integration via: `POST kbn:/api/fleet/agent_policies/<policy_id>/reassign` or redeploy the agentless policy from Fleet UI."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless HTTPJSON integrations are failing because upstream OAuth/token requests are being rejected (403 Forbidden and invalid_client), causing repeated outbound request failures and preventing data collection."
  },
  {
    "event_id": "39d77882-e0b8-4860-9a75-46ae752fbd7e",
    "timestamp": "2026-07-16T18:18:51.711Z",
    "created_at": "2026-07-16T18:18:51.711Z",
    "discovery_id": "a526cb8c-1738-4a82-903a-6bf94fecfd99",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-1cc22097",
    "status": "acknowledged",
    "title": "Agentless components — runtime startup: panic and FAILED-state churn",
    "summary": "Agentless components are crashing on every spawn attempt with a seccomp policy registration panic, causing continuous FAILED-state churn across heartbeat/synthetics units. All agentless data collection and export is disrupted for affected units. Confirmed still active at 18:16Z. Assign to the team managing agentless infrastructure to investigate the seccomp policy conflict and stabilize unit lifecycle.",
    "criticality": 70,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Go Panic in Agentless Component",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat",
      "Libbeat Output Write Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the elastic-agent version deployed to the agentless environment and roll back to the previous stable version if this panic was introduced by a recent deployment: `kubectl rollout undo deployment/elastic-agent -n elastic-agent` or equivalent Fleet policy rollback.",
      "Inspect the agentless component startup sequence for duplicate seccomp policy registration — the panic occurs in heartbeat/security.InitializeModule(); disable or deduplicate the seccomp policy registration in the affected unit's configuration if a config flag is available.",
      "Restart the affected agentless units to clear the FAILED-state churn while the root cause is investigated: use Fleet UI to unenroll and re-enroll the affected agentless integration policies, or `elastic-agent restart` on the host."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless component is failing because it panics during startup due to a seccomp policy already being registered, leading to FAILED-state churn in units."
  },
  {
    "event_id": "5505bf5a-596b-4751-90fc-1556f3b5ca8d",
    "timestamp": "2026-07-16T18:17:39.989Z",
    "created_at": "2026-07-16T18:17:39.989Z",
    "discovery_id": "daf4d8e0-bf99-4620-a121-2134f40e4dba",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-775715a8",
    "status": "acknowledged",
    "title": "O365 DLP — subscription start: permission denied (AF10001)",
    "summary": "O365 DLP audit ingestion is failing with AF10001 (401 Unauthorized) on every subscription start attempt for the DLP.All content type. The configured app identity lacks the required permissions, blocking all DLP audit event collection for affected tenants. Confirmed still active at 18:15Z. Assign to the team managing O365 app registrations to update consent/permissions.",
    "criticality": 55,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In Azure AD, navigate to the app registration used by the O365 audit integration and grant the ActivityFeed.Read (or equivalent DLP.All) API permission, then re-run admin consent: `az ad app permission grant --id <app-id> --api <office365-api-id> --scope ActivityFeed.Read`",
      "Restart the agentless O365 audit collector unit to force a fresh subscription start attempt after permissions are updated: `elastic-agent diagnostics` then redeploy the affected integration policy via Fleet UI or `elastic-agent enroll --force`",
      "Verify the integration's configured identity (service principal / OAuth client) has the correct tenant-level admin consent by checking the Enterprise Applications blade in Azure AD for the app's granted permissions."
    ],
    "dependency_edges": [],
    "root_cause": "O365 DLP audit collection is failing because the configured app/identity lacks the required permissions to start DLP.All subscriptions (AF10001, 401 Unauthorized)."
  },
  {
    "event_id": "29fd7069-6a76-463f-bbe1-7b44a7954690",
    "timestamp": "2026-07-16T17:55:32.230Z",
    "created_at": "2026-07-16T17:55:32.230Z",
    "discovery_id": "5c472f88-c813-43df-92dd-bc72793901cc",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__seccomp-policy-conflict-in-heartbeat-syn-eafe2c59",
    "status": "acknowledged",
    "title": "Heartbeat/Synthetics — startup/runtime: seccomp policy conflict panic",
    "summary": "Heartbeat/Synthetics component is crash-looping due to a duplicate seccomp policy registration panic (heartbeat/security/seccomp.go:290). Affects agentless Heartbeat/Synthetics workloads in logging-gcp-us-central1, preventing synthetic monitoring checks from running. Panic confirmed ongoing since 2026-07-16T15:30Z with the most recent crash at 17:52Z. Pin the Heartbeat component to a stable image version or disable the affected deployment to stop the crash loop while a fix is prepared.",
    "criticality": 50,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected Heartbeat/Synthetics pods and check for duplicate seccomp policy registration: kubectl get pods -n <agentless-namespace> -l component=heartbeat --field-selector=status.phase=Running and review the OTel manager logs for the crash-loop pattern.",
      "Pin the Heartbeat component to a known-good image version that does not have the duplicate seccomp registration: kubectl set image deployment/<heartbeat-deployment> heartbeat=docker.elastic.co/beats/heartbeat:<stable-version> -n <namespace>.",
      "If a rollback is not immediately available, disable the affected Heartbeat/Synthetics agentless integration temporarily to stop the crash loop: kubectl scale deployment <heartbeat-agentless-deployment> -n <namespace> --replicas=0 and file a bug against beats v7@v7.0.0-alpha2.0.20260714222447-8f4bbab772a2 heartbeat/security/seccomp.go:290."
    ],
    "dependency_edges": [],
    "root_cause": "Heartbeat/Synthetics component is crash-looping because MustRegisterPolicy in libbeat/common/seccomp is called twice during initialization (heartbeat/security/seccomp.go:290), triggering a panic on the second registration."
  },
  {
    "event_id": "ae069fd4-c1e2-4db8-a0b7-bcf89d9c3960",
    "timestamp": "2026-07-16T17:54:03.586Z",
    "created_at": "2026-07-16T17:54:03.586Z",
    "discovery_id": "eb6837d4-16e5-4221-8480-77ac1f0231c3",
    "discovery_slug": "otel-default__tool-call-key-missing-in-llm-response-ch-e479442b",
    "status": "acknowledged",
    "title": "Agent Builder — tool invocation: missing tool-call key exceptions",
    "summary": "Agent Builder is throwing repeated exceptions during tool invocation because LLM response chunks are missing the required tool-call key. The issue affects Agent Builder workloads on logs-agent_builder.otel-default and has been ongoing since 2026-07-16T15:30Z, with the most recent exception confirmed at 17:36Z. No exposed dependency edges; blast radius is limited to Agent Builder tool-call execution paths. Validate LLM response schema handling in the inference plugin and ensure the tool-call key is consistently emitted by the upstream LLM provider.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool call key missing in LLM response chunk"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the upstream LLM provider (inference entity .openai-gpt-5.2-chat_completion) for known issues with tool-call key emission: review provider status page and recent API changelog for streaming response format changes.",
      "In Kibana Agent Builder plugin, add a defensive null-check in /usr/share/kibana/node_modules/@kbn/inference-plugin/server/chat_complete/utils/merge_chunks.js around the tool-call key access to prevent hard exceptions on malformed chunks.",
      "If the LLM provider is confirmed as the source, rotate or switch the inference entity configuration: kubectl edit configmap kibana-config -n <namespace> and update the inference entity endpoint or model version."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "4989f110-e3a1-45e2-a085-84a8f4832879",
    "timestamp": "2026-07-16T17:54:03.575Z",
    "created_at": "2026-07-16T17:54:03.575Z",
    "discovery_id": "0ca80b39-69d3-4b68-89f1-af191b610a82",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-notion-api-response-error-ff8e8e3e",
    "status": "acknowledged",
    "title": "Connectors — Notion API: invalid token errors",
    "summary": "Connectors Notion integration is failing API calls due to an invalid API token, causing APIResponseError on every connection attempt. Affects Notion source syncs in logging-gcp-us-central1 for connectors using this token. Errors confirmed ongoing since 2026-07-16T15:30Z with the most recent failure at 17:52Z. No exposed dependency edges; blast radius is limited to Notion connector sync jobs. Replace or rotate the Notion API token and revalidate the connector configuration to restore syncs.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate or replace the Notion API token: in Kibana, navigate to Search > Connectors, locate the failing Notion connector, and update the API token under connector configuration.",
      "Trigger a manual sync test after token rotation to confirm the APIResponseError is resolved: use the Kibana Connectors UI 'Test connection' button or POST /_connector/<connector_id>/_check_in via the Elasticsearch API.",
      "If the token was recently revoked or expired, check the Notion workspace integration settings at https://www.notion.so/my-integrations and regenerate the internal integration token."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "6fcb9cdd-072a-4e19-98de-0b78ec1c509c",
    "timestamp": "2026-07-16T17:29:24.345Z",
    "created_at": "2026-07-16T17:29:24.345Z",
    "discovery_id": "fe83cc35-54d3-4373-b16b-877211290358",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-pipeline-active-events-near-queu-3a82023e",
    "status": "acknowledged",
    "title": "Agentless log shipping — libbeat pipeline: queue near capacity",
    "summary": "Agentless log shipping libbeat pipeline queue near-capacity trend was detected in GCP us-central1. Queue filled pct > 0 was last confirmed at 2026-07-16T15:40:37Z (~1.5h stale); current state is unclear. Stream is alive. This may be a downstream effect of the agentless component crash loops (seccomp panic, credential failures). No exposed dependency edges. Monitor queue depth and check whether resolving the agentless component crashes relieves the pressure.",
    "criticality": 40,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Pipeline Active Events Near Queue Capacity"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check current libbeat pipeline queue depth on the agentless log shipper: `kubectl exec -n agentless <agentless-pod> -- curl -s http://localhost:5066/stats | jq '.libbeat.pipeline.queue'` and confirm whether active events are still near capacity.",
      "If queue is still near capacity, check the output target (Elasticsearch) for indexing backpressure: `kubectl logs -n agentless <agentless-pod> --since=30m | grep -E 'queue|backpressure|output'`.",
      "If the queue pressure is caused by the agentless component crash loops (D1), resolving the seccomp panic and credential issues will likely relieve the queue pressure as well."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "d23b020e-e522-4f91-9661-bca3bed7ce45",
    "timestamp": "2026-07-16T16:47:48.113Z",
    "created_at": "2026-07-16T16:47:48.113Z",
    "discovery_id": "420a4e78-02b1-4eac-b7e1-78bd5aef9a4c",
    "discovery_slug": "otel-default__tool-argument-validation-failure-5f368625",
    "status": "acknowledged",
    "title": "Agent Builder — tool-call handling: malformed tool calls cause agent failures",
    "summary": "Agent Builder is experiencing persistent failures due to malformed LLM tool-call payloads: missing tool-call keys and schema-invalid tool arguments are causing inference-plugin exceptions and agent run failures. Both error types confirmed active — toolValidationError as recently as 2026-07-16T16:03Z, tool-call-key-missing last at 14:32Z (spike may be subsiding). No exposed downstream services. Identify the LLM connector/model producing malformed outputs and roll back or switch to a stable model version.",
    "criticality": 75,
    "confidence": 0.65,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool call key missing in LLM response chunk",
      "Tool argument validation failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check which LLM connector/model is producing malformed tool-call payloads and switch to a stable model version: navigate to Kibana → Stack Management → AI Connectors and inspect the active connector for agent-builder; if a recent model version was deployed, roll back via the connector settings",
      "Add input validation/sanitization for tool-call payloads in the inference plugin to prevent agent crashes on malformed chunks: kubectl set env deployment/kibana -n kibana INFERENCE_TOOL_CALL_STRICT_VALIDATION=false (temporary mitigation to skip invalid chunks rather than throw)",
      "Monitor the toolValidationError rate to confirm whether the spike is subsiding: kubectl logs -n kibana -l app=kibana --since=30m | grep -c toolValidationError"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "e3a7228f-baa5-462f-8ad6-65e373b253ae",
    "timestamp": "2026-07-16T16:46:40.021Z",
    "created_at": "2026-07-16T16:46:40.021Z",
    "discovery_id": "e6b9884d-22ec-48cb-bb6f-0655f458a930",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-8a51d7f4",
    "status": "acknowledged",
    "title": "Cloudbeat CSPM — GCP credentials: invalid credentials JSON prevents startup",
    "summary": "Cloudbeat CSPM is failing to start on GCP us-central1 due to invalid credentials JSON, preventing all GCP CSPM scanning for the affected agentless integration. The launcher crashes on every startup attempt. Failure confirmed from 2026-07-16T00:00Z and still active at 2026-07-16T16:45Z. Immediate action: replace the GCP service account credentials JSON in the Fleet integration configuration.",
    "criticality": 60,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate/replace the GCP credentials JSON for the affected Cloudbeat CSPM integration: navigate to Fleet → Integrations → Cloud Security Posture → GCP and re-enter valid service account credentials JSON",
      "Verify the service account JSON is well-formed and has the required CSPM permissions: cat <credentials-file>.json | python3 -m json.tool",
      "After updating credentials, force a restart of the Cloudbeat agentless pod: kubectl rollout restart deployment/cloudbeat-cspm -n agentless"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "bb94a113-ceb6-4b38-bd45-23f2cc71c1fa",
    "timestamp": "2026-07-16T16:46:18.829Z",
    "created_at": "2026-07-16T16:46:18.829Z",
    "discovery_id": "ce568c41-1ddc-4576-b592-e041f363d5d1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-read-errors-9b186da1",
    "status": "acknowledged",
    "title": "Agentless beats — output pipeline: output read errors",
    "summary": "Agentless beats output pipeline is producing sustained libbeat read errors on the GCP us-central1 agentless log stream. The failure is internal to the log-shipping pipeline with no exposed downstream services. Errors confirmed from 2026-07-16T00:01Z and still active at 2026-07-16T16:45Z. Review output connectivity and backpressure for the agentless beats pipeline; check for upstream output target availability.",
    "criticality": 30,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Read Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless beats output target connectivity: kubectl logs -n agentless -l app=agentless-beats --tail=100 | grep -i 'read error'",
      "Inspect libbeat output configuration for the agentless pipeline: kubectl get configmap -n agentless agentless-beats-config -o yaml | grep -A10 output",
      "If output target is unreachable, restart the agentless beats pod: kubectl rollout restart deployment/agentless-beats -n agentless"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "a1bc45ea-b640-416c-9c77-470cc8937641",
    "timestamp": "2026-07-16T16:36:45.284Z",
    "created_at": "2026-07-16T16:36:45.284Z",
    "discovery_id": "8959fe18-f99a-460b-82d8-6b9741c8e592",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__namespace-already-exists-during-provisio-f392cee0",
    "status": "acknowledged",
    "title": "Agentless provisioning — namespace creation: namespace already exists",
    "summary": "Agentless provisioning: namespace creation is failing with \\\"Namespace already exists\\\" conflicts in logging-gcp-us-central1. Provisioning flows that attempt to create Kubernetes namespaces for new deployments are affected. Failure confirmed active as of 2026-07-16T16:21:51Z with a stationary signal (p=0) indicating a persistent, ongoing condition. Identify the conflicting namespace and reconcile desired vs existing state in the provisioning controller.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Namespace Already Exists During Provisioning"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the conflicting namespace: run `kubectl get namespace -l k8s.elastic.co/project-type --all-namespaces` on the affected GKE cluster to list existing project namespaces and find the duplicate.",
      "Reconcile desired vs existing state in the agentless-api provisioning controller: check the agentless-api deployment logs for the specific namespace name and verify whether the namespace was orphaned from a prior failed deployment — if so, delete the stale namespace with `kubectl delete namespace <namespace-name>` after confirming no active workloads.",
      "If the provisioning controller does not handle pre-existing namespaces gracefully, apply an idempotent namespace creation patch (use `kubectl apply` instead of `kubectl create`) or file a bug against the agentless-api provisioning workflow."
    ],
    "dependency_edges": [],
    "root_cause": "Provisioning is failing because the workflow is attempting to create a Kubernetes namespace that already exists, causing namespace-creation operations to error out."
  },
  {
    "event_id": "c337fba0-9ec6-4428-9f61-af3cd2ebe392",
    "timestamp": "2026-07-16T16:36:19.023Z",
    "created_at": "2026-07-16T16:36:19.023Z",
    "discovery_id": "ca7a54bf-9a91-41e4-a404-d582928b3f29",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-847e7126",
    "status": "acknowledged",
    "title": "Agentless integrations — OAuth token fetch: 403 Forbidden",
    "summary": "Agentless integrations: OAuth token fetch requests are being rejected with 403 Forbidden by the upstream identity provider. Tenants using OAuth-backed integrations in logging-gcp-us-central1 are affected — ingestion for those integrations is blocked. Failure confirmed active as of 2026-07-16T16:35:19Z with a trend_change signal (p=0.000117). Verify upstream provider org/app credentials and check for revoked OAuth app permissions or expired client secrets.",
    "criticality": 55,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the OAuth app credentials for affected integrations: verify client_id/client_secret are valid and not expired via the upstream provider's admin console (e.g. for 1Password: `op connect server list`; for GitHub: review OAuth app settings at https://github.com/settings/applications).",
      "Rotate or re-authorize the OAuth credentials for the affected integration policy in Fleet: navigate to Fleet → Agent Policies → [affected policy] → Integration settings → re-enter OAuth credentials and save.",
      "If credentials are valid, check upstream provider org-level access restrictions or IP allowlists that may be blocking the agentless egress IPs for GCP us-central1."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless integration polling is failing because the upstream identity provider rejects OAuth token fetch requests with 403 Forbidden."
  },
  {
    "event_id": "e6567d3b-1c3f-4655-9717-02fb96d2b052",
    "timestamp": "2026-07-16T16:26:08.117Z",
    "created_at": "2026-07-16T16:26:08.117Z",
    "discovery_id": "7c0ba55e-28b8-4a23-ba70-6164696b32dd",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-ef182917",
    "status": "acknowledged",
    "title": "Agentless log collection — collector runtime: component unit FAILED / missing AWS credentials",
    "summary": "Agentless log collection is actively failing in logging-gcp-us-central1 due to a missing AWS credentials configuration. An AWS OTel Collector instance is missing credentials/assume_role/profile for 9 AWS service collectors (ELB, EC2, SQS, Lambda, ECS, RDS, and variants), causing the collector to exit and component units to enter FAILED state. Both rules confirmed active within seconds of this review. No exposed user-facing services are directly affected, but AWS telemetry collection is completely blocked for the affected agentless deployment. Apply the correct AWS credentials configuration to the affected agentless policy immediately.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected agentless deployment and inspect its AWS credentials configuration: kubectl get agentlesspolicies -A -o yaml | grep -A5 'aws\\|credentials\\|assume_role' to find the policy missing credentials/assume_role/profile",
      "Apply the correct AWS credentials configuration to the affected agentless policy — set at least one of: credentials (access key/secret), assume_role (IAM role ARN), or profile (named profile): kubectl patch agentlesspolicy <name> -n <namespace> --type=merge -p '{\"spec\":{\"aws\":{\"assume_role\":{\"arn\":\"<role-arn>\"}}}}' ",
      "Restart the affected agentless collector pod to pick up the corrected configuration: kubectl delete pod -n agentless -l agentless.id=0a105cde-521e-46d2-9e56-9b825baa61e6 to force a fresh start with corrected credentials"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless log ingestion is failing because an AWS OTel Collector instance (agentless ID 0a105cde-521e-46d2-9e56-9b825baa61e6) is missing credentials configuration — at least one of credentials, assume_role, or profile must be set for 9 AWS service collectors — causing the collector to exit and the component unit to enter FAILED state."
  },
  {
    "event_id": "06fc09c8-9be7-4661-aacf-6d11a08d2204",
    "timestamp": "2026-07-16T16:24:30.162Z",
    "created_at": "2026-07-16T16:24:30.162Z",
    "discovery_id": "7c5e98d1-c4bb-4efe-b051-d8d07744a50b",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__failed-to-list-agentless-configs-f2909291",
    "status": "acknowledged",
    "title": "Agentless API — handler: HTTP errors impacting liveness and config listing",
    "summary": "Agentless API is experiencing HTTP errors from its request handlers, affecting liveness checks, config listing, and k8s client health checks in logging-gcp-us-central1. Four rules spiked simultaneously (p=0), confirming a real incident. However, the most recent error rows across all four rules are timestamped 2026-07-16T13:46:40Z — approximately 2.5 hours before this review — suggesting the spike may have subsided. No exposed user-facing dependency edges are present. Monitor for recurrence and investigate the upstream HTTP dependency invoked by handler/handler.go to prevent future spikes.",
    "criticality": 55,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Go Stack Trace in Agentless API",
      "Failed to List Agentless Configs",
      "Liveness Check HTTP Error",
      "K8s Client Check Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless-api pod logs for the upstream HTTP dependency: kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --since=3h | grep -E 'HTTP error|handler.go' to identify the failing upstream target",
      "Verify k8s client connectivity from agentless-api pods: kubectl exec -n agentless-api <pod> -- curl -sk https://kubernetes.default.svc/healthz to confirm k8s API server reachability",
      "If liveness checks are still failing and pods are being restarted, cordon affected nodes and force a rolling restart: kubectl rollout restart deployment/agentless-api -n agentless-api"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless API is failing because its request handlers are encountering upstream HTTP errors (\"HTTP error\" logged from handler/handler.go), which is breaking liveness checks and config listing operations."
  },
  {
    "event_id": "42911235-daf8-40db-a245-2f2ee6e04b2c",
    "timestamp": "2026-07-16T16:20:34.573Z",
    "created_at": "2026-07-16T16:20:34.573Z",
    "discovery_id": "760a8f7a-ec58-4f80-add8-feddf09efd00",
    "discovery_slug": "otel-default__tool-argument-validation-failure-5e881675",
    "status": "acknowledged",
    "title": "Agent Builder — tool execution: argument validation failures",
    "summary": "Agent Builder tool execution is experiencing an increasing rate of argument validation failures (toolValidationError exceptions) in logs-agent_builder.otel-default. The trend is ongoing — most recent error confirmed at 2026-07-16T16:03:10Z. Impact is limited to internal Agent Builder tool execution paths; no exposed user-facing services are affected. Identify the specific tool(s) and calling path producing invalid arguments and correct the request/contract.",
    "criticality": 25,
    "confidence": 0.55,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool argument validation failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify which tools and calling paths are producing invalid arguments: query logs-agent_builder.otel-default for toolValidationError with attributes.exception.message to find the specific tool name and argument contract violation",
      "Review recent Agent Builder deployments or tool schema changes that may have introduced argument contract mismatches: kubectl rollout history deployment/agent-builder -n <namespace>",
      "If a specific tool is identified as the source, patch its argument schema or the calling path: kubectl set env deployment/agent-builder -n <namespace> TOOL_VALIDATION_STRICT=false as a temporary mitigation while the fix is prepared"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "2c070096-264f-4371-9f7e-9374eb5ebd6d",
    "timestamp": "2026-07-16T15:53:13.945Z",
    "created_at": "2026-07-16T15:53:13.945Z",
    "discovery_id": "b674b71c-1f8f-45e5-a028-f6621bd38d13",
    "discovery_slug": "logging-gcp-us-central1-logs-all__zwischending-s3-proxy-errors-3c66f1fc",
    "status": "acknowledged",
    "title": "Zwischending — S3 proxy: proxy errors",
    "summary": "Zwischending S3 proxy: stationary error signal detected in the logging-gcp-us-central1-logs-all stream. The stream index is currently inaccessible (unknown index error), creating a telemetry gap — active failure cannot be confirmed or ruled out. No exposed downstream services identified. Monitor stream availability and validate S3 proxy logs for upstream connectivity or auth failures when access is restored.",
    "criticality": 30,
    "confidence": 0.25,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Zwischending S3 Proxy Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify stream index availability: check GCP logging pipeline health for logging-gcp-us-central1-logs-all and confirm the index is ingesting data (kubectl get pods -n logging-gcp-us-central1 -l app=log-forwarder)",
      "Once stream access is restored, query for S3 proxy errors: check recent logs for upstream connectivity or auth failures in the Zwischending S3 proxy service",
      "If stream is confirmed down, escalate to the logging infrastructure team to restore the GCP log export pipeline"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "b5660df6-6038-477d-aa5c-6dedd7101f07",
    "timestamp": "2026-07-16T15:52:39.244Z",
    "created_at": "2026-07-16T15:52:39.244Z",
    "discovery_id": "aabf0967-a85e-4aa7-9c06-8887f262e47b",
    "discovery_slug": "otel-default__agent-execution-error-in-researchagent-w-f4881b70",
    "status": "acknowledged",
    "title": "Agent Builder — workflows: execution/validation errors",
    "summary": "Agent Builder: stationary signals on tool argument validation failures and researchAgent workflow execution errors. Stream has historical data (383 rows over prior 2 days) but 0 rows since the detection timestamp — stream went quiet. No KI-backed queries available; active failure cannot be confirmed. Monitor for resumption of log ingestion and validate agent workflow health.",
    "criticality": 25,
    "confidence": 0.25,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool argument validation failure",
      "Agent execution error in researchAgent workflow"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Agent Builder service health and log pipeline: kubectl get pods -n agent-builder -l app=agent-builder and verify log forwarder is running",
      "Query recent agent_builder logs directly: kubectl logs -n agent-builder -l app=agent-builder --since=1h | grep -E 'validation|error|researchAgent'",
      "If stream resumes ingesting, re-evaluate for active tool argument validation or researchAgent execution errors and escalate if confirmed"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "978744f4-e365-49de-af6e-778091137156",
    "timestamp": "2026-07-16T14:55:14.073Z",
    "created_at": "2026-07-16T14:55:14.073Z",
    "discovery_id": "532e737b-adab-4128-8a66-bf59bf87cf3b",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-component-meta-file-corruption-e1896a30",
    "status": "acknowledged",
    "title": "Agentless HTTPJSON — state: meta file corruption",
    "summary": "Agentless HTTPJSON: meta file corruption errors detected, causing ingestion failures for affected HTTPJSON inputs. Evidence collected at 05:25Z confirms corruption was present; distribution change signal is weak (p=0.0079). Affected HTTPJSON inputs may stop or repeatedly fail, causing missing ingestion for impacted integrations. Criticality downgraded from 80 to 45 due to weak p-value and no exposed dependency edges. Immediate action: locate and remove the corrupted meta/state file and restart the affected HTTPJSON component.",
    "criticality": 45,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Component Meta File Corruption"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Locate and remediate the corrupted HTTPJSON meta/state file: kubectl exec -n agentless <httpjson-pod> -- find /agentless/data -name 'meta.json' -exec rm -f {} \\; to remove the corrupted state file and allow the component to reinitialize.",
      "Restart the affected HTTPJSON component after removing the corrupted file: kubectl rollout restart deployment/httpjson -n agentless and monitor with kubectl rollout status deployment/httpjson -n agentless.",
      "Investigate the root cause of the corruption: kubectl logs -n agentless -l component=httpjson --since=12h | grep -i 'corrupt\\|decode\\|invalid character' to identify the pattern and frequency of corruption events."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless HTTPJSON input is failing because its persisted meta/state file is corrupted, preventing the component from decoding or reading ingestion state and continuing collection."
  },
  {
    "event_id": "85a96c01-f3db-4a87-9f23-b788e79c3c05",
    "timestamp": "2026-07-16T14:54:46.500Z",
    "created_at": "2026-07-16T14:54:46.500Z",
    "discovery_id": "aeefe629-f306-4859-83b6-ea4297a60f2d",
    "discovery_slug": "logging-gcp-us-central1-logs-all__external-unauthorized-access-attempts-744755d9",
    "status": "acknowledged",
    "title": "Security telemetry — auth failures: signal dipped to silence",
    "summary": "Security monitoring: external unauthorized access attempt signal has dipped to silence. No auth-failure rows found in the current window. This may indicate authentication/security log ingestion has been interrupted rather than a genuine reduction in attack activity. Weak signal (p=0.0012); low criticality. Immediate action: verify authentication log ingestion pipeline is functioning correctly.",
    "criticality": 25,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "External Unauthorized Access Attempts"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify authentication/security log ingestion: kubectl logs -n logging -l app=log-forwarder --since=1h | grep -i 'authentication\\|auth\\|unauthorized' to confirm auth events are being forwarded.",
      "Check the authentication log source for recent changes: kubectl get configmap -n logging log-forwarder-config -o yaml | grep -i 'authentication\\|event.category' to confirm the filter is still active.",
      "If log ingestion is confirmed healthy and the dip is genuine, monitor for resumed attack activity: set up a temporary alert on authentication failure volume to detect any resurgence."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f5cedb8c-809d-49fc-89da-001fb2a7b866",
    "timestamp": "2026-07-16T14:52:32.069Z",
    "created_at": "2026-07-16T14:52:32.069Z",
    "discovery_id": "3c5b2aa8-b1a8-48fa-ad46-59be53b3e317",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-elasticsearch-refresh-api-404-3b8960b7",
    "status": "acknowledged",
    "title": "Connectors — refresh API: HTTP 404 on refresh",
    "summary": "Connectors: refresh calls are failing with HTTP 404 and retrying. The Elasticsearch Refresh API endpoint is returning 404, indicating the route is missing or misconfigured. Confirmed still active as of 14:49Z. Connector refresh operations are failing and retrying, potentially causing stale data or ingestion delays. Onset around 12:36Z; no sign of recovery. Immediate action: verify the refresh endpoint route and configuration for the connector's target cluster.",
    "criticality": 40,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Refresh API 404 Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify the Elasticsearch Refresh API endpoint is registered and reachable: curl -s -o /dev/null -w '%{http_code}' -X POST http://<es-host>:<port>/<index>/_refresh to confirm the route exists.",
      "Check the connector's target cluster configuration for the correct Elasticsearch host and index: kubectl get configmap -n agentless connectors-config -o yaml | grep -i refresh to identify any misconfigured endpoint.",
      "If the endpoint is missing due to a recent deployment, roll back the Elasticsearch or connector service: kubectl rollout undo deployment/connectors -n agentless and verify with kubectl rollout status deployment/connectors -n agentless."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors are failing to refresh because the Elasticsearch Refresh API endpoint they call is returning HTTP 404 (endpoint missing or route misconfigured), triggering client retries."
  },
  {
    "event_id": "87460347-e26b-4683-b29a-ed37e444cf41",
    "timestamp": "2026-07-16T14:52:05.007Z",
    "created_at": "2026-07-16T14:52:05.007Z",
    "discovery_id": "a8de1630-2443-494f-a3b0-43350f712549",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-failed-state-ab2ba670",
    "status": "acknowledged",
    "title": "Agentless component — runtime: panic causes unit failure",
    "summary": "Agentless component: Go process is panicking on a seccomp policy registration conflict, causing units to enter FAILED state (exit code 1). Both the panic and FAILED state confirmed still active as of 14:48–14:49Z. The panic originates in the heartbeat/seccomp module — a seccomp policy is being registered twice, likely introduced by a recent deployment. Agentless component workloads are down until restarted or rolled back. Immediate action: roll back the crashing agentless workload to the previous version.",
    "criticality": 55,
    "confidence": 0.78,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Go Panic in Agentless Component",
      "Agentless Component Entered FAILED State"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the crashing agentless workload and roll back to the previous version: kubectl rollout undo deployment/<agentless-component> -n agentless to revert the deployment that introduced the seccomp policy conflict.",
      "If rollback is not immediately possible, restart the crashing pods to clear the FAILED state: kubectl delete pod -n agentless -l app=<agentless-component> --force --grace-period=0 and monitor with kubectl get pods -n agentless -w.",
      "Investigate the seccomp policy registration conflict in the heartbeat module: check recent image tag changes with kubectl get deployment -n agentless -o jsonpath='{.spec.template.spec.containers[*].image}' and compare against the last known-good version."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless component is failing because its Go process panics on a seccomp policy registration conflict (MustRegisterPolicy called twice), causing the service unit to exit with code 1 (STOPPING→FAILED) and leaving the workload down until restarted or redeployed."
  },
  {
    "event_id": "4987cfbd-0ff7-43c4-a355-9fb179c26d19",
    "timestamp": "2026-07-16T14:51:34.916Z",
    "created_at": "2026-07-16T14:51:34.916Z",
    "discovery_id": "e6b15bb1-cd98-4090-85cc-d40b36b5a2a7",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-26638c60",
    "status": "acknowledged",
    "title": "Agentless collectors — auth config: missing credentials causes startup failure",
    "summary": "Agentless cloud collectors: both AWS OTel Collector and Cloudbeat/GCP are failing due to credential configuration errors. AWS OTel Collector is missing required credentials/assume_role/profile configuration; Cloudbeat is rejecting invalid GCP credentials JSON. Both failures confirmed still active as of 14:49Z. Affected agentless Cloudbeat/OTel cloud inputs cannot start, halting telemetry collection. Onset around 12:36Z; no sign of recovery. Immediate action: restore valid credential configuration for both collectors.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restore valid AWS credentials for the OTel Collector: kubectl edit secret -n agentless aws-otel-collector-credentials and set at least one of credentials, assume_role, or profile; then kubectl rollout restart deployment/aws-otel-collector -n agentless.",
      "Restore valid GCP credentials JSON for Cloudbeat: kubectl edit secret -n agentless cloudbeat-gcp-credentials and replace the invalid JSON value; then kubectl rollout restart deployment/cloudbeat -n agentless.",
      "Verify the credential secrets are correctly mounted: kubectl exec -n agentless <pod> -- env | grep -i cred and confirm the expected environment variables or file paths are populated before restarting."
    ],
    "dependency_edges": [],
    "root_cause": "Cloud input collectors are failing because their awscredentialsprovider configuration has no credentials/assume_role/profile set and Cloudbeat has invalid GCP credentials JSON, causing startup/config validation failures and preventing telemetry collection."
  },
  {
    "event_id": "c5fe7034-13d3-4bc6-9e1d-eeacb20ed460",
    "timestamp": "2026-07-16T14:51:01.956Z",
    "created_at": "2026-07-16T14:51:01.956Z",
    "discovery_id": "fa980504-0404-4e0d-8e04-d30bdd2ec3d3",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-ee856d47",
    "status": "acknowledged",
    "title": "UIAM — runtime: entropy source stuck",
    "summary": "UIAM: service-level errors are ongoing, with the most recent error logged at 14:44Z (just minutes ago). The working theory is that the entropy source is stuck, blocking cryptographic operations and causing WARN/ERROR log output. Callers of UIAM for identity/auth operations may experience failures. Onset around 12:54Z; no sign of recovery. Immediate action: check UIAM host entropy availability and restore the entropy source.",
    "criticality": 60,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM host entropy availability: kubectl exec -n uiam $(kubectl get pod -n uiam -l app=uiam -o jsonpath='{.items[0].metadata.name}') -- cat /proc/sys/kernel/random/entropy_avail to confirm entropy pool is depleted.",
      "If entropy is low, install or enable a hardware/software entropy source: kubectl exec -n uiam <pod> -- apt-get install -y haveged && systemctl start haveged, or configure the pod to use /dev/urandom instead of /dev/random.",
      "Restart UIAM pods after entropy is restored: kubectl rollout restart deployment/uiam -n uiam and monitor with kubectl rollout status deployment/uiam -n uiam."
    ],
    "dependency_edges": [],
    "root_cause": "UIAM is erroring because its entropy source is stuck, causing service-level warnings/errors and potential request failures until entropy generation is restored."
  },
  {
    "event_id": "41f00489-65c8-4d78-8178-893faa058a65",
    "timestamp": "2026-07-16T14:50:38.599Z",
    "created_at": "2026-07-16T14:50:38.599Z",
    "discovery_id": "4b6329c2-068b-46ad-9652-3d2126260523",
    "discovery_slug": "logging-gcp-us-central1-logs-all__docker-registry-error-level-failures-51be0d35",
    "status": "acknowledged",
    "title": "Docker registry — telemetry: error signal dipped to silence",
    "summary": "Docker registry: error-level failure signal has dipped to complete silence — zero docker-registry documents found in the logging stream since the detection window. This pattern is consistent with the docker-registry service being down or its logging pipeline failing, rather than a genuine recovery. Users or services depending on the docker registry may be unable to pull or push images. Immediate action: verify docker-registry service health and confirm log ingestion is functioning.",
    "criticality": 55,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Docker Registry Error-Level Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check docker-registry pod health: kubectl get pods -n docker-registry -o wide and kubectl describe pod -n docker-registry to identify crash loops or OOMKills.",
      "Verify log ingestion pipeline for docker-registry: kubectl logs -n logging -l app=log-forwarder --since=30m | grep docker-registry to confirm logs are being forwarded.",
      "If the service is down, restart it: kubectl rollout restart deployment/docker-registry -n docker-registry and monitor with kubectl rollout status deployment/docker-registry -n docker-registry."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "af67b662-e1c4-480b-97bf-aeb7a11e9e91",
    "timestamp": "2026-07-16T14:50:38.598Z",
    "created_at": "2026-07-16T14:50:38.598Z",
    "discovery_id": "d3058caf-8d77-4f93-8294-e6729ad0f5cb",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__namespace-already-exists-during-provisio-c068139d",
    "status": "acknowledged",
    "title": "Agentless API — provisioning/deployments: invalid request patterns and namespace collisions",
    "summary": "Agentless API: provisioning is experiencing namespace collision errors and unexpected HTTP methods on the deployments endpoint. Users attempting serverless provisioning may encounter failures when namespaces already exist. Two of three anomalous patterns confirmed still active as of 14:06Z; the unexpected stack/project type signal is inconclusive. Trend is upward across all three rules. Immediate action: investigate duplicate namespace creation logic and validate request routing to the deployments endpoint.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Unexpected User Stack Type or Project Type",
      "Namespace Already Exists During Provisioning",
      "Unexpected HTTP Method on Deployments Endpoint"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the provisioning service for duplicate namespace creation: kubectl logs -n agentless-api -l app=provisioning --since=1h | grep 'Namespace already exists' to identify affected namespaces and callers.",
      "Audit the deployments endpoint route configuration: kubectl get ingress -n agentless-api -o yaml | grep -A5 'deployments' to verify only GET methods are permitted and unexpected methods are being rejected or routed correctly.",
      "Review recent deployments or config changes to the agentless API provisioning service: kubectl rollout history deployment/agentless-api -n agentless-api and consider rollback if a recent change introduced the namespace collision logic."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "0dc85348-7fce-444a-a14a-a8213a1d28aa",
    "timestamp": "2026-07-16T14:36:06.195Z",
    "created_at": "2026-07-16T14:36:06.195Z",
    "discovery_id": "1cc23d80-07e2-48ab-9464-643be3a20ae7",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__app-secrets-or-config-object-creation-b1e42e37",
    "status": "acknowledged",
    "title": "Agentless API — provisioning workflow: namespace/secret/config signals shifted",
    "summary": "Agentless API (gcp us-central1): provisioning workflow showing distribution shift — namespace collision errors and config object creation activity confirmed active as of 14:20Z. Affects serverless project provisioning flows. Signal is credible (p_value=0.0016) but impact is bounded — no confirmed user-blocking path. Schedule investigation of namespace lifecycle and provisioning idempotency.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Namespace Already Exists During Provisioning",
      "App Secrets or Config Object Creation"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Review agentless-api provisioning logs for namespace collision frequency: kubectl logs -n agentless-api -l app.kubernetes.io/component=agentless --since=1h | grep -i 'namespace already exists'",
      "Check if namespace cleanup/deletion is completing before re-provisioning: kubectl get namespaces -A | grep project- | grep -v Active",
      "Review agentless-api deployment for idempotency issues in namespace creation logic: kubectl describe deployment agentless-api -n agentless-api"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "37c85f57-273c-4ebd-91e6-6bf95692908f",
    "timestamp": "2026-07-16T14:33:59.161Z",
    "created_at": "2026-07-16T14:33:59.161Z",
    "discovery_id": "d26551c2-eefc-4ff9-a57b-255ca8908283",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-failed-state-11cc2fd6",
    "status": "acknowledged",
    "title": "Agentless logging — component lifecycle: startup panic and FAILED state transitions",
    "summary": "Agentless logging (gcp us-central1): spawned components are crashing at startup with a seccomp policy double-registration panic, causing units and components to transition to FAILED. Cloudbeat is additionally failing due to missing GCP service account credentials. All 4 signals confirmed active as of 14:23Z — ongoing with no recovery. Affects agentless security posture (cloudbeat/cis_gcp) and synthetics components. Investigate seccomp panic in spawned beat and verify/repair GCP credentials immediately.",
    "criticality": 72,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Investigate seccomp double-registration panic in spawned beat/receiver: kubectl logs -n <agentless-namespace> -l component=agentless --since=30m | grep -E 'seccomp|panic|FAILED'",
      "Verify and repair GCP service account credentials for Cloudbeat: kubectl get secret -n <agentless-namespace> | grep gcp-credentials && kubectl describe secret <gcp-credentials-secret> -n <agentless-namespace>",
      "Restart affected agentless component pods to clear crash-loop state: kubectl rollout restart deployment/agentless -n <agentless-namespace>"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless managed components are failing because the spawned beat process panics during startup when registering seccomp policy ('a seccomp policy is already registered'), causing units to exit with code 1 and transition to FAILED; Cloudbeat also fails to initialize due to missing or invalid GCP service account credentials JSON."
  },
  {
    "event_id": "701cf668-3fcb-4d9b-8152-84724ef36ad4",
    "timestamp": "2026-07-16T14:07:19.873Z",
    "created_at": "2026-07-16T14:07:19.873Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-degraded-sta-98220ab9",
    "status": "acknowledged",
    "title": "Agentless runtime — component lifecycle: FAILED transitions and restarts",
    "summary": "Agentless runtime: components are entering FAILED state and crash-looping. FAILED->STARTING transitions confirmed at 2026-07-16T13:52:54Z; CEL state registry cleanup failures confirmed at 13:52:17Z. OTel collector restart loop and gRPC context cancellations also active. Impacts agentless integrations on this deployment — components cannot maintain stable state. Present since 2026-07-16T00:00Z. Immediate action: identify highest-restart agentless pods and verify agentless state store index availability.",
    "criticality": 55,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Read Errors",
      "Agentless Component Entered DEGRADED State",
      "CEL State Registry Cleanup Failure",
      "Fleet Config Update Received by Component",
      "OTel Collector Persistent Recovery Restart Loop",
      "Beat gRPC Channel Context Canceled",
      "Beat Component Very Short Uptime (Crash Indicator)",
      "Component State Transition to FAILED (Message-Based)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Investigate crash-looping agentless components: kubectl get pods -n <agentless-namespace> --sort-by='.status.containerStatuses[0].restartCount' to identify highest-restart pods, then kubectl logs <pod> --previous to review crash reasons.",
      "Check agentless state store/index availability: curl -X GET 'https://<es-host>/_cat/indices/agentless-state-*?v' to verify state indices exist and are healthy; restore any missing indices.",
      "For CEL registry cleanup failures (404 on state store): verify the agentless state index mapping is correct and the index has not been accidentally deleted or rolled over: GET /_cat/indices/agentless-state-httpjson-*"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless components are failing because the agentless state registry cleanup is erroring on registry entry removal (404 Not Found on state store operations), contributing to component DEGRADED/FAILED states, gRPC context cancellations, and crash-loop restarts."
  },
  {
    "event_id": "c652d21c-52fe-4fc8-9c8e-dd1d832f9cff",
    "timestamp": "2026-07-16T14:03:48.549Z",
    "created_at": "2026-07-16T14:03:48.549Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-sync-jobs-index-missing-d-7da02d4c",
    "status": "acknowledged",
    "title": "Connectors — refresh/sync jobs: required index missing",
    "summary": "Connectors: refresh/sync job operations are failing with index_not_found_exception for .elastic-connectors-sync-jobs. Confirmed still active at 2026-07-16T13:52:50Z. All connector sync scheduling and state handling is broken — connectors cannot schedule or track sync jobs. Present since 2026-07-16T00:00Z with no sign of recovery. Immediate action: verify and restore the .elastic-connectors-sync-jobs Elasticsearch system index.",
    "criticality": 62,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Python Client API Retry Error",
      "Connectors Elasticsearch Refresh API 404 Errors",
      "DNS Resolution Failures in Integration Error Messages"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restore the missing Elasticsearch index: POST /_connector/_sync_job (or use the Kibana connector management UI to trigger index recreation), or run: curl -X PUT 'https://<es-host>/.elastic-connectors-sync-jobs' with the appropriate mapping to recreate the system index.",
      "Check if the index was accidentally deleted: GET /_cat/indices/.elastic-connectors* to list all connector system indices and identify which are missing.",
      "If the index cannot be restored immediately, restart the connectors service to trigger automatic index initialization: kubectl rollout restart deployment -n <agentless-namespace> -l k8s.elastic.co/agentless-integration-name=elastic_connectors"
    ],
    "dependency_edges": [],
    "root_cause": "Connectors refresh operations are failing because the Elasticsearch index .elastic-connectors-sync-jobs is missing (index_not_found_exception), causing 404 responses and client retries on all connector sync scheduling and state handling operations."
  },
  {
    "event_id": "bca40d31-b793-4296-abe5-fd8078e9741c",
    "timestamp": "2026-07-16T14:03:42.434Z",
    "created_at": "2026-07-16T14:03:42.434Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-request-errors-steady-state-80632f2a",
    "status": "acknowledged",
    "title": "Proxy — request handling: requestError logs present",
    "summary": "Proxy service is logging requestError entries at a steady, stationary rate. The stream is confirmed active with the most recent requestError log at 2026-07-16T13:52:59Z, but the message field is not projected in the available query, leaving the error signature unconfirmed. No exposed dependency edges. Impact is bounded — no user-blocking evidence confirmed, but the steady error rate warrants tracking.",
    "criticality": 30,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy Request Error Logger"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect proxy requestError logs directly: kubectl logs -n ingress-proxy -l app.kubernetes.io/name=proxy --since=1h | grep requestError to identify affected endpoints and error types.",
      "If error rate is elevated, check proxy pod health: kubectl get pods -n ingress-proxy -l app.kubernetes.io/name=proxy and review recent restarts.",
      "Review proxy metrics dashboard for upstream error rate trends and correlate with backend service health."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "09a67396-b5a3-480a-97e8-6b2fc2302b67",
    "timestamp": "2026-07-16T14:03:25.542Z",
    "created_at": "2026-07-16T14:03:25.542Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-8c346352",
    "status": "acknowledged",
    "title": "Okta — developer org: signal dipped to silence",
    "summary": "Okta: developer org signal dipped to complete silence — no Okta logs at all today (COUNT(*) = 0 for service.name=okta). Cannot confirm whether the Okta org was restored (errors stopped) or the Okta integration itself went down (no telemetry). A dip to silence is a potential service-down signal. Immediate action: verify Okta integration pod health and confirm Okta org status directly in the Okta admin console.",
    "criticality": 75,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify Okta integration health: kubectl get pods -n <agentless-namespace> -l k8s.elastic.co/agentless-integration-name=okta and check for crash-loops or missing pods.",
      "Confirm Okta org status directly: log into the Okta admin console and verify the developer org is active and API access is functional.",
      "Check Okta integration log ingestion: verify the agentless Okta integration is running and producing logs by checking the last ingestion timestamp in Kibana Data Views for the Okta data stream."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "06e44697-efae-4367-82f6-cf1833b6f6b9",
    "timestamp": "2026-07-16T14:02:36.743Z",
    "created_at": "2026-07-16T14:02:36.743Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connector-auth-and-config-validation-fai-6f05c7c7",
    "status": "acknowledged",
    "title": "Connectors/Integrations — auth and configuration: token fetch forbidden and config invalid",
    "summary": "Connectors/Integrations: authentication and configuration failures are active and ongoing. OAuth token fetch requests are returning 403 (confirmed at 13:52:42Z today) and connector field validation errors are firing (confirmed at 13:52:50Z today). Affects users attempting to configure or run connectors — OAuth-dependent integrations cannot authenticate and connectors with incomplete configurations cannot start. Present since 2026-07-16T00:00Z with no sign of recovery. Immediate action: validate OAuth client credentials with the auth provider and identify connectors with missing required configuration fields.",
    "criticality": 58,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden",
      "Notion Connector API Token Invalid",
      "Connectors Field Validation Error (ConfigurableFieldValueError)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Validate OAuth credentials for affected integrations: check the auth provider (IAM/OAuth server) for 403 responses and rotate or re-authorize the OAuth client credentials via the Kibana connector management UI.",
      "For ConfigurableFieldValueError failures, identify connectors with missing required fields: kubectl exec -n <agentless-namespace> <connectors-pod> -- grep -r 'ConfigurableFieldValueError' /var/log and prompt users to complete connector configuration.",
      "Check the OAuth authorization server health: curl -I https://oauth.iam.us-central1.gcp.svc.elastic.cloud/.well-known/oauth-authorization-server to confirm it is reachable and returning 200."
    ],
    "dependency_edges": [],
    "root_cause": "Integration/connector setup and authentication are failing because OAuth token fetch requests are returning 403 (auth provider rejecting the client) and connector configurations are missing required fields, preventing successful connector operation."
  },
  {
    "event_id": "ddd42cc0-6b74-4590-81cc-631d9e938ea7",
    "timestamp": "2026-07-16T13:51:46.673Z",
    "created_at": "2026-07-16T13:51:46.673Z",
    "discovery_id": "09f44a03-3e73-4443-b0f7-d6aa8608ea69",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-35007de8",
    "status": "acknowledged",
    "title": "agentless components — runtime/integration health: multiple components FAILED (seccomp panic, config errors)",
    "summary": "Agentless components in us-central1 are experiencing multiple concurrent failures: Heartbeat/Synthetics processes are crashing with a seccomp policy double-registration panic, AWS OTel collectors are failing to start due to missing credentials configuration, CEL integrations are failing external HTTP calls, and component/unit FAILED state transitions are ongoing. Output write latency p99 is elevated, indicating backpressure. All failure modes confirmed still active as of 13:36Z. No exposed user-facing dependency edges identified, but agentless workload health is broadly degraded. Immediate actions: resolve the seccomp panic (likely a code/deployment bug in heartbeat/security module), supply valid AWS credentials to affected OTel collectors, and investigate CEL HTTP endpoint availability.",
    "criticality": 55,
    "confidence": 0.78,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration",
      "CEL Input Retryable HTTP Request Failure",
      "Libbeat Output Write Latency Spike"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Investigate and patch the seccomp double-registration panic in Heartbeat/Synthetics: check the deployed image tag against the commit at `github.com/elastic/beats/v7@v7.0.0-alpha2.0.20260714222447-8f4bbab772a2` and roll back or hotfix `heartbeat/security/seccomp.go:MustRegisterPolicy` to guard against duplicate registration.",
      "Supply valid AWS credentials to the affected OTel collectors: update the agentless integration configuration for the affected deployment (ID: 750cdbb8-172f-44ab-9468-7989460a9884) via `kubectl edit agentlessconfig <name> -n agentless` to set `credentials`, `assume_role`, or `profile` for each awscredentialsprovider extension.",
      "Investigate CEL input HTTP endpoint availability: check the external endpoint being called by `input.cel.retryablehttp` integrations and verify network reachability from the agentless pod — `kubectl exec -n agentless <pod> -- curl -v <endpoint>`."
    ],
    "dependency_edges": [],
    "root_cause": "agentless-managed components are failing because a seccomp policy double-registration panic is crashing Heartbeat/Synthetics processes and concurrent configuration errors (missing AWS creds, external API request failures) are driving additional FAILED transitions and output backpressure."
  },
  {
    "event_id": "9aa93646-dbc6-4be9-8e3c-bd3dcea5bf23",
    "timestamp": "2026-07-16T13:51:27.220Z",
    "created_at": "2026-07-16T13:51:27.220Z",
    "discovery_id": "6e7bf3cf-6edc-4052-97c5-b3c4318e8a74",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-23ef63e3",
    "status": "acknowledged",
    "title": "Agentless collectors — GCP Cloudbeat: invalid credentials JSON (unconfirmed)",
    "summary": "Agentless collectors: AWS OTel Collector is failing due to missing credentials configuration (no credentials/assume_role/profile set), confirmed active. GCP Cloudbeat invalid credentials JSON is unconfirmed this cycle — the query matched a different error pattern. Both issues affect agentless-managed integrations in logging-gcp-us-central1. No exposed downstream services. Action: verify and correct AWS OTel collector credential configuration in the affected integration policy; re-check GCP Cloudbeat credentials separately.",
    "criticality": 25,
    "confidence": 0.38,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify the GCP credentials JSON configured for the affected Cloudbeat CSPM integration: kubectl get secret -n <project-namespace> -o yaml | grep credentials",
      "For the AWS OTel collector missing credentials, update the integration policy to include valid AWS credentials, assume_role, or profile: navigate to Fleet > Agent Policies > affected policy > AWS integration settings",
      "Re-check Cloudbeat credential parsing errors after credential update: kubectl logs -n <project-namespace> -l component=cloudbeat --since=30m | grep -i credentials"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "dbc654b9-ae85-488c-a4f2-9dc3d1664272",
    "timestamp": "2026-07-16T13:48:15.069Z",
    "created_at": "2026-07-16T13:48:15.069Z",
    "discovery_id": "bcd76605-e6b8-4391-a326-673865c8a0ed",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-2bf829a2",
    "status": "acknowledged",
    "title": "UIAM — auth via proxy: 4xx authenticate responses",
    "summary": "UIAM authentication via proxy is failing with 4xx responses on the authenticate path. The rule is in a stationary elevated state (p_value=0), indicating a sustained failure rate. Confirmed active at 2026-07-16T12:46Z. No root cause identified. Immediate action: determine whether UIAM is rejecting valid credentials or the proxy is mis-forwarding auth headers.",
    "criticality": 50,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM service logs for authentication rejection reasons: `kubectl logs -n uiam -l app=uiam --since=2h | grep -E 'authenticate|4[0-9][0-9]|unauthorized|forbidden'`",
      "Verify proxy auth header forwarding configuration: inspect the proxy's routing rules for the _authenticate path to confirm headers (Authorization, X-Forwarded-For) are being passed correctly — `kubectl get configmap proxy-config -n proxy -o yaml | grep -A5 authenticate`",
      "If UIAM is rejecting valid credentials, check for a recent credential rotation or token expiry event in the UIAM audit log and roll back or re-issue credentials as needed."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "aeca5039-286b-473d-8d6f-2bbe85073bfe",
    "timestamp": "2026-07-16T13:47:48.593Z",
    "created_at": "2026-07-16T13:47:48.593Z",
    "discovery_id": "dfb07c75-e63f-49e8-bf70-a9aaa34ee5e6",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__failed-to-list-agentless-configs-bc38a9b2",
    "status": "acknowledged",
    "title": "agentless-api — deployments API: cannot list agentless configs (HTTP error)",
    "summary": "agentless-api deployment listing and liveness checks are failing with HTTP errors due to Kubernetes API client failures. The K8s client is unable to list agentlessconfigs, causing both the listDeployments endpoint and the liveness handler to return errors. Stack traces are being emitted on each failure. Confirmed still active at 13:33Z, ~24 hours after onset at 2026-07-15T13:48Z. Immediate action: check K8s API server health, RBAC permissions, and client throttling configuration for the agentless-api service account.",
    "criticality": 72,
    "confidence": 0.78,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Failed to List Agentless Configs",
      "Liveness Check HTTP Error",
      "K8s Client Check Failure",
      "Go Stack Trace in Agentless API"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Kubernetes API server health and RBAC permissions for the agentless-api service account: `kubectl auth can-i list agentlessconfigs --as=system:serviceaccount:agentless:agentless-api -n agentless`",
      "Inspect agentless-api pod logs for context-canceled or ResourceExhausted gRPC errors indicating K8s API throttling: `kubectl logs -n agentless -l app=agentless-api --since=1h | grep -E 'context canceled|ResourceExhausted|throttl'`",
      "If K8s API throttling is confirmed, increase the agentless-api client QPS/burst limits via Helm values: `helm upgrade agentless-api <chart> --set k8sClient.qps=50 --set k8sClient.burst=100 -n agentless`"
    ],
    "dependency_edges": [],
    "root_cause": "agentless-api is failing because its Kubernetes API requests for agentlessconfigs are being canceled/throttled, causing listDeployments and liveness checks to return HTTP error."
  },
  {
    "event_id": "46b10f1e-b388-4339-83ca-242b22d3ad9d",
    "timestamp": "2026-07-16T13:47:20.323Z",
    "created_at": "2026-07-16T13:47:20.323Z",
    "discovery_id": "2edfe899-8114-4a7a-9e6e-017d718d5092",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__notion-connector-api-token-invalid-1cb51392",
    "status": "acknowledged",
    "title": "Connectors — Notion: connector auth/config errors",
    "summary": "Connectors Notion connector is failing with auth/config errors. Errors include 'Error while connecting to Notion' and 'API token is invalid' from connectors-py. Notion content sync is interrupted for affected deployments. Evidence is stale (last confirmed at 05:45Z, ~8h before review); stationary detection (p_value=0) suggests the failure rate remains elevated. Immediate action: verify and update the Notion connector API token in Kibana connector configuration.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Notion Connector API Token Invalid",
      "Connectors Notion API Response Error",
      "Connectors Service Type Not Configured"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and update the Notion connector API token in the connector configuration: navigate to Kibana → Search → Connectors → Notion connector → Edit configuration and re-enter a valid Notion integration token.",
      "Check the Notion integration token permissions in the Notion workspace settings to ensure the integration has access to the required pages/databases.",
      "If the token is valid, check for Notion API rate limiting or service degradation at https://status.notion.so and retry the connector sync once the issue is resolved."
    ],
    "dependency_edges": [],
    "root_cause": "Notion connector is failing because its connector configuration/credentials are invalid, causing connectors-py to error during connection attempts and stop syncing content."
  },
  {
    "event_id": "c9ea62eb-57bd-41b3-a01f-408731da54d6",
    "timestamp": "2026-07-16T13:46:56.000Z",
    "created_at": "2026-07-16T13:46:56.000Z",
    "discovery_id": "4d2ca2e7-4490-4d2f-abb3-71ce58c5437d",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-failed-state-7b5d6276",
    "status": "acknowledged",
    "title": "Agentless runtime — heartbeat receiver: seccomp policy panic",
    "summary": "Agentless runtime: components are crashing on startup with a seccomp policy panic and transitioning to FAILED, confirmed active as of 13:24 UTC today (seconds before this review). The heartbeat/synthetics receiver is registering a seccomp policy more than once during startup, triggering a Go panic that terminates the process. Multiple components affected (cloudbeat/cis_gcp confirmed FAILED at 13:24). Dip change points indicate service went silent across detection windows. No exposed downstream services, but agentless integrations are broadly impacted. Action: roll back the heartbeat/synthetics component to the last known-good image to stop the seccomp double-registration panic.",
    "criticality": 65,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Agentless Component Entered FAILED State",
      "Go Panic in Agentless Component",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "CEL Input Retryable HTTP Request Failure",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Pin or roll back the heartbeat/synthetics component image to the last known-good version to stop the seccomp double-registration panic: kubectl set image deployment/<heartbeat-deployment> heartbeat=<last-good-image-tag> -n agentless",
      "If rollback is not immediately available, cordon affected nodes and drain to prevent new seccomp-panicking pods from scheduling: kubectl cordon <node-name> && kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data",
      "Monitor component FAILED state recovery after rollback: kubectl get pods -n agentless -w | grep -E 'FAILED|CrashLoop'"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed components are failing because the heartbeat/synthetics receiver is registering a seccomp policy more than once during startup, triggering a Go panic (seccomp policy already registered) that terminates the process and drives units/components into FAILED state."
  },
  {
    "event_id": "7dc58421-9ef0-49af-9d4f-6e4e6ab91282",
    "timestamp": "2026-07-16T13:39:09.358Z",
    "created_at": "2026-07-16T13:39:09.358Z",
    "discovery_id": "cefdafdf-3ac9-4f9c-abf2-7a2553827f67",
    "discovery_slug": "otel-default__agent-execution-error-in-researchagent-w-52f29a2e",
    "status": "acknowledged",
    "title": "Agent Builder — researchAgent: agent execution errors",
    "summary": "Agent Builder: the researchAgent workflow is encountering agentExecutionError exceptions, interrupting agent runs and blocking workflow completion for affected users. Errors confirmed active as of 13:14 UTC today. No exposed downstream services. Action: inspect agentExecutionError exception messages and stack traces in the agent-builder/inference pipeline to identify the failing step (tool call key missing in LLM response chunk is the dominant pattern per KI evidence).",
    "criticality": 45,
    "confidence": 0.55,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Agent execution error in researchAgent workflow"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the inference plugin logs for the researchAgent workflow: kubectl logs -n kibana -l app=kibana --since=1h | grep agentExecutionError",
      "If the dominant error is 'Tool call key is missing', check the upstream LLM provider (.openai-gpt-5.2-chat_completion) for streaming response issues: kubectl exec -n kibana <kibana-pod> -- curl -s http://localhost:5601/api/status | jq .status",
      "If provider errors (502) are confirmed, consider temporarily disabling the researchAgent workflow or switching the inference entity: kubectl rollout restart deployment/kibana -n kibana"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "755cddbe-7824-4301-b2d3-2e5fb5355be0",
    "timestamp": "2026-07-16T13:35:00.346Z",
    "created_at": "2026-07-16T13:35:00.346Z",
    "discovery_id": "c422df19-59f4-4cdb-afb8-da8591735897",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__failed-to-list-agentless-configs-9dde20b6",
    "status": "acknowledged",
    "title": "Agentless API — deployments listing: handler HTTP errors",
    "summary": "Agentless API: deployment listing and liveness handler are emitting HTTP errors, confirmed active as of 13:08 UTC today. The agentless-api is failing to list agentless configs and its liveness handler is returning HTTP errors, which may cause pod instability via failed liveness probes. No exposed downstream services. K8s client check failures and non-200 HTTP responses are not currently confirmed. Action: inspect agentless-api handler errors on the Kubernetes API client/configs retrieval path and consider increasing liveness probe failure threshold to prevent cascading restarts.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Failed to List Agentless Configs",
      "Liveness Check HTTP Error",
      "Go Stack Trace in Agentless API",
      "Unexpected User Stack Type or Project Type",
      "HTTP Non-200 Response from Agentless API",
      "K8s Client Check Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless-api pod logs for the Kubernetes API client error details: kubectl logs -n agentless -l app=agentless-api --since=30m | grep -E 'failed to list|HTTP error|k8s'",
      "If Kubernetes API rate limiting (ENHANCE_YOUR_CALM) is confirmed, reduce agentless-api polling frequency or increase API server rate limits: kubectl edit configmap agentless-api-config -n agentless",
      "If liveness probe failures are causing pod restarts, temporarily increase the liveness probe failure threshold to prevent cascading restarts: kubectl patch deployment agentless-api -n agentless --type=json -p '[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/livenessProbe/failureThreshold\",\"value\":10}]'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "4818a9f3-ac16-4586-9a91-86fd021af426",
    "timestamp": "2026-07-16T13:34:04.181Z",
    "created_at": "2026-07-16T13:34:04.181Z",
    "discovery_id": "7b1ece35-443b-49c6-b510-87414b2e4cb6",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-2f7ddeb8",
    "status": "acknowledged",
    "title": "O365 audit integration — DLP subscription: missing permissions (AF10001)",
    "summary": "O365 audit integration: DLP subscription start is failing with AF10001 permission-set errors, confirmed active as of 13:23 UTC today (seconds before this review). The O365 DLP audit stream is degraded for affected tenant(s) — the configured Azure AD application is missing the required permissions for the subscription start endpoint. No exposed downstream services. Action: add the required ActivityFeed.ReadDlp permission to the Azure AD app registration and re-grant admin consent.",
    "criticality": 45,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In Azure AD, navigate to App registrations > [affected app] > API permissions and add the required permissions for the Office 365 Management Activity API (ActivityFeed.Read, ActivityFeed.ReadDlp): az ad app permission add --id <app-id> --api 00000007-0000-0000-c000-000000000000 --api-permissions <permission-id>=Role",
      "Grant admin consent for the updated permissions: az ad app permission admin-consent --id <app-id>",
      "After granting consent, restart the affected agentless integration to re-attempt the DLP subscription: kubectl rollout restart deployment/<agentless-integration-pod> -n <project-namespace>"
    ],
    "dependency_edges": [],
    "root_cause": "O365 DLP subscription is failing because the configured Azure AD application is missing the required permission set for the subscription start endpoint (AF10001)."
  },
  {
    "event_id": "2dc4f4ee-2cba-488f-8dc8-a3db347b7388",
    "timestamp": "2026-07-16T13:19:01.173Z",
    "created_at": "2026-07-16T13:19:01.173Z",
    "discovery_id": "098c77f1-b733-4bd2-8024-cada2ad2524d",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-7f67c497",
    "status": "acknowledged",
    "title": "Connectors — CEL HTTP input: retryable request failures",
    "summary": "Connectors: CEL input retryable HTTP request failures are actively occurring as of 13:06 UTC. HTTP-polled upstream sources are returning failures that trigger retries. Data ingestion from affected HTTP endpoints is degraded. Action: verify upstream endpoint availability and check for API changes or rate-limiting.",
    "criticality": 40,
    "confidence": 0.52,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check upstream endpoint availability from the agentless pod: `kubectl exec -n <agentless-namespace> <cel-pod> -- curl -sv <upstream-url>` — confirm the endpoint is reachable and returning expected status codes.",
      "Review the CEL input configuration in Fleet for the affected integration: verify the URL, authentication headers, and rate limits are correctly configured and that the upstream API has not changed its endpoint or auth requirements.",
      "Check upstream API status pages or contact the upstream provider to confirm whether there is an ongoing outage or rate-limiting event affecting the integration's polling requests."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "15966a61-68ce-4ffc-97a8-55e22e885ade",
    "timestamp": "2026-07-16T13:18:36.586Z",
    "created_at": "2026-07-16T13:18:36.586Z",
    "discovery_id": "12ad983f-7e87-45c1-b8aa-b2dbb08cded8",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-eab467ab",
    "status": "acknowledged",
    "title": "Connectors — SSH: connection failures",
    "summary": "Connectors: SSH connection failures are actively occurring as of 13:06 UTC. Connectors cannot establish SSH connections to remote targets (error.message: Connect call failed on port 22). SSH-based data collection is interrupted. Action: verify network reachability to SSH targets and confirm SSH credentials/authorized_keys are valid.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify network reachability from the agentless pod to the SSH target: `kubectl exec -n <agentless-namespace> <connector-pod> -- nc -zv <target-host> 22` — confirm port 22 is reachable.",
      "Check SSH credentials validity for the affected connector in Fleet: navigate to Fleet > Integrations > affected SSH connector > edit policy, verify the SSH private key/password has not expired or been rotated on the target host.",
      "Review the target host's SSH server status and authorized_keys: `ssh <target-host> 'systemctl status sshd'` and confirm the connector's public key is still in authorized_keys."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "9928220f-b45a-4e80-970f-d56cca1523ca",
    "timestamp": "2026-07-16T13:17:59.194Z",
    "created_at": "2026-07-16T13:17:59.194Z",
    "discovery_id": "251f9daa-87ae-498d-9997-f63c6f508f49",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-528276d9",
    "status": "acknowledged",
    "title": "Agentless integrations — OAuth: token fetch/auth failures",
    "summary": "Agentless integrations: OAuth token acquisition failures are actively occurring for multiple integrations. Integrations returning 403 Forbidden (likely revoked/misconfigured OAuth credentials) and M365 Defender returning invalid_client (Azure AD app registration issue) are both confirmed active as of 13:07 UTC. Affected integrations cannot ingest data. Action: rotate/verify OAuth credentials for affected integrations in Fleet and check Azure AD app registration for M365 Defender.",
    "criticality": 45,
    "confidence": 0.52,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden",
      "M365 Defender Azure AD OAuth invalid_client"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify OAuth app credentials for affected integrations in Fleet: navigate to Fleet > Integrations > affected integration > edit policy, and re-enter/rotate the OAuth client ID and secret, then save.",
      "For M365 Defender invalid_client errors: check the Azure AD app registration in the Azure portal — verify the client secret has not expired (`az ad app credential list --id <app-id>`) and that the app has the required API permissions granted.",
      "For 403 Forbidden OAuth errors: check the OAuth provider's admin console to confirm the application is still authorized and the redirect URIs/scopes match the integration configuration."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "98753e19-901c-4b3d-953d-f94229b4e252",
    "timestamp": "2026-07-16T12:25:51.912Z",
    "created_at": "2026-07-16T12:25:51.912Z",
    "discovery_id": "3364fd18-238e-4635-93fa-8328b55704a5",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsup-51d1a32d",
    "status": "acknowledged",
    "title": "Agentless integrations — outbound HTTP: retryable request failures",
    "summary": "Agentless integrations are experiencing broad outbound HTTP request failures across CEL and HTTPJSON inputs, with CEL retryable failures confirmed active at 12:11Z. Multiple contributing causes: CEL input URL missing protocol scheme, OAuth 403/401 credential failures, OTel collector restart loop, connectors service type not configured, and Beat gRPC context cancellations. Affects data collection for impacted integrations in us-central1. Fix integration policy credentials and URL configurations in Fleet.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure",
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)",
      "Integration OAuth Token Fetch 403 Forbidden",
      "Fleet Config Update Received by Component",
      "CEL Input Retryable HTTP Request Failure",
      "Connectors Service Type Not Configured",
      "CEL State Registry Cleanup Failure",
      "OTel Collector Persistent Recovery Restart Loop",
      "Integration API 401 Unauthorized Errors",
      "Beat gRPC Channel Context Canceled",
      "Connectors Python Client API Retry Error",
      "HTTPJSON Retryable HTTP Request Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the CEL input URL misconfiguration by updating the integration policy to include a valid protocol scheme (https://): in Fleet, navigate to the affected integration policy and correct the endpoint URL field.",
      "Rotate or re-configure OAuth credentials for integrations returning 403 Forbidden and 401 Unauthorized: in Fleet, update the integration policy credentials for the affected integrations.",
      "Investigate the OTel collector restart loop and connectors service type misconfiguration: kubectl -n <agentless-namespace> logs -l component=otel-collector --since=1h | grep 'recovery restarting'"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless integrations are failing because their outbound HTTP requests to upstream APIs are failing after retries are exhausted, with multiple contributing causes: CEL input endpoint URL missing protocol scheme, OAuth 403/401 credential failures, and OTel collector in a persistent restart loop."
  },
  {
    "event_id": "7b37da7e-5e66-4057-9707-da251003fffd",
    "timestamp": "2026-07-16T12:10:54.132Z",
    "created_at": "2026-07-16T12:10:54.132Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-407b2894",
    "status": "acknowledged",
    "title": "Integration OAuth — token fetch: 403 forbidden",
    "summary": "Integration OAuth token fetch: oauth2 token acquisition fails with 403 Forbidden (Okta E0000260 — developer org deactivated). Okta integration data collection is blocked for this tenant. Steady-state failure since at least 2026-07-16T06:15Z. Contact Okta org admin to re-activate the org, or disable the integration to stop error noise.",
    "criticality": 20,
    "confidence": 0.25,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Contact the Okta org admin for the deactivated developer org to request re-activation: the error E0000260 indicates the org is deactivated — this cannot be resolved by the integration team alone.",
      "Disable or pause the affected Okta integration in Kibana Fleet to stop repeated 403 errors: navigate to Fleet > Integrations > Okta > [affected policy] and disable the integration until the org is re-activated.",
      "If the Okta org is permanently deactivated, remove the integration configuration: in Kibana Fleet, delete the Okta integration policy for this tenant to stop error noise."
    ],
    "dependency_edges": [],
    "root_cause": "Integration OAuth token fetch is failing because the Okta developer org associated with the configured credentials has been deactivated (E0000260), causing all token acquisition attempts to return 403 Forbidden."
  },
  {
    "event_id": "167f49f2-3b8f-4eae-aca4-b78fe6ff2d73",
    "timestamp": "2026-07-16T12:05:22.195Z",
    "created_at": "2026-07-16T12:05:22.195Z",
    "discovery_id": "f113291b-4d5a-4a3b-86a0-43264425f3a9",
    "discovery_slug": "otel-default__tool-call-key-missing-in-llm-response-ch-e854fdb0",
    "status": "acknowledged",
    "title": "agent-builder — tool execution: tool call key missing in LLM response",
    "summary": "agent-builder is throwing parsing exceptions when processing LLM response chunks with malformed tool_calls entries (missing toolCallId/name/arguments). Affects Agent Builder users whose workflows depend on tool calls. Signal is stationary (ongoing), confirmed active as of 2026-07-16T11:01Z. Identify which LLM model/provider is returning malformed chunks and pin or roll back to a known-good version.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool call key missing in LLM response chunk"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agent-builder pod logs for the full tool_calls parsing error context: kubectl logs -n agent-builder -l app=agent-builder --tail=200 | grep -A5 'Tool call key is missing'",
      "Identify which LLM provider/model is returning malformed tool_calls chunks: kubectl logs -n agent-builder -l app=agent-builder --tail=500 | grep -B10 'Tool call key is missing' | grep -i 'model\\|provider'",
      "If a specific model version is identified as the source, pin or roll back to the last known-good model version via the agent-builder model configuration: kubectl edit configmap -n agent-builder agent-builder-config"
    ],
    "dependency_edges": [],
    "root_cause": "agent-builder is failing to execute tool calls because the LLM response stream is returning tool_calls entries with missing required keys (toolCallId, name, or arguments), triggering a parsing exception at index 0 of the chunk."
  },
  {
    "event_id": "2a117527-0b9c-410b-ae86-94c1bba399fb",
    "timestamp": "2026-07-16T12:00:32.972Z",
    "created_at": "2026-07-16T12:00:32.972Z",
    "discovery_id": "f8f72976-fe3d-426f-949d-25f5fc760430",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__go-panic-in-agentless-component-4a600f51",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — runtime: seccomp policy panic",
    "summary": "Agentless Heartbeat/Synthetics component is crashing with a Go panic caused by duplicate seccomp policy registration. Affects the agentless log collection path; dip detections indicate the component went silent. Panics observed since 2026-07-15T10:44Z, ongoing. Identify the code path registering the seccomp policy twice and prevent duplicate registration.",
    "criticality": 65,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Go Panic in Agentless Component",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check current agentless heartbeat/synthetics pod status and restart count: kubectl get pods -n agentless -l component=heartbeat --sort-by='.status.containerStatuses[0].restartCount'",
      "Review recent agentless component logs for the full panic stack trace: kubectl logs -n agentless -l component=heartbeat --previous --tail=200 | grep -A20 'panic'",
      "If a recent deployment introduced the duplicate seccomp registration, roll back: helm rollback agentless-heartbeat -n agentless"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless Heartbeat/Synthetics component is crashing because a seccomp policy is being registered more than once, triggering a Go panic (panic: a seccomp policy is already registered)."
  },
  {
    "event_id": "7a9698bf-9ae5-45ee-8830-96222e218af9",
    "timestamp": "2026-07-16T11:59:08.642Z",
    "created_at": "2026-07-16T11:59:08.642Z",
    "discovery_id": "06288f6b-f1ba-4e18-9eae-3d8c2718eb3e",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-dc11712a",
    "status": "acknowledged",
    "title": "UIAM — service: elevated errors active with trend change",
    "summary": "UIAM service is emitting elevated error and warning logs with a trend change (increasing rate). Affects UIAM service health; the growing error rate may indicate a developing issue. Signal confirmed active as of 2026-07-16T11:45Z. Investigate UIAM pod logs for specific error messages and correlate with the proxy authentication failures in the same service.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM error log details: kubectl logs -n uiam -l app.kubernetes.io/role=uiam-external --tail=200 | grep -E 'ERROR|WARN'",
      "Check UIAM pod restart count and recent events: kubectl describe pods -n uiam -l app.kubernetes.io/role=uiam-external | grep -A10 'Events:'",
      "Review UIAM service metrics for error rate trend: kubectl top pods -n uiam -l app.kubernetes.io/role=uiam-external"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "60085ab7-3811-486b-bd4a-91fb1ec28c8c",
    "timestamp": "2026-07-16T11:03:57.155Z",
    "created_at": "2026-07-16T11:03:57.155Z",
    "discovery_id": "2b9bfcf4-ef1c-4381-bbb8-82e098316fe5",
    "discovery_slug": "otel-default__tool-call-key-missing-in-llm-response-ch-bb0f4b98",
    "status": "acknowledged",
    "title": "Agent Builder — tool execution: tool call parsing/lookup errors",
    "summary": "Agent Builder (Kibana 9.6.0) tool-calling is broken in logs-agent_builder.otel-default: LLM response chunks are missing the tool call key and the runtime cannot resolve requested tools (toolNotFoundError). All agent workflows that invoke tools are affected. Two concurrent failure modes confirmed active: malformed LLM response at 2026-07-16T10:19:37Z and tool registry failure at 2026-07-16T10:45:12Z. Validate tool schema registration and check for a recent Kibana deployment or LLM connector change.",
    "criticality": 62,
    "confidence": 0.65,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool call key missing in LLM response chunk",
      "Tool not found error in agent workflow"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Validate tool schema registration in Kibana Agent Builder: check the tool registry configuration via the Kibana API: GET /api/agent_builder/tools and compare against the LLM tool-call response format",
      "Check for a recent Kibana 9.6.0 deployment or configuration change that may have altered tool schema or LLM connector settings: kubectl rollout history deployment/kibana -n <kibana-namespace>",
      "If a specific LLM connector is producing malformed tool-call chunks, switch to a backup connector or disable tool-calling for affected agent workflows: PUT /api/agent_builder/agents/<agent-id> with tools:[] to isolate the failure"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "a4dd99f0-6d0b-4bc2-9409-d643bb379af0",
    "timestamp": "2026-07-16T11:03:00.729Z",
    "created_at": "2026-07-16T11:03:00.729Z",
    "discovery_id": "829b01ac-3b54-4da9-b8dd-5a9859f2bb18",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-7e61e1f4",
    "status": "acknowledged",
    "title": "Elasticsearch controller — control plane: warnings/errors",
    "summary": "Elasticsearch controller is emitting elevated warnings/errors in the control plane (logging-gcp-us-central1-logs-all). Internal cluster management operations are affected; no user-facing services or exposed dependency edges are involved. Errors confirmed active as recently as 2026-07-16T10:49:50Z with a credible trend_change signal (p=0.0003). Schedule investigation to project the error message and identify the failing controller operation.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Re-run the controller error query with message projection to capture the error signature: kubectl logs -n elastic-system -l app.kubernetes.io/name=elasticsearch-controller --since=1h | grep -E 'error|warning' | tail -50",
      "Check Elasticsearch operator reconciliation status: kubectl get elasticsearch -A -o wide and kubectl describe elasticsearch -A | grep -A5 'Conditions'",
      "If a specific reconciliation loop is stuck, restart the controller pod: kubectl rollout restart deployment/elasticsearch-controller -n elastic-system"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f4da724d-140a-4af1-8853-68b47578a34f",
    "timestamp": "2026-07-16T11:02:23.562Z",
    "created_at": "2026-07-16T11:02:23.562Z",
    "discovery_id": "fed1f47f-ff21-498e-8b0d-111a4e9f5a42",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-93399149",
    "status": "acknowledged",
    "title": "Agentless CEL input — HTTP client: request failures",
    "summary": "Agentless CEL input is experiencing persistent retryable HTTP request failures in logging-gcp-us-central1-logs-agentless-log-default. The CEL input data fetch pipeline is failing to reach its upstream endpoint. No user-facing services are directly exposed. Failures confirmed active at 2026-07-16T10:52:38Z (at review time) with a very strong trend_change signal (p=1.16e-8). Identify the upstream endpoint and investigate connectivity, authentication, or rate-limiting issues.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the upstream endpoint the CEL input is calling: kubectl exec -n <agentless-namespace> <agentless-pod> -- cat /etc/elastic-agent/inputs.d/*.yml | grep -E 'url|endpoint'",
      "Test connectivity to the upstream endpoint from the agentless pod: kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v <upstream-endpoint> 2>&1 | tail -20",
      "If the upstream endpoint is rate-limiting or returning auth errors, rotate the API key or adjust the CEL input polling interval: kubectl set env deployment/<agentless-deployment> -n <namespace> CEL_INPUT_INTERVAL=60s"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "0785ac9b-075d-44a3-8b6a-9368bcf0bb1b",
    "timestamp": "2026-07-16T10:50:14.240Z",
    "created_at": "2026-07-16T10:50:14.240Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-39674ff1",
    "status": "acknowledged",
    "title": "UIAM — service logs: suspected errors",
    "summary": "UIAM: error/warn logs confirmed active as of 10:33Z (stationary flat rate). No KI backing, no exposed dependency edges, and error content unknown — impact is bounded. Monitor for rate increase or user-facing auth failures; no immediate page required.",
    "criticality": 20,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM service logs directly: kubectl logs -n <uiam-namespace> -l app.kubernetes.io/role=uiam-external --since=30m | grep -E 'ERROR|WARN' to identify the specific error pattern and frequency.",
      "If error rate is elevated above baseline, review recent UIAM deployments: kubectl rollout history deployment/<uiam-deployment> -n <uiam-namespace> and consider rollback if a recent change correlates.",
      "Monitor UIAM error rate trend over the next 30 minutes; if rate increases or user-facing auth failures are reported, escalate to SEV2."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "1784e2d5-f9fd-481c-983c-66b5862d2be6",
    "timestamp": "2026-07-16T10:47:19.522Z",
    "created_at": "2026-07-16T10:47:19.522Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-failed-state-1a85bd0d",
    "status": "acknowledged",
    "title": "Agentless Cloudbeat — GCP CSPM unit: invalid credentials JSON causes FAILED state",
    "summary": "Agentless Cloudbeat: GCP CSPM unit in FAILED state due to invalid/empty credentials JSON, stopping GCP security posture telemetry collection. Affects cloudbeat/cis_gcp agentless workload in us-central1. Credentials validation errors confirmed ongoing as of 10:37Z (onset ~09:05Z), stable failure (dip detection). Action required: validate and rotate the GCP credentials JSON in the Fleet integration configuration and restart the failed unit.",
    "criticality": 45,
    "confidence": 0.52,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Validate and rotate the GCP service account credentials configured for the cloudbeat/cis_gcp agentless integration: navigate to Fleet > Agent Policies > [agentless policy] > Cloud Security Posture integration and update the GCP credentials JSON field with a valid service account key.",
      "After updating credentials, restart the failed cloudbeat unit: kubectl delete pod -n <agentless-namespace> -l component=cloudbeat,integration=cis_gcp to force a fresh pod with the new credentials.",
      "Verify GCP CSPM telemetry resumes by checking unit state: kubectl logs -n <agentless-namespace> -l component=cloudbeat --since=5m | grep -E 'HEALTHY|FAILED|credentials' within 5 minutes of the credential update."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "a0a6dc52-7731-4f0e-b3a5-176af8a4f349",
    "timestamp": "2026-07-16T10:08:15.000Z",
    "created_at": "2026-07-16T10:08:15.000Z",
    "discovery_id": "7bab96f8-14cd-4bf0-bd5f-9683179d8617",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-read-errors-ca333d46",
    "status": "acknowledged",
    "title": "Agentless log pipeline — libbeat output: read errors",
    "summary": "Agentless log pipeline: libbeat output read errors detected in logging-gcp-us-central1-logs-agentless-log-default. Errors present from 2026-07-16T00:01Z through latest sample at 09:31Z (carried detection, spike p≈0). Downstream log delivery may be delayed or dropped. Immediate action: verify output destination availability and check agentless pipeline logs for connection errors.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Read Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the agentless log pipeline output destination availability and connectivity: kubectl -n <agentless-namespace> logs -l app=agentless --since=30m | grep -E 'output|read error|libbeat'",
      "Review the Elasticsearch output endpoint health for the agentless pipeline and verify the target cluster is accepting connections: curl -u elastic:<password> https://<elasticsearch-endpoint>/_cluster/health",
      "If the output destination is healthy, restart the affected agentless filebeat/libbeat process to clear the read error state: kubectl -n <agentless-namespace> rollout restart deployment <agentless-log-deployment>"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless log pipeline is failing because libbeat output read operations are erroring, causing non-zero output read error metrics in the agentless-log-default stream."
  },
  {
    "event_id": "d34a664f-a3e0-46e0-acbe-f2171650991b",
    "timestamp": "2026-07-16T10:06:23.110Z",
    "created_at": "2026-07-16T10:06:23.110Z",
    "discovery_id": "e2fa0fc4-54f2-4a62-9ffa-9d06dbecb47a",
    "discovery_slug": "logging-gcp-us-central1-logs-all__beats-and-pubsubbeat-indexing-failures-307e9767",
    "status": "acknowledged",
    "title": "GCP logging — elasticsearch-controller: errors and warnings",
    "summary": "GCP logging (us-central1): elasticsearch-controller is emitting error/warning logs as of 09:54Z (trend_change, p=0.0004). Beats indexing failures and UIAM errors have cleared — confirmed by current-state checks with stream alive. Only the ES controller signal remains active. No exposed dependency edges; no confirmed user-blocking path. Immediate action: inspect elasticsearch-controller logs for the specific error/warning content and check for reconciliation failures.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Beats and Pubsubbeat Indexing Failures",
      "UIAM Service-Level Errors",
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check elasticsearch-controller logs for the specific error/warning content: kubectl -n <elasticsearch-controller-namespace> logs -l app=elasticsearch-controller --since=30m | grep -E 'error|warning|ERROR|WARNING'",
      "Review recent Elasticsearch cluster events for reconciliation failures or resource constraint warnings: kubectl -n <elasticsearch-controller-namespace> get events --sort-by=.lastTimestamp | tail -30",
      "If controller errors are related to a specific cluster resource, describe the affected Elasticsearch resource to identify the root cause: kubectl -n <target-namespace> describe elasticsearch <cluster-name>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "24579154-0742-4122-b474-baf70798f118",
    "timestamp": "2026-07-16T10:03:49.002Z",
    "created_at": "2026-07-16T10:03:49.002Z",
    "discovery_id": "46dcc242-ebf0-4103-bc9a-bbf9c4e43285",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-28ac20e0",
    "status": "acknowledged",
    "title": "Agentless AWS OTel collector — auth: missing credentials config",
    "summary": "Agentless AWS OTel collector: multiple AWS service collectors (lambda, ELB, EC2, RDS, ECS, SQS, ELB gateway/network/classic) are failing to start because their awscredentialsprovider extensions have no credentials, assume_role, or profile configured. The collector exits non-zero and the component unit transitions to FAILED. Affects agentless AWS-integrated telemetry and log shipping in GCP us-central1. Onset at 2026-07-16T09:41Z; still active as of 09:54Z with no sign of recovery. Immediate action: fix the AWS credentials configuration for the affected agentless integrations or remove the explicit auth block to fall back to the default SDK credential chain.",
    "criticality": 55,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration",
      "Component State Transitioned to FAILED (component.state)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the agentless integration configuration for the affected AWS OTel collector (integration ID 0a105cde-521e-46d2-9e56-9b825baa61e6) and add valid credentials, assume_role ARN, or profile to each awscredentialsprovider extension block, or remove the auth block entirely to use the default SDK credential chain: kubectl -n <agentless-namespace> edit configmap <otelcol-config>",
      "If the credentials were recently rotated or deleted, restore the AWS IAM credentials or re-configure the assume_role ARN for the affected agentless integration via the Fleet UI: navigate to Fleet → Agent Policies → locate policy for integration 0a105cde-521e-46d2-9e56-9b825baa61e6 → edit AWS credentials",
      "After updating credentials, force a restart of the affected agentless pod to trigger a clean collector reload: kubectl -n <agentless-namespace> rollout restart deployment <agentless-deployment-name>"
    ],
    "dependency_edges": [],
    "root_cause": "AWS OTel collector in the agentless component is failing because its awscredentialsprovider extensions have no credentials, assume_role, or profile configured, causing the collector to exit non-zero and the unit to transition to FAILED."
  },
  {
    "event_id": "6ec4af23-a805-4489-9a37-d16dcf807973",
    "timestamp": "2026-07-16T09:51:31.963Z",
    "created_at": "2026-07-16T09:51:31.963Z",
    "discovery_id": "5bf81046-7278-4a1a-ae4c-52d40b3d5765",
    "discovery_slug": "logging-gcp-us-central1-logs-all__beats-and-pubsubbeat-indexing-failures-0c9ccce4",
    "status": "acknowledged",
    "title": "Logging pipeline — ingestion: beats/pubsubbeat indexing failures",
    "summary": "Logging pipeline: indexing failure signal detected in logs-all stream (us-central1). The rule fires on \"Cannot index event\" log patterns; the most recent matching row (07:37Z) contains a Quarkus OTel build-time property conflict rather than a direct Elasticsearch indexing error, suggesting the failure signature may be co-located with OTel config warnings. Trend is upward (trend_change). No exposed dependency edges; impact is bounded to internal telemetry ingestion. Assign to on-call for investigation of ingest pipeline and Quarkus OTel configuration alignment.",
    "criticality": 40,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Beats and Pubsubbeat Indexing Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the ingest pipeline for the logging-gcp-us-central1-logs-all stream: run `kubectl logs -n <beats-namespace> <pubsubbeat-pod> --tail=200 | grep -i 'cannot index'` to identify the specific indexing error and target index.",
      "Fix the Quarkus OTel build-time property conflict: set `quarkus.otel.traces.sampler=parentbased_always_on` in the application build configuration (not runtime), then redeploy the affected service with `kubectl rollout restart deployment/<service-name> -n <namespace>`.",
      "Verify ingest pipeline health: run `GET /_ingest/pipeline/<pipeline-name>/_simulate` against the Elasticsearch cluster to confirm the pipeline accepts the failing document shape."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "e79dbddc-7c03-4788-8cbe-0884e262267f",
    "timestamp": "2026-07-16T09:45:54.894Z",
    "created_at": "2026-07-16T09:45:54.894Z",
    "discovery_id": "2a2450e7-52f3-43c4-8e7c-f4022e6d06a5",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-af3e4141",
    "status": "acknowledged",
    "title": "UIAM — authentication flow: proxy failures",
    "summary": "UIAM authentication flow is failing via the proxy path. Both UIAM service-level errors and proxy authenticate failures (HTTP 4xx+) are confirmed active as of 09:35Z, with the failure spanning the full review window since 00:00Z. Users attempting to log in via the proxy-to-UIAM path may be unable to authenticate. Two credible signals (trend_change and distribution_change) with p-values well below 0.05. Inspect UIAM pod health and proxy authenticate logs to identify the specific failure mechanism.",
    "criticality": 45,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors",
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM pod health and recent restarts: kubectl get pods -n uiam -o wide && kubectl describe pods -n uiam | grep -A5 'Last State'",
      "Inspect UIAM error logs for the specific failure mechanism: kubectl logs -n uiam -l service=uiam --since=1h | grep -E 'ERROR|WARN' | tail -50",
      "Check proxy authenticate endpoint response codes and upstream UIAM connectivity: kubectl logs -n proxy -l service=proxy --since=1h | grep '_authenticate' | grep -v '200\\|204' | tail -50"
    ],
    "dependency_edges": [],
    "root_cause": "UIAM authentication is failing because the proxy authenticate path is returning HTTP 4xx+ responses while UIAM emits ERROR/WARN logs, indicating an active failure in the UIAM auth flow."
  },
  {
    "event_id": "55372f94-376b-459a-973f-f9665bf22d3b",
    "timestamp": "2026-07-16T09:45:19.146Z",
    "created_at": "2026-07-16T09:45:19.146Z",
    "discovery_id": "b2e54999-ef7c-4984-8d58-84f1db7a61d5",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-b5cf6acd",
    "status": "acknowledged",
    "title": "Connectors — SSH: connection failures",
    "summary": "Connectors SSH connection failures are ongoing. At least one connector is failing SSH connection attempts (error code 22), with the most recent failure confirmed at 09:35Z. The failure has been stationary since 00:00Z, suggesting a persistent misconfiguration or unreachable SSH target rather than a transient outage. No user-facing services are confirmed affected via exposed dependency paths. Investigate the SSH target host reachability and connector credential/key configuration.",
    "criticality": 10,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check SSH target host reachability from the connector pod: kubectl exec -n <connector-namespace> <connector-pod> -- ssh -v -o ConnectTimeout=5 <target-host> 2>&1 | head -30",
      "Verify connector SSH key configuration in Kibana: navigate to Stack Management > Connectors, open the affected SSH connector, and re-validate the private key and host fields.",
      "Review connector pod logs for detailed SSH error fields: kubectl logs -n <connector-namespace> <connector-pod> --since=1h | grep -i 'ssh\\|connect\\|22'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f3c5effa-df87-416c-b0d4-f607bf192f0e",
    "timestamp": "2026-07-16T09:45:00.807Z",
    "created_at": "2026-07-16T09:45:00.807Z",
    "discovery_id": "55a9299d-4686-42e3-bb50-f287b297d495",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-f5b4d2a6",
    "status": "acknowledged",
    "title": "O365 ingestion — DLP audit feed: permission error",
    "summary": "O365 DLP audit ingestion is failing due to a missing permission error (AF10001) on the Microsoft subscription start endpoint for DLP.All. The error is confirmed active at 09:32Z with full error text: 'The permission set () sent in the request does not include the expected permission.' DLP audit events have been missing since at least 00:02Z. The fix requires granting ActivityFeed.ReadDlp permissions to the Azure AD app registration and restarting the integration.",
    "criticality": 40,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Grant the required DLP subscription permissions to the Azure AD app registration used by the O365 integration: in Azure Portal, navigate to App Registrations > [app] > API Permissions, add 'ActivityFeed.Read' and 'ActivityFeed.ReadDlp' for Office 365 Management APIs, then grant admin consent.",
      "Restart the affected agentless integration unit after permission grant to trigger a fresh subscription start: kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>",
      "Verify the subscription start succeeds after permission grant: kubectl logs -n <agentless-namespace> <agentless-pod> --since=10m | grep -i 'DLP\\|AF10001\\|subscription'"
    ],
    "dependency_edges": [],
    "root_cause": "O365 DLP ingestion is failing because the subscription start request is missing required permissions, causing AF10001 errors on the Microsoft /activity/feed/subscriptions/start endpoint for DLP.All."
  },
  {
    "event_id": "4fdf6014-7044-4a18-b2d0-4e5f8292a1ff",
    "timestamp": "2026-07-16T09:45:00.788Z",
    "created_at": "2026-07-16T09:45:00.788Z",
    "discovery_id": "8ba3ce83-3f63-4bcf-a9ee-0e0afeac2225",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-2bead409",
    "status": "acknowledged",
    "title": "Agentless integrations — outbound HTTP auth: request failures",
    "summary": "Agentless integrations are experiencing outbound HTTP authentication failures. CEL input retryable HTTP request failures and OAuth token fetch 403 errors are both confirmed active as of 09:35Z. The co-occurrence of both signals suggests a shared credential or permission issue affecting multiple integrations. Failures have been ongoing since 00:00Z. Identify the affected integrations and rotate or re-authorize their OAuth credentials.",
    "criticality": 30,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure",
      "Integration OAuth Token Fetch 403 Forbidden"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify which integrations are affected by OAuth 403 errors: kubectl logs -n <agentless-namespace> -l k8s.elastic.co/agentless-integration-name --since=1h | grep -i 'oauth2\\|403\\|token' | head -50",
      "Rotate or re-authorize the OAuth credentials for the affected integrations in Kibana: navigate to Stack Management > Integrations, locate the failing integration, and re-enter valid OAuth client credentials.",
      "Check if the OAuth token endpoint is rejecting requests due to expired client secrets or revoked app permissions by reviewing the upstream OAuth provider's audit logs."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless integration ingestion is failing because outbound HTTP requests for CEL inputs and OAuth token retrieval are returning errors (including 403 Forbidden), preventing successful authenticated fetches."
  },
  {
    "event_id": "dab3d9a9-eab6-427a-8572-48867adfe76a",
    "timestamp": "2026-07-16T09:44:39.776Z",
    "created_at": "2026-07-16T09:44:39.776Z",
    "discovery_id": "167603fa-2b12-4f95-a076-784b03243db9",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__app-secrets-or-config-object-creation-5b10923c",
    "status": "acknowledged",
    "title": "Agentless API — control plane: unusual config/deployment activity",
    "summary": "Agentless API control plane is logging unusual activity across three signals: unexpected user stack/project types, non-GET HTTP methods on the deployments endpoint, and app config/secrets creation events. All three signals are confirmed active as of 09:35Z. The most recent \"App Secrets or Config Object Creation\" check returned a generic config write message (\"Saving cursor to config map\"), suggesting the rule may be broader than creation-specific events. The \"Unexpected Stack/Project Type\" signal returned \"App config created successfully\" at 08:09Z. Activity has been stationary since 00:00Z. Review audit context to confirm whether this is authorized automation or potential misuse.",
    "criticality": 20,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Unexpected User Stack Type or Project Type",
      "Unexpected HTTP Method on Deployments Endpoint",
      "App Secrets or Config Object Creation"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Audit recent non-GET requests to /api/v1/serverless/deployments: kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --since=2h | grep -E 'POST|DELETE|PATCH' | head -50",
      "Review app config/secrets creation events in the agentless API audit log for the past 24h to identify the requesting principal: kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --since=24h | grep -i 'creating app\\|config object\\|secrets' | head -50",
      "Verify that all non-GET deployment API calls originate from known automation principals by cross-referencing tls.client.subject values against the authorized service account list."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "038b46a2-a6f5-43ad-90b5-bb1d125a3bde",
    "timestamp": "2026-07-16T09:30:49.013Z",
    "created_at": "2026-07-16T09:30:49.013Z",
    "discovery_id": "c8652163-cb6b-4bf9-8945-c88ec7b5d7cb",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__http-non-200-response-from-agentless-api-dcc52492",
    "status": "acknowledged",
    "title": "Agentless API — provisioning: non-200 responses and namespace already exists",
    "summary": "Agentless API: non-200 HTTP responses (including a 500 server error) and provisioning namespace conflicts confirmed in us-central1. Volume is low (2 non-200s, 1 namespace conflict) but the 500 indicates a server-side error and the namespace conflict at 09:05Z is very recent. No exposed dependency edges; impact is bounded to agentless provisioning operations. Assign as a ticket to fix provisioning idempotency and investigate the 500 handler.",
    "criticality": 35,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "HTTP Non-200 Response from Agentless API",
      "Namespace Already Exists During Provisioning"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Investigate the 500 error in agentless API: run `kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --tail=500 | grep -E '\"status\":500|level=error'` to identify the failing handler and stack trace.",
      "Fix provisioning idempotency: update the agentless API namespace creation logic to use `kubectl apply` semantics or add a pre-check for existing namespaces before creation — patch the relevant handler in the agentless-api deployment with `kubectl set env deployment/agentless-api -n agentless-api NAMESPACE_CONFLICT_STRATEGY=ignore`.",
      "Monitor 500 rate: run `kubectl top pods -n agentless-api` and check for pod restarts with `kubectl get pods -n agentless-api` to determine if the 500s are isolated or spreading."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "27deecfe-9b71-41c4-8b49-3e909ff32cd8",
    "timestamp": "2026-07-16T09:30:12.351Z",
    "created_at": "2026-07-16T09:30:12.351Z",
    "discovery_id": "acaa8770-fced-4d37-a91e-161816791131",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__go-panic-in-agentless-component-cbeb6e3a",
    "status": "acknowledged",
    "title": "Agentless components — runtime: Go panics (seccomp policy already registered)",
    "summary": "Agentless components: heartbeat/synthetics crashing with Go panics due to seccomp policy double-registration in us-central1. The crash occurs in the OTel receiver factory when spawning new synthetics units — heartbeat's security module calls MustRegisterPolicy twice, triggering a fatal panic. Most recent crash at 09:20Z (active). Two independent spike detections with very strong p-values confirm this is a real regression, likely introduced by a recent beats version update (commit 8674b2f08772, 2026-07-14). Internal only, no exposed edges. Assign to engineering for rollback or hotfix of the seccomp registration guard.",
    "criticality": 55,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Go Panic in Agentless Component",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Pin the affected agentless heartbeat/synthetics component to the last known-good version: identify the current image tag from `kubectl get deployment -n <agentless-namespace> -o jsonpath='{.spec.template.spec.containers[*].image}'` and roll back with `kubectl rollout undo deployment/<heartbeat-deployment> -n <agentless-namespace>`.",
      "File an engineering bug against `github.com/elastic/beats/v7/heartbeat/security/seccomp.go:55` (MustRegisterPolicy) for the double-registration when spawning new synthetics units via the OTel receiver factory — the fix is to guard with a sync.Once or check-before-register pattern.",
      "Monitor crash frequency: run `kubectl get events -n <agentless-namespace> --field-selector reason=BackOff --sort-by=.lastTimestamp | tail -20` to assess whether the crash loop is accelerating and whether a pod restart or rollback is needed immediately."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "de5c4c2a-d3ed-484e-acf9-11f04016a2e3",
    "timestamp": "2026-07-16T09:29:55.735Z",
    "created_at": "2026-07-16T09:29:55.735Z",
    "discovery_id": "1d2a3bb1-7cae-4dc1-a855-565dc5948689",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-da8e72da",
    "status": "acknowledged",
    "title": "Agentless OTel Collector — AWS inputs: missing credentials configuration",
    "summary": "Agentless OTel Collector: AWS inputs failing due to missing credentials configuration, causing active crash-recovery loops in us-central1. Six AWS input types (EC2, Lambda, ECS, RDS, ELB, SQS) for deployment c381c86f are all misconfigured — awscredentialsprovider requires credentials, assume_role, or profile to be set. Most recent crash at 09:20Z. Internal only, no exposed edges. Assign as a ticket to fix the awscredentialsprovider config for the affected agentless deployment.",
    "criticality": 58,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the awscredentialsprovider configuration for the affected agentless deployment: edit the OTel collector config to either set `credentials`, `assume_role`, or `profile` under each `awscredentialsprovider` extension, or remove the `auth` option to use the default SDK credential chain — apply with `kubectl edit configmap otelcol-config -n <agentless-namespace>`.",
      "Identify the affected agentless deployment ID from the collector config name (visible in the error: `otelcol-aws-ec2-c381c86f-b108-453b-89d5-6a259474ea72`) and check its policy configuration in Fleet: `kubectl get agentlesspolicy -n agentless-api | grep c381c86f`.",
      "Restart the OTel collector pod after fixing the config to stop the crash loop: `kubectl rollout restart deployment/<otelcol-deployment-name> -n <agentless-namespace>`."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "e9b228aa-1fe1-4131-89d0-4f9cd1a83a5c",
    "timestamp": "2026-07-16T09:12:26.320Z",
    "created_at": "2026-07-16T09:12:26.320Z",
    "discovery_id": "disc-proxy-20260716",
    "discovery_slug": "logging-gcp-us-central1-logs-all__external-unauthorized-access-attempts-1bb78010",
    "status": "promoted",
    "title": "Proxy — request handling: requestError + external 401s",
    "summary": "Proxy: active requestErrors and external 401 unauthorized access attempts confirmed at the ingress proxy layer as of 00:18:55Z. Both signals are live and ongoing. The dip change type on the requestError rule indicates the proxy went silent on error logging — consistent with a service-level disruption. External 401s are occurring simultaneously, suggesting either an auth misconfiguration or an active unauthorized access campaign. All user traffic routes through this proxy. Immediate action: inspect proxy pod health and auth configuration to determine if this is a routing/auth failure or an attack pattern.",
    "criticality": 76,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy Request Error Logger",
      "External Unauthorized Access Attempts"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy pod health immediately: kubectl get pods -n ingress-proxy -o wide && kubectl describe pods -n ingress-proxy | grep -A5 'Events'",
      "Inspect live proxy error logs for root cause: kubectl logs -n ingress-proxy -l app.kubernetes.io/name=proxy --tail=100 | grep -i 'error\\|401\\|unauthorized'",
      "If auth misconfiguration confirmed, roll back the most recent proxy or auth config change: kubectl rollout undo deployment/ingress-proxy -n ingress-proxy"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "860a3703-e14c-40c0-bdd1-50a2ab73819c",
    "timestamp": "2026-07-16T08:51:07.623Z",
    "created_at": "2026-07-16T08:51:07.623Z",
    "discovery_id": "752c6a0c-5671-40f5-9d73-c446a264ed0c",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-66a47b62",
    "status": "acknowledged",
    "title": "Proxy — HTTP: server errors",
    "summary": "Proxy service: increasing HTTP 5xx server error rate detected (trend_change). Affects traffic routed through the proxy service. 5xx rows confirmed present in logs since at least 2026-07-15T06:25Z with an upward trend; the specific error mechanism could not be confirmed from the projected fields. Retrieve proxy error logs to identify the failing upstream dependency or handler and determine if this correlates with the agentless credential failures.",
    "criticality": 50,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy service error logs for the specific 5xx failure mode: `kubectl logs -n <namespace> deployment/proxy --since=1h | grep -E '5[0-9]{2}'` to identify the upstream dependency or handler causing server errors.",
      "Review recent proxy deployments or configuration changes: `kubectl rollout history deployment/proxy -n <namespace>` and consider rolling back if a recent change correlates with the 5xx trend onset.",
      "If the proxy is upstream of agentless API or connectors services, check whether the 5xx errors correlate with the credential/auth failures in the agentless environment — the proxy may be returning 5xx due to upstream 401/auth failures."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "901792c8-23dc-4be6-b8b8-7623171f7bc0",
    "timestamp": "2026-07-16T08:49:42.174Z",
    "created_at": "2026-07-16T08:49:42.174Z",
    "discovery_id": "8c4245bb-d2da-4d32-9e97-13254e99df5f",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-python-client-api-retry-error-d770e685",
    "status": "acknowledged",
    "title": "Connectors — configuration validation: required fields missing",
    "summary": "Connectors service: connector runs are failing due to missing or invalid configuration fields (service type not configured, required service account field empty) and are retrying API operations. Affects connector sync jobs for integrations on the connectors-python path. Failures confirmed active since at least 2026-07-15T06:25Z and still present at 06:29Z. Inspect recent connector configuration changes and correct missing required fields via Fleet UI.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured",
      "Connectors Python Client API Retry Error",
      "Notion Connector API Token Invalid",
      "Fleet Config Update Received by Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect and correct connector configuration for affected connectors: in Fleet UI, navigate to Integrations > Connectors, identify connectors with 'Service type is not configured' errors, and set the required service type and service account fields.",
      "Check for recent Fleet policy changes that may have cleared connector configuration fields: `kubectl get configmap -n <namespace> | grep connector` and compare with last known-good configuration.",
      "For Notion connector API token failures: rotate the Notion API token in the integration settings via Fleet UI > Integrations > Notion Connector > Edit and update the API token field."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors service is failing because required connector configuration fields are missing or invalid (service type not configured / required service account field empty), causing configuration validation errors and API retries."
  },
  {
    "event_id": "fade89ab-2c8f-43ce-8f67-337d641a9285",
    "timestamp": "2026-07-16T08:48:51.903Z",
    "created_at": "2026-07-16T08:48:51.903Z",
    "discovery_id": "72f7af1e-d780-4a92-9f81-c94f9768a527",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-aa837291",
    "status": "acknowledged",
    "title": "Agentless integrations — component startup: FAILED/DEGRADED due to credential/permission errors",
    "summary": "Agentless integrations: multiple components are failing or degrading due to invalid credential and permission configuration across AWS, Azure, GCP, and O365 integration types. Affects agentless data collection in us-central1 — cloudbeat CSPM (GCP), AWS CloudWatch OTel collector, Azure OAuth integrations, and O365 DLP are all impacted. Failures confirmed active as recently as 08:44Z with no recovery; onset from at least 04:05Z. Rotate/reconfigure AWS credentials, renew Azure OAuth client secret, and grant O365 DLP permissions immediately.",
    "criticality": 55,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component",
      "Agentless Unit Spawn Fatal Error",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat",
      "Libbeat Output Write Latency Spike",
      "Libbeat Output Read Errors",
      "Connectors SSH Connection Failure",
      "O365 DLP Subscription Permission Error (AF10001)",
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate or reconfigure AWS credentials for all affected agentless CloudWatch integrations: update the Fleet policy for each affected integration to include valid credentials, assume_role, or profile in the AWS credentials provider section (`kubectl edit configmap elastic-agent-config -n <namespace>` or via Fleet UI > Integrations > AWS).",
      "Renew the Azure OAuth client secret for integrations failing with AADSTS7000222: navigate to Azure AD > App Registrations > <app> > Certificates & Secrets, create a new secret, and update the Fleet integration policy with the new secret value.",
      "Grant the missing O365 DLP subscription permissions for the AF10001 error: in Microsoft 365 Admin Center, assign the required compliance/DLP subscription permissions to the service account used by the O365 integration, then restart the affected agentless unit via Fleet UI."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed components are failing because integration credential and permission configuration is invalid: AWS OTel collector awscredentialsprovider is missing credentials/assume_role/profile for multiple CloudWatch inputs, Cloudbeat is exiting with code 1, and O365 DLP subscription attempts fail with AF10001 due to missing permissions."
  },
  {
    "event_id": "dcee6180-c34f-4320-94da-58a902c7a786",
    "timestamp": "2026-07-16T08:45:08.719Z",
    "created_at": "2026-07-16T08:45:08.719Z",
    "discovery_id": "0ba2bf39-e18c-4515-8c4b-b55c498deec1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-elasticsearch-index-not-found-56d93c96",
    "status": "acknowledged",
    "title": "Connectors service — job state storage: index not found",
    "summary": "Connectors service: sync job state index .elastic-connectors-sync-jobs is missing, causing index_not_found_exception on every access attempt. Affects all connector sync job scheduling and execution in the agentless environment. Errors confirmed active as recently as 08:44Z with no recovery; the index has been absent since at least 06:45Z. Create or restore the missing .elastic-connectors-sync-jobs index, or validate connector index bootstrap configuration.",
    "criticality": 50,
    "confidence": 0.67,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Index Not Found"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restore or recreate the missing index: POST /_index_template/... or run the connectors bootstrap command: `./bin/elastic-connectors bootstrap` to recreate .elastic-connectors-sync-jobs with the correct mapping.",
      "Check if a recent index deletion or ILM policy rollover removed the index: `GET /_cat/indices/.elastic-connectors*?v` and review cluster audit logs for delete operations.",
      "If the index was intentionally removed, re-run the connectors service initialization: `kubectl rollout restart deployment/elastic-connectors -n <namespace>` to trigger index auto-creation on startup."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors service is failing because the Elasticsearch index .elastic-connectors-sync-jobs does not exist, causing index_not_found_exception on access."
  },
  {
    "event_id": "4467a7ad-a0cb-49e0-ae18-e3309beee807",
    "timestamp": "2026-07-16T08:41:44.196Z",
    "created_at": "2026-07-16T08:41:44.196Z",
    "discovery_id": "1f636122-d343-4719-aefe-b3beb85810a7",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-service-type-not-configured-dd9b58ae",
    "status": "acknowledged",
    "title": "Connectors service — runtime tasks: gRPC component destroyed",
    "summary": "Connectors service: runtime task errors due to gRPC component teardown. The connectors-py component is receiving StatusCode.UNAVAILABLE because its internal gRPC component is being destroyed. Stationary detection indicates this is an ongoing steady-state failure. Investigate why the connectors component is being destroyed and restart if in a crash loop.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check connectors-py component lifecycle and whether it is being restarted/destroyed by the agent: `kubectl logs -n agentless -l component.type=connectors-py --tail=100`",
      "If the gRPC component is being destroyed due to a crash loop, restart the connectors deployment: `kubectl rollout restart deployment/agentless-connectors -n agentless`",
      "Verify the connector service type is correctly configured in Fleet: navigate to Fleet > Integrations > Connectors and confirm the service type field is populated"
    ],
    "dependency_edges": [],
    "root_cause": "Connectors python component is failing because its internal gRPC component is being destroyed, causing StatusCode.UNAVAILABLE during connector task execution."
  },
  {
    "event_id": "4e6b5911-5b69-4a0d-95dc-cda7aa4f0a34",
    "timestamp": "2026-07-16T08:41:22.230Z",
    "created_at": "2026-07-16T08:41:22.230Z",
    "discovery_id": "572d65e3-0552-45aa-aadd-10f6cf539479",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-state-registry-cleanup-failure-5cba862b",
    "status": "acknowledged",
    "title": "Agentless HTTPJSON/CEL — state registry: 404 not found errors",
    "summary": "Agentless HTTPJSON/CEL integrations: retryable HTTP request failures and state registry cleanup errors confirmed. The agentless-state-httpjson Elasticsearch index is returning 404 Not Found, preventing registry cleanup. Sustained step-change in HTTPJSON failures since onset. Investigate whether the state index was deleted or ILM-rolled, and restore it to unblock registry operations.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Retryable HTTP Request Failures",
      "CEL State Registry Cleanup Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check whether the agentless-state-httpjson index exists and has correct ILM policy: `curl -s -X GET 'https://<es-host>/_cat/indices/agentless-state-httpjson*?v'`",
      "If the index is missing, recreate it or restore from snapshot: `curl -s -X PUT 'https://<es-host>/agentless-state-httpjson' -H 'Content-Type: application/json' -d '{\"settings\":{\"number_of_shards\":1}}'`",
      "Investigate upstream HTTPJSON endpoint availability and check for rate limiting or auth issues causing retryable failures: review integration credentials and endpoint health"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless HTTPJSON/CEL pipeline is failing because its state registry operations against Elasticsearch return 404 Not Found for expected state documents, preventing cleanup and correlating with retryable HTTPJSON request failures."
  },
  {
    "event_id": "e7114065-f282-42ec-92b5-2cd0ea5e4d44",
    "timestamp": "2026-07-16T08:40:51.340Z",
    "created_at": "2026-07-16T08:40:51.340Z",
    "discovery_id": "063bf949-54b1-429b-9a76-bff243655e96",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__elastic-agent-rpc-context-canceled-error-8b305f03",
    "status": "acknowledged",
    "title": "Elastic Agent — internal RPC: context canceled errors",
    "summary": "Elastic Agent: RPC context canceled error detection has settled (dip). Evidence is inconclusive — no query KI available to confirm or refute active errors. The dip signal suggests the error rate dropped, but cannot be confirmed as resolved without a valid query. Monitor and close if no errors reproduced in the next 30 minutes.",
    "criticality": 40,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Elastic Agent RPC Context Canceled Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Query the agentless log stream for 'context canceled' RPC errors to confirm or rule out active failures: check logs for elastic-agent RPC operations in the last hour",
      "If errors are confirmed active, restart the elastic-agent process: `kubectl rollout restart deployment/elastic-agent -n agentless`",
      "If errors are absent, close this ticket as resolved after a 30-minute clean window"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "59273da9-7caf-4d59-8db6-22e723ef505b",
    "timestamp": "2026-07-16T08:40:17.430Z",
    "created_at": "2026-07-16T08:40:17.430Z",
    "discovery_id": "06a3f068-908f-45c0-b66d-c897307ff7fa",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-component-meta-file-corruption-baba0dd2",
    "status": "resolved",
    "title": "HTTPJSON component — configuration: invalid credentials JSON",
    "summary": "HTTPJSON component: launcher stopped due to invalid credentials JSON in GCP config. Detection has settled (dip). The component was unable to initialize due to a corrupted/truncated credentials JSON file. Episode is resolved — the dip signal indicates the failure rate has dropped.",
    "criticality": 45,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Component Meta File Corruption"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect and repair the HTTPJSON component credentials JSON file: `kubectl exec -n agentless <agentless-pod> -- cat /agentless/data/components/<httpjson-component-id>/meta.json` and validate JSON syntax",
      "Re-enroll or re-configure the affected HTTPJSON integration via Fleet UI to regenerate a valid credentials file",
      "Restart the affected HTTPJSON component after credentials are corrected: `kubectl rollout restart deployment/agentless-httpjson -n agentless`"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "08b7de8f-1376-4220-8dce-83449e0c4fe1",
    "timestamp": "2026-07-16T08:38:32.943Z",
    "created_at": "2026-07-16T08:38:32.943Z",
    "discovery_id": "396da225-9546-4250-808c-4ee1637eb702",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-d3f75e8f",
    "status": "acknowledged",
    "title": "Agentless components — startup: seccomp panic causing FAILED state",
    "summary": "Agentless components: seccomp double-registration panic causing persistent FAILED state. Heartbeat and Synthetics spawned units are crashing on startup due to 'panic: a seccomp policy is already registered' in the OTel receiver initialization path. Confirmed still active at 08:31:19Z — 36 minutes after onset. Multiple component types affected (CEL, Synthetics, Cloudbeat). Assign to the agentless platform team; roll back to the pre-8674b2f08772 Heartbeat build or patch MustRegisterPolicy to guard against double-registration.",
    "criticality": 65,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Go Panic in Agentless Component",
      "Component State Transitioned to FAILED (component.state)",
      "Libbeat Output Write Errors",
      "Libbeat Output Write Latency Spike",
      "CEL Input Retryable HTTP Request Failure",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Agentless Component Entered FAILED State"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Pin or roll back the agentless Heartbeat/Synthetics component to the last known-good build before commit 8674b2f08772 (2026-07-14): `kubectl set image deployment/agentless-heartbeat heartbeat=docker.elastic.co/beats/heartbeat:<previous-tag> -n agentless`",
      "Patch the seccomp double-registration in heartbeat/security/seccomp.go: add a guard in MustRegisterPolicy to skip re-registration if a policy is already set, then rebuild and redeploy: `kubectl rollout restart deployment/agentless-heartbeat -n agentless`",
      "Monitor component FAILED state rate after rollback: `kubectl get events -n agentless --field-selector reason=Failed --watch`"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed Heartbeat/Synthetics components are failing because seccomp policy registration is attempted twice during OTel receiver initialization (heartbeat/security/seccomp.go:55 MustRegisterPolicy), causing a Go panic and forcing spawned units into FAILED state."
  },
  {
    "event_id": "75e5b9b2-51e3-494b-8e94-41fa66da72eb",
    "timestamp": "2026-07-16T08:24:37.003Z",
    "created_at": "2026-07-16T08:24:37.003Z",
    "discovery_id": "5590cd44-0eb6-479b-9f85-c15146246d01",
    "discovery_slug": "logging-gcp-us-central1-logs-all__external-unauthorized-access-attempts-8d7847db",
    "status": "acknowledged",
    "title": "Proxy — edge routing/auth: cross-AZ routing + 401 unauthorized",
    "summary": "Proxy is generating cross-AZ backend routing decisions and returning 401 unauthorized responses to external clients. External clients traversing the proxy may be blocked. Ongoing from ~06:55Z. Validate proxy routing policy and auth configuration/state immediately.",
    "criticality": 62,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy Cross-AZ Backend Routing",
      "External Unauthorized Access Attempts"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy auth configuration and token/cert validity: kubectl exec -n ingress-proxy <proxy-pod> -- cat /etc/proxy/auth-config.yaml | grep -E 'token|cert|expiry'",
      "Review proxy routing policy for cross-AZ backend selection: kubectl get configmap -n ingress-proxy proxy-config -o yaml | grep -A5 routing",
      "Check if a recent proxy deployment changed auth or routing config: kubectl rollout history deployment/ingress-proxy-us-central1-a -n ingress-proxy"
    ],
    "dependency_edges": [],
    "root_cause": "Proxy service is generating cross-AZ backend routing decisions and rejecting external requests with 401 because routing/auth policy decisions at the proxy are producing non-local backend selection and unauthorized responses."
  },
  {
    "event_id": "4ab1a552-b5da-43f2-87cc-e8d2c3eda8fe",
    "timestamp": "2026-07-16T08:23:56.088Z",
    "created_at": "2026-07-16T08:23:56.088Z",
    "discovery_id": "fc0ee2d7-a778-41a0-9fc8-2f610b89e27d",
    "discovery_slug": "logging-gcp-us-central1-logs-all__docker-registry-authorization-warnings-347eff78",
    "status": "acknowledged",
    "title": "Container library — docker registry: authorization warnings",
    "summary": "Docker registry authorization warnings observed from container-library namespace workloads. Workloads may fail to pull images. Ongoing from ~06:55Z. Check registry credentials/token validity for container-library workloads.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Docker Registry Authorization Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check registry credentials/token validity for container-library workloads: kubectl get secrets -n container-library | grep registry",
      "Rotate the docker registry pull secret if expired: kubectl create secret docker-registry regcred --docker-server=<registry> --docker-username=<user> --docker-password=<token> -n container-library --dry-run=client -o yaml | kubectl apply -f -",
      "Check which pods are failing image pulls: kubectl get events -n container-library --field-selector reason=Failed | grep -i pull"
    ],
    "dependency_edges": [],
    "root_cause": "Container-library workloads are emitting docker registry authorization warnings because registry credentials or token validation is failing during registry access attempts."
  },
  {
    "event_id": "3fc79258-5a07-49a6-93ae-bf2e3dab7bc7",
    "timestamp": "2026-07-16T08:23:26.553Z",
    "created_at": "2026-07-16T08:23:26.553Z",
    "discovery_id": "e84e298d-9e17-4b5f-a783-18a6ad609ca9",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-fleet-checkin-json-parse-failu-50e3ff70",
    "status": "acknowledged",
    "title": "Agentless Fleet — config ingestion: required fields missing",
    "summary": "Agentless fleet check-in and connectors are failing due to missing required configuration fields. Fleet check-in JSON parse failures and connector field validation errors both confirmed. Ongoing from ~06:55Z. Identify and correct the missing required config fields/tokens in Fleet UI.",
    "criticality": 55,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Fleet Checkin JSON Parse Failure",
      "Connectors Missing Required Configuration Fields"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify which fleet check-in actions are failing to unmarshal: kubectl logs -n <agentless-namespace> -l component=fleet-agent --tail=100 | grep 'failed to unmarshal checkin actions'",
      "Identify which connector configuration fields are missing: kubectl logs -n <agentless-namespace> -l service.type=connectors-python --tail=100 | grep 'Field validation errors'",
      "Correct the missing required configuration fields in Fleet UI: Fleet > Agent Policies > <affected policy> > connector integration > fill in all required fields"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless fleet check-in and connectors are failing because required configuration fields are missing/empty, triggering request/config validation errors at ingestion/processing time."
  },
  {
    "event_id": "c12c8512-ee0e-44b1-9946-7dcea2625d72",
    "timestamp": "2026-07-16T08:23:00.671Z",
    "created_at": "2026-07-16T08:23:00.671Z",
    "discovery_id": "6decd2fb-abac-413e-abc2-366abeaac680",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__elastic-agent-data-directory-symlink-mis-3e83d1d5",
    "status": "acknowledged",
    "title": "Agentless telemetry — collector runtime: restart loops / socket closes",
    "summary": "Agentless telemetry components are degraded: elastic-agent missing symlink errors, OTel collector recovery restart loops, and stats endpoint closures all confirmed. Agentless telemetry ingestion may be degraded. Ongoing from ~06:55Z. Check agentless pod filesystem/volume health and OTel collector process stability.",
    "criticality": 58,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Elastic Agent Data Directory Symlink Missing",
      "OTel Collector Accumulated High Recovery Retry Count",
      "OTel Stats Endpoint Closed Network Connection"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless pod filesystem/volume health: kubectl exec -n <agentless-namespace> <agentless-pod> -- ls -la /agentless/data/ to verify the elastic-agent symlink exists",
      "Restart the affected agentless pod to force symlink re-creation: kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>",
      "Monitor OTel collector recovery retry count: kubectl logs -n <agentless-namespace> -l log.logger=otel_manager --tail=50 | grep 'total retries' to assess whether retries are stabilizing or escalating"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless OTel/Elastic Agent components are unstable because the local runtime filesystem/symlink state is inconsistent (missing versioned home symlink), leading to cleanup errors and contributing to collector recovery restart loops and stats endpoint shutdowns."
  },
  {
    "event_id": "dde03d7e-94f3-4878-9a09-af7777ea50df",
    "timestamp": "2026-07-16T08:22:28.729Z",
    "created_at": "2026-07-16T08:22:28.729Z",
    "discovery_id": "039b39dc-4ef7-4b6d-b607-b34c38f4cbc8",
    "discovery_slug": "logging-gcp-us-central1-logs-all__zwischending-s3-proxy-errors-e40014e2",
    "status": "acknowledged",
    "title": "Zwischending — S3 proxy: errors",
    "summary": "Zwischending S3 proxy is emitting ERROR-level logs from the zwischending-production-vanilla deployment. S3 proxy-dependent operations may fail. Ongoing from ~06:55Z. Pull richer error logs to identify the failing upstream or request type.",
    "criticality": 40,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Zwischending S3 Proxy Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Pull richer error logs from the zwischending deployment: kubectl logs -n <zwischending-namespace> -l app=zwischending-production-vanilla --tail=100 | grep -i error",
      "Check S3 upstream connectivity from the zwischending pod: kubectl exec -n <zwischending-namespace> <zwischending-pod> -- curl -v <s3-endpoint>",
      "Review recent deployment changes: kubectl rollout history deployment/zwischending-production-vanilla -n <zwischending-namespace>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "c5c7819d-ef85-4071-8284-5e0b20222b19",
    "timestamp": "2026-07-16T08:21:39.178Z",
    "created_at": "2026-07-16T08:21:39.178Z",
    "discovery_id": "83eb148a-b288-409e-bf64-66b4dafe535a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-107ee98c",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/CEL — startup: seccomp panic",
    "summary": "Agentless Heartbeat/CEL components crash on startup with a Go panic: seccomp policy double-registration. Affects agentless Heartbeat/Synthetics and CEL-based workloads. Confirmed still active at 08:19:26Z. Roll back the heartbeat component image or disable the affected integration to stop the crash loop.",
    "criticality": 45,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the agentless pod logs for the affected component: kubectl logs -n <agentless-namespace> -l component.id=cel-es-default-output-internal --tail=50 | grep -E 'seccomp|panic|Fatal'",
      "Roll back the heartbeat/synthetics component image to the previous known-good version: kubectl set image deployment/<agentless-deployment> agentless=<previous-image-tag> -n <agentless-namespace>",
      "If rollback is not immediately possible, disable the affected Heartbeat/CEL integration in Fleet UI to stop the crash loop: Fleet > Agent Policies > <policy> > disable Heartbeat/Synthetics input"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless Heartbeat/CEL is failing because seccomp policy registration runs twice during startup and panics with 'a seccomp policy is already registered', terminating the process."
  },
  {
    "event_id": "91375215-fbac-46da-9ad8-aea6e3a9d958",
    "timestamp": "2026-07-16T08:21:11.847Z",
    "created_at": "2026-07-16T08:21:11.847Z",
    "discovery_id": "65cc6d4f-d17f-46c7-8fac-a592488ad239",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-6f6afd6c",
    "status": "acknowledged",
    "title": "AWS OTel Collector — startup: missing credentials configuration",
    "summary": "AWS OTel Collector startup fails due to missing AWS credentials configuration across multiple awscredentialsprovider extensions. Affects AWS data collection for agentless integrations. Confirmed still active at 08:19:29Z. Ensure the integration policy provides a valid credentials method (credentials/assume_role/profile) so the collector can start.",
    "criticality": 40,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the affected integration policy in Fleet UI: navigate to Fleet > Agent Policies > <AWS integration policy> and verify the awscredentialsprovider extension has credentials, assume_role, or profile configured",
      "If using IAM role-based auth, ensure the agentless pod's service account has the correct workload identity binding: kubectl describe serviceaccount -n <agentless-namespace> <agentless-sa>",
      "If credentials are missing entirely, add them via Fleet UI or patch the integration policy: fleet-server API PATCH /api/fleet/agent_policies/<policy-id> with the correct AWS credentials block"
    ],
    "dependency_edges": [],
    "root_cause": "AWS OTel Collector is failing because its awscredentialsprovider has no credentials, assume_role, or profile configured, so the collector cannot authenticate and exits."
  },
  {
    "event_id": "c6780d26-0525-4f55-a38d-e0f0b11d6740",
    "timestamp": "2026-07-16T08:20:47.539Z",
    "created_at": "2026-07-16T08:20:47.539Z",
    "discovery_id": "61e87324-63bc-42a9-82e7-3380fde93b6e",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-retryable-http-request-failures-a31a0d9b",
    "status": "acknowledged",
    "title": "HTTPJSON — upstream: retryable HTTP failures",
    "summary": "HTTPJSON inputs are actively failing outbound HTTP requests after retries, affecting agentless integrations using httpjson inputs. Failure confirmed still active at 08:19:31Z. Identify which integration endpoint is failing and restore successful upstream HTTP calls.",
    "criticality": 40,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Retryable HTTP Request Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check which httpjson integration endpoint is failing: kubectl logs -n <agentless-namespace> -l component.id=httpjson-es-default-output-internal --tail=100 | grep 'request failed'",
      "Verify upstream API reachability from the agentless pod: kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v <upstream-api-endpoint>",
      "If a specific integration token/credential is expired, rotate it via Fleet UI: navigate to Fleet > Agent Policies > <affected policy> > httpjson integration > update API key/token"
    ],
    "dependency_edges": [],
    "root_cause": "HTTPJSON-based integrations are failing because outbound HTTP requests are exhausting retries and still failing, preventing successful upstream API fetches."
  },
  {
    "event_id": "fd005256-2358-4cc7-be67-3480451e6509",
    "timestamp": "2026-07-16T08:11:49.017Z",
    "created_at": "2026-07-16T08:11:49.017Z",
    "discovery_id": "0d7c21f8-60e9-4d59-ba26-4f5bd6a692c1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__all-error-level-log-entries-435a1c4b",
    "status": "acknowledged",
    "title": "Agentless telemetry pipeline — OTel collector: collector exits with invalid AWS credentials configuration",
    "summary": "Agentless telemetry pipeline OTel collector is continuously exiting with an invalid AWS credentials configuration error, preventing AWS CloudWatch telemetry ingestion. Affects agentless deployments with AWS CloudWatch integrations in logging-gcp-us-central1 (policy 932e7bad). Failure confirmed active as of 08:01:51Z with the collector in a recovery loop since at least 00:00Z. Patch or revert the awscredentialsprovider configuration in the affected agent policy to restore collector startup.",
    "criticality": 65,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Exited with Error (otel_manager)",
      "All Error-Level Log Entries",
      "Cloudbeat Launcher Fatal Exit"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Patch the OTel collector configuration for the affected agentless deployment to remove or correctly configure the awscredentialsprovider extension: kubectl edit configmap <otel-collector-config> -n <affected-namespace> and either remove the awscredentialsprovider extension or add the required credentials/assume_role/profile fields",
      "If the awscredentialsprovider was added by a recent config change, revert the agent policy in Fleet/Kibana to the last known-good version for the affected agentless deployment (policy ID visible in the collector error: 932e7bad-bbd6-4053-bfdb-78351a266427)",
      "Monitor the otel_manager logger in the agentless log stream for 'collector started' messages to confirm recovery after the config fix: FROM $.logging-gcp-us-central1-logs-agentless-log-default | WHERE log.logger == \"otel_manager\" AND message : \"started\" | SORT @timestamp DESC | LIMIT 5"
    ],
    "dependency_edges": [],
    "root_cause": "otel_manager is failing because the OTel collector configuration enables awscredentialsprovider without providing credentials/assume_role/profile for multiple AWS CloudWatch input extensions, causing the collector to exit with an invalid configuration error and enter a recovery loop."
  },
  {
    "event_id": "0369dff9-0541-4acd-9fff-468c5b199469",
    "timestamp": "2026-07-16T08:11:29.540Z",
    "created_at": "2026-07-16T08:11:29.540Z",
    "discovery_id": "48e348d6-7303-483e-a863-87cb67650a84",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-notion-api-response-error-acbb2f10",
    "status": "acknowledged",
    "title": "Notion Connector — upstream: API token invalid causing APIResponseError",
    "summary": "Notion connector is failing all API calls due to an invalid API token, halting Notion content sync. Affects Notion connector(s) in logging-gcp-us-central1. Failure confirmed active as of 08:01:40Z with a stationary signal indicating ongoing failure. Regenerate the Notion API token and update the connector configuration in Kibana to restore sync.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Regenerate the Notion integration token in the Notion workspace settings (Settings & Members > Integrations) and update the connector configuration in Kibana: navigate to Search > Connectors > Notion connector > Edit configuration and paste the new token",
      "Verify the Notion integration has the required capabilities (Read content, Read user information) in the Notion workspace for the pages/databases being synced",
      "Trigger a manual sync after updating the token to confirm connectivity is restored: in Kibana Connectors UI, select the Notion connector and click 'Sync now'"
    ],
    "dependency_edges": [],
    "root_cause": "Notion connector is failing because the configured Notion API token is invalid, causing every API call to return APIResponseError and preventing sync completion."
  },
  {
    "event_id": "9dc3f894-28e5-4e29-90d1-8adaa522abfb",
    "timestamp": "2026-07-16T08:10:02.509Z",
    "created_at": "2026-07-16T08:10:02.509Z",
    "discovery_id": "c1436a25-fa1b-46aa-a227-391af3539659",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__m365-defender-azure-ad-oauth-invalid-cli-68e24358",
    "status": "acknowledged",
    "title": "M365 Defender — auth: invalid_client",
    "summary": "M365 Defender integration is failing Azure AD OAuth authentication with an invalid_client error, halting M365 Defender security data ingestion. Affects the M365 Defender agentless integration in logging-gcp-us-central1. Failure confirmed active as of 08:01:35Z with a strong spike signal (p_value 7.87e-16). Verify and rotate the Azure AD application credentials configured for this integration.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "M365 Defender Azure AD OAuth invalid_client"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and rotate the Azure AD application credentials (client ID and client secret) configured for the M365 Defender integration in Fleet/Kibana: navigate to the affected agentless integration policy and update the OAuth client credentials",
      "Check the Azure AD application registration for the M365 Defender connector to confirm the client secret has not expired and the application has the required API permissions (SecurityEvents.Read.All or equivalent)",
      "If credentials were recently rotated, redeploy the affected agentless integration to pick up the new credentials: kubectl rollout restart deployment/<agentless-deployment> -n <affected-namespace>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "8b91f403-9baa-4f30-bbca-6da60fa497bc",
    "timestamp": "2026-07-16T01:22:08.848Z",
    "created_at": "2026-07-16T01:22:08.848Z",
    "discovery_id": "2d873b74-20260716-0024Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__azure-oauth-client-secret-expired-aadsts-e829684f",
    "status": "acknowledged",
    "title": "Azure OAuth — auth: possible AADSTS7000222 client secret issue",
    "summary": "Azure OAuth AADSTS7000222 errors are present in the agentless log stream (most recent at 01:11Z), indicating an Azure client secret has expired or is invalid for at least one integration. The pattern is stationary (no new spike — chronic background issue). Affected integration data collection is interrupted. Identify the Azure app registration, rotate the expired client secret in the Azure portal, and update the Fleet integration policy.",
    "criticality": 15,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the Azure app registration associated with the failing agentless integration: in Fleet UI, check integration policies using Azure OAuth and cross-reference with the Azure portal (portal.azure.com) under App Registrations to find secrets expiring or expired.",
      "Rotate the expired client secret in the Azure portal: navigate to the app registration → Certificates & secrets → create a new client secret, then update the integration policy in Fleet with the new secret value.",
      "After updating the secret, verify the integration recovers by checking the agentless agent logs: `kubectl logs -n <agentless-namespace> <agentless-pod> | grep AADSTS7000222` — confirm no new errors appear within 5 minutes."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f8fe05ca-f043-48b9-ae83-f3febc4ad13a",
    "timestamp": "2026-07-16T01:21:32.559Z",
    "created_at": "2026-07-16T01:21:32.559Z",
    "discovery_id": "d73823f3-d9b3-52e4-9318-60ed674588d7-137d7c9d-14d6-489c-b784-7d091f58a569",
    "discovery_slug": "otel-default__agent-execution-error-in-researchagent-w-cb9abc6c",
    "status": "acknowledged",
    "title": "Agent Builder — researchAgent workflow: malformed tool_call chunk causes execution errors",
    "summary": "Agent Builder researchAgent workflow executions are failing due to malformed LLM streamed tool_call chunks (missing key), causing agentExecutionError exceptions. Both failure signals confirmed active — most recent errors at 00:56Z. Affects all researchAgent workflow runs; users invoking this agent will receive errors. Investigate upstream model provider response format changes and add defensive handling in the inference chunk-merge logic.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Agent execution error in researchAgent workflow",
      "Tool call key missing in LLM response chunk"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the upstream LLM/model provider's API changelog or status page for any recent changes to tool_call streaming response format that may have introduced missing keys.",
      "Apply a defensive null-check or key-existence guard in the inference chunk-merging logic for tool_call entries: patch the handler to skip or log malformed chunks rather than raising an exception (deploy via `kubectl set image deployment/agent-builder agent-builder=<patched-image> -n <namespace>` or equivalent).",
      "If the model provider supports it, temporarily switch the researchAgent to a non-streaming inference mode to bypass the malformed chunk issue while the fix is developed: update the agent configuration in Fleet or the Agent Builder policy."
    ],
    "dependency_edges": [],
    "root_cause": "Agent Builder researchAgent workflow is failing because the upstream LLM streamed response contains a tool_call entry with a missing key, triggering an exception in the inference chunk-merging logic and terminating the run."
  },
  {
    "event_id": "bcf0f046-ac8f-4403-9662-e3e2670a422d",
    "timestamp": "2026-07-16T01:20:57.362Z",
    "created_at": "2026-07-16T01:20:57.362Z",
    "discovery_id": "c9cc0f33-634c-5efc-a241-2dbbd3dfa10f-137d7c9d-14d6-489c-b784-7d091f58a569",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__otel-collector-accumulated-high-recovery-d5046217",
    "status": "acknowledged",
    "title": "Agentless logging — OTel collector: recovery loop and closed stats connections",
    "summary": "Agentless logging OTel collector is in an active restart loop with accumulating recovery retries and closed stats endpoint connections, confirmed still firing at 01:14Z. Affects internal telemetry export and stats scraping for the agentless logging environment. No direct user-facing data collection impact confirmed. Inspect the collector crash reason and restart the agentless pod to reset the retry loop.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Accumulated High Recovery Retry Count",
      "OTel Stats Endpoint Closed Network Connection"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the OTel collector process logs for the root restart reason: `kubectl logs -n <agentless-namespace> <agentless-pod> -c otel-collector --previous` to capture the last crash output.",
      "If the collector is crash-looping, restart the agentless pod to reset the retry counter: `kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>`.",
      "Check whether the OTel stats endpoint target is reachable from the agentless pod: `kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v <stats-endpoint-url>` and fix any network policy or endpoint misconfiguration blocking the connection."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless logging OTel collector is unstable because its recovery loop is repeatedly restarting (high retry count) and it is closing network connections on the stats endpoint, interrupting telemetry export and stats scraping."
  },
  {
    "event_id": "892c0e60-402b-40e9-8a0b-fd325eab4541",
    "timestamp": "2026-07-16T00:32:00.873Z",
    "created_at": "2026-07-16T00:32:00.873Z",
    "discovery_id": "9f1df31b-20260716-0024Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__zwischending-s3-proxy-errors-1ad96126",
    "status": "acknowledged",
    "title": "Zwischending — S3 proxy: errors signal",
    "summary": "Zwischending production S3 proxy is logging ERROR-level events indicating failures when proxying requests to S3 artifact storage. Signal is active as of 00:29 UTC with indeterminable change type. Affects artifact delivery workflows. Check whether errors are concentrated on specific artifact paths or represent a broad S3 connectivity failure, and verify S3 credentials and bucket accessibility from the Zwischending pod.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Zwischending S3 Proxy Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Zwischending pod logs for S3 error details and affected artifact paths: kubectl -n <zwischending-namespace> logs deploy/zwischending-production-vanilla --since=1h | grep -i 'ERROR\\|S3\\|service error'",
      "Verify S3 bucket accessibility and credentials from the Zwischending pod: kubectl -n <zwischending-namespace> exec deploy/zwischending-production-vanilla -- env | grep -i 'AWS\\|S3'",
      "Check whether errors are concentrated on specific artifact paths or affect all S3 requests: kubectl -n <zwischending-namespace> logs deploy/zwischending-production-vanilla --since=1h | grep 'Error while proxying' | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "ce4af51c-1807-42ca-843d-496a92e1aa93",
    "timestamp": "2026-07-16T00:31:37.249Z",
    "created_at": "2026-07-16T00:31:37.249Z",
    "discovery_id": "7a29e75c-20260716-0024Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-request-error-logger-25db67f3",
    "status": "acknowledged",
    "title": "Proxy — request handling: request error logging signal",
    "summary": "Ingress proxy is emitting request-level errors from its dedicated requestError logger, indicating routing failures or upstream connection issues. Signal is a dip (rate decreased from prior level) but errors are still active as of 00:29 UTC. No confirmed blast radius or exposed downstream services. Inspect proxy requestError log content to identify whether upstream Elasticsearch tier pods are the source of connection failures.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy Request Error Logger"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect proxy requestError log content to identify upstream failure patterns: kubectl -n elastic-apps logs deploy/f5-nginx-ingress-controller --since=1h | grep -i 'requestError\\|upstream\\|connection refused\\|timeout'",
      "Check upstream Elasticsearch tier pod health for connection errors: kubectl get pods -n elastic-apps -l app=elasticsearch --field-selector=status.phase!=Running",
      "Review proxy routing decisions for cross-AZ fallback activity indicating same-AZ backend unavailability: kubectl -n elastic-apps logs deploy/f5-nginx-ingress-controller --since=1h | grep -v 'same_az' | grep 'routing_decision'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "444ed873-8c7b-4339-a576-4f2422246203",
    "timestamp": "2026-07-16T00:31:12.969Z",
    "created_at": "2026-07-16T00:31:12.969Z",
    "discovery_id": "0a883518-20260716-0024Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__external-unauthorized-access-attempts-5ed36a8e",
    "status": "acknowledged",
    "title": "Proxy — security: external unauthorized access attempts (401)",
    "summary": "Ingress proxy is returning 401 Unauthorized responses to external clients. Requests are being correctly rejected at the proxy edge — no internal service impact. Signal is active as of 00:29 UTC with indeterminable change type. Low volume; could be normal baseline unauthorized traffic, expired credentials, or probing activity. Check volume trend and source distribution to determine whether rate limiting or credential rotation is needed.",
    "criticality": 25,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "External Unauthorized Access Attempts"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check volume and source distribution of external 401s to distinguish normal noise from brute-force: kubectl -n elastic-apps logs deploy/f5-nginx-ingress-controller --since=1h | grep '401' | awk '{print $1}' | sort | uniq -c | sort -rn | head -20",
      "Review WAF/edge rules for rate limiting on external 401 patterns: kubectl -n elastic-apps get configmap nginx-config -o yaml | grep -i 'limit_req'",
      "Verify whether affected external clients have recently rotated API keys or credentials by checking client user-agent patterns in proxy logs"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "ae00fe09-461c-497f-bb2c-94bc8d251b5e",
    "timestamp": "2026-07-16T00:30:46.924Z",
    "created_at": "2026-07-16T00:30:46.924Z",
    "discovery_id": "c9d7948a-20260716-0024Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__docker-registry-authorization-warnings-e675a102",
    "status": "acknowledged",
    "title": "Docker Registry — auth: authorization scope warnings",
    "summary": "Docker Registry auth service is emitting authorization warnings for clients with insufficient scope. Affects image pull operations from docker.elastic.co where client credentials or pull secrets do not match the required repository ACL. Signal is stationary and currently active as of 00:29 UTC. Check docker-auth ACL configuration and identify which clients or repositories are affected by scope mismatches.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Docker Registry Authorization Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect docker-auth ACL configuration for recently changed or missing pull permissions: kubectl -n container-library logs deploy/docker-auth-docker-auth --since=1h | grep 'insufficient scope'",
      "Identify affected repositories and clients: kubectl -n container-library logs deploy/docker-registry-docker-registry --since=1h | grep 'authorization token required'",
      "Verify pull secret configuration for affected Kubernetes workloads: kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.imagePullSecrets}{\"\\n\"}{end}' | grep -v '\\[\\]'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "5b340c89-e52f-467f-b8a5-2de60f46a33d",
    "timestamp": "2026-07-16T00:30:26.110Z",
    "created_at": "2026-07-16T00:30:26.110Z",
    "discovery_id": "c9d93519-20260716-0024Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__docker-registry-oci-manifest-errors-12d84a64",
    "status": "acknowledged",
    "title": "Docker Registry — manifests: OCI manifest accept header errors",
    "summary": "Docker Registry is returning errors for OCI manifest requests where the client's accept header does not support OCI manifests. Affects clients pulling images from docker.elastic.co (containerd, Docker, cosign, Helm, Crossplane) that send incompatible accept headers. Signal is stationary and currently active as of 00:29 UTC; no complete pull outage — clients with compatible headers succeed. Verify whether a recent registry upgrade to v3.0.0 changed OCI manifest handling defaults, and check whether affected clients need updated pull configuration.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Docker Registry OCI Manifest Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Docker Registry v3.0.0 OCI manifest compatibility settings: kubectl -n container-library exec deploy/docker-registry-docker-registry -- cat /etc/docker/registry/config.yml | grep -i oci",
      "Review registry access logs for the volume of 404 OCI manifest errors: kubectl -n container-library logs deploy/docker-registry-docker-registry --since=1h | grep 'OCI manifest found'",
      "Identify affected client versions and update pull configurations to include OCI media types in accept headers, starting with containerd clients: kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.containerRuntimeVersion}'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "9f8fc3c4-a550-455b-b2da-481eb5c105c2",
    "timestamp": "2026-07-16T00:23:35.629Z",
    "created_at": "2026-07-16T00:23:35.629Z",
    "discovery_id": "disc-azure-oauth-20260716",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__azure-oauth-client-secret-expired-aadsts-8dece9e8",
    "status": "acknowledged",
    "title": "Azure OAuth — client credentials: secret expired (AADSTS7000222)",
    "summary": "Azure OAuth: AADSTS7000222 client secret expired errors confirmed active at 00:17:25Z. Azure-integrated agentless data ingestion is failing authentication. Stationary signal indicates this is a recurring or persistent misconfiguration. Schedule secret rotation in Azure AD and update the integration credential in Fleet within the next maintenance window.",
    "criticality": 40,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the Azure AD application with the expired client secret: az ad app list --query \"[?displayName!=null]\" | grep -i 'agentless\\|elastic' then check secret expiry dates via az ad app credential list --id <app-id>",
      "Rotate the expired client secret in Azure Portal: Azure AD > App Registrations > <affected app> > Certificates & Secrets > New client secret, then update the secret value in the agentless integration configuration",
      "Update the integration credential in Elastic: navigate to Fleet > Integrations > <affected Azure integration> and update the client secret field with the newly generated value"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "8191fde6-015f-422b-ac2e-c97c0bf90c08",
    "timestamp": "2026-07-16T00:20:33.829Z",
    "created_at": "2026-07-16T00:20:33.829Z",
    "discovery_id": "disc-agentless-seccomp-20260716",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-79f2bcd6",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — startup: seccomp policy panic",
    "summary": "Agentless Heartbeat/Synthetics: every synthetics unit spawn is failing with a fatal panic — 'a seccomp policy is already registered' — confirmed active at 00:18:46Z. The crash loop is ongoing; no synthetics monitors are executing in the agentless environment. The panic originates in heartbeat/security/seccomp.go:290 during OTel receiver initialization (commit 8674b2f08772). Respond within the hour: roll back the heartbeat component or apply a seccomp registration guard to restore synthetic monitoring coverage.",
    "criticality": 65,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify affected agentless pods and restart them to clear the crash loop: kubectl get pods -n project-* -l k8s.elastic.co/agentless-integration-name=elastic_security --field-selector=status.phase=Running | grep -i synthetics",
      "Pin or roll back the heartbeat/synthetics component to the previous version before commit 8674b2f08772: kubectl set image deployment/<agentless-deployment> agentless=docker.elastic.co/observability-ci/ecp-elastic-agent-service:<previous-tag> -n <namespace>",
      "File a bug against github.com/elastic/beats heartbeat/security/seccomp.go:290 — MustRegisterPolicy is being called twice during OTel collector receiver initialization; apply a guard check or use RegisterPolicy instead"
    ],
    "dependency_edges": [],
    "root_cause": "Heartbeat/Synthetics component is failing to start because MustRegisterPolicy in libbeat/common/seccomp is being called twice during OTel collector receiver initialization, causing a panic that crashes every spawned synthetics unit."
  },
  {
    "event_id": "406069dd-eeef-4d9b-8bb6-f405beb66a56",
    "timestamp": "2026-07-16T00:11:19.777Z",
    "created_at": "2026-07-16T00:11:19.777Z",
    "discovery_id": "agentless-multi-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-fleet-checkin-json-parse-failu-12a1002b",
    "status": "acknowledged",
    "title": "Agentless — Fleet/Cloudbeat: component failures and checkin parse errors",
    "summary": "Agentless platform in us-central1 is showing component state cycling (FAILED→STARTING) for Cloudbeat/CSP workloads. Affected: agentless telemetry collection and component health reporting across multiple project namespaces. Component state transitions to FAILED confirmed active (most recent at 00:10:13Z), though components are attempting restart. Cloudbeat fatal exit and Fleet JSON parse failure signatures not confirmed in current window. Review agentless pod health and check for persistent FAILED components not recovering.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Component State Transition to FAILED (Message-Based)",
      "Cloudbeat Launcher Fatal Exit",
      "OTel Stats Endpoint Closed Network Connection",
      "Agentless Fleet Checkin JSON Parse Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless pod status for persistent FAILED components: kubectl get pods -n <project-namespace> -l k8s.elastic.co/agentless-stack-type=serverless --field-selector=status.phase!=Running",
      "Inspect Cloudbeat CSPM component logs for root cause of FAILED state: kubectl logs -n <project-namespace> <agentless-pod> -c agentless --since=30m | grep -E 'FAILED|fatal|error'",
      "If components are stuck in FAILED (not recovering to HEALTHY within 10 min), restart the affected agentless pod: kubectl delete pod -n <project-namespace> <agentless-pod-name>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "86df9cd7-8511-4c0d-a79b-5a214fcecc7f",
    "timestamp": "2026-07-15T23:44:28.192Z",
    "created_at": "2026-07-15T23:44:28.192Z",
    "discovery_id": "d904a3dd-0e7b-4867-bebe-e469c5aafb27",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__liveness-check-http-error-92ac415d",
    "status": "acknowledged",
    "title": "Agentless API — liveness endpoint: HTTP error",
    "summary": "Agentless API liveness check is logging HTTP errors, confirmed active as recently as 2026-07-15T23:32Z (ongoing since ~22:15Z). The liveness endpoint at handler.go is returning HTTP errors, which may cause pod restarts or degraded health routing. No confirmed exposed user-facing path. Inspect agentless-api pod liveness probe status and handler logs for HTTP error status codes and upstream cause.",
    "criticality": 55,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Liveness Check HTTP Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless-api pod liveness probe status: `kubectl describe pods -n agentless-api -l app.kubernetes.io/name=agentless-api | grep -A 20 'Liveness\\|Events'` to identify pods failing liveness checks and restart counts.",
      "Inspect agentless-api handler logs for HTTP error status codes: `kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --tail=200 | grep -E 'HTTP error|status.*[45][0-9][0-9]|handler.go'` to determine the upstream cause.",
      "Check agentless-api K8s client connectivity (related to K8s client check failure signal): `kubectl exec -n agentless-api <agentless-api-pod> -- curl -sk https://kubernetes.default.svc/healthz` to verify K8s API server reachability from the pod."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "d4169f0f-b9e6-42cf-93c8-0dcc221dca4e",
    "timestamp": "2026-07-15T23:43:23.649Z",
    "created_at": "2026-07-15T23:43:23.649Z",
    "discovery_id": "b101f82c-7cf1-4670-be5a-848e57235810",
    "discovery_slug": "logs-agent_builder.otel-default__agent-execution-toolcall-chunk-errors",
    "status": "resolved",
    "title": "Agent Builder — researchAgent workflow: alerts recovered",
    "summary": "Agent Builder researchAgent workflow error alert rate has returned to baseline. Detection pipeline confirmed quiet signal (stationary, no active alerts). No further action required; monitor for recurrence.",
    "criticality": 20,
    "confidence": 0.75,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Agent execution error in researchAgent workflow"
    ],
    "cause_ki_ids": [],
    "recommendations": [],
    "dependency_edges": []
  },
  {
    "event_id": "fdb6c2a9-424a-4ab1-a4e3-cad43495984e",
    "timestamp": "2026-07-15T23:42:09.494Z",
    "created_at": "2026-07-15T23:42:09.494Z",
    "discovery_id": "54f0fbf4-91aa-4990-bbdf-9910dc6fcd15",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__k8s-client-check-failure-d3776fdf",
    "status": "acknowledged",
    "title": "Agentless API — health checks: K8s client check failures",
    "summary": "Agentless API is showing a credible trend of increasing K8s client health check failures (trend_change, p=0.0045) since ~2026-07-15T22:00Z. Current-state check confirms the stream is alive but could not confirm or refute the specific K8s client failure pattern. No exposed user path confirmed. Inspect agentless-api pod health check logs and restart counts to determine if pods are cycling.",
    "criticality": 30,
    "confidence": 0.3,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "K8s Client Check Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect agentless-api pod health check logs: `kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --tail=200 | grep -iE 'k8s|client.*check|check.*fail|health.*error'` to identify the K8s client check failure pattern.",
      "Check agentless-api pod restart counts: `kubectl get pods -n agentless-api -l app.kubernetes.io/name=agentless-api -o wide` — elevated restart counts indicate health check failures causing pod cycling.",
      "Review agentless-api K8s client configuration: `kubectl describe deployment agentless-api -n agentless-api | grep -A 10 'Liveness\\|Readiness'` to verify health check endpoint and timeout settings."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "4740d455-6ad0-4177-9af9-3dc37bc33e34",
    "timestamp": "2026-07-15T23:41:27.035Z",
    "created_at": "2026-07-15T23:41:27.035Z",
    "discovery_id": "ab9b6edc-13c6-4cda-85e5-9ee837bf548e",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__app-secrets-or-config-object-creation-2ef92830",
    "status": "acknowledged",
    "title": "Agentless connectors — ingestion/auth: multiple upstream errors",
    "summary": "Agentless connectors are experiencing multiple concurrent authentication and API failures across O365 (AF10001 permission error on DLP subscription), CEL inputs (retryable HTTP request failures), and Notion (APIResponseError). All signals began around 2026-07-15T23:30Z and remain active. Blast radius is limited to connector ingestion pipelines with no confirmed exposed user-facing path. Verify connector credentials and upstream provider availability; check if this is systemic to the agentless connector runtime.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default",
      "logging-gcp-us-central1-logs-agentless-api-log-default",
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)",
      "App Secrets or Config Object Creation",
      "CEL Input Retryable HTTP Request Failure",
      "Libbeat Output Read Errors",
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)",
      "UIAM Authentication Failures via Proxy",
      "Connectors SSH Connection Failure",
      "Connectors Notion API Response Error",
      "Integration OAuth Token Fetch 403 Forbidden",
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check O365 connector permissions: verify the service account has the required Microsoft Graph API permissions for DLP subscription (`/activity/feed/subscriptions/start`). In Azure AD, run: `az ad app permission list --id <app-id>` and compare against required scopes.",
      "Inspect agentless connector pods for systemic auth failures: `kubectl get pods -n <agentless-namespace> -l component.type=connectors-py --field-selector=status.phase!=Running` and `kubectl logs -n <agentless-namespace> <pod> --tail=100 | grep -E 'AF10001|APIResponseError|oauth2|403'`.",
      "Check Notion connector API token validity: `kubectl exec -n <agentless-namespace> <connectors-py-pod> -- curl -s -H 'Authorization: Bearer <token>' https://api.notion.com/v1/users/me` — a 401/403 response confirms token expiry or revocation."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "614cbdf8-857f-4d65-a76b-1b828edeb888",
    "timestamp": "2026-07-15T23:31:54.585Z",
    "created_at": "2026-07-15T23:31:54.585Z",
    "discovery_id": "df9457da-5a68-4e4a-8aa0-d0374931e182",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-cross-az-backend-routing-39d4cec8",
    "status": "acknowledged",
    "title": "Proxy — request handling: requestError / routing errors",
    "summary": "Proxy requestError events are ongoing, confirmed still firing at 23:30:01Z. Two additional rules (cross-AZ backend routing, Zwischending S3 proxy) show dip change type — traffic dropped while errors persist. No exposed dependency edges confirmed; blast radius is unclear. Error message detail was not captured in this cycle. Inspect proxy requestError logs for error type and correlate with backend routing and S3 proxy components.",
    "criticality": 35,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy Cross-AZ Backend Routing",
      "Zwischending S3 Proxy Errors",
      "Proxy Request Error Logger"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect proxy requestError logs with full message fields to identify the error type: kubectl logs -n ingress-proxy -l app.kubernetes.io/name=proxy --since=30m | grep -i 'requestError\\|error\\|failed'",
      "Check proxy cross-AZ backend routing health by reviewing backend connection errors per zone: kubectl logs -n ingress-proxy -l app.kubernetes.io/name=proxy --since=30m | grep -i 'cross-az\\|routing\\|backend'",
      "If Zwischending S3 proxy errors are confirmed, verify S3 endpoint connectivity and credentials from the proxy pods: kubectl exec -n ingress-proxy <proxy-pod> -- curl -v <s3-endpoint>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "d16b22fa-bfc9-4c8e-bab1-ca69096b5198",
    "timestamp": "2026-07-15T23:31:20.373Z",
    "created_at": "2026-07-15T23:31:20.373Z",
    "discovery_id": "64341d9d-5fb3-4686-8dda-39f7148381a9",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cloudbeat-launcher-fatal-exit-f4b907ed",
    "status": "acknowledged",
    "title": "Cloudbeat launcher — agentless collector: fatal exit / component failed",
    "summary": "Agentless cloudbeat components are cycling through FAILED→STARTING states and crashing with a panic. Components are still failing as of 23:29:55Z. The discovery attributed this to invalid GCP credentials JSON, but current-state evidence shows a Go panic (\"seccomp policy already registered\") in the heartbeat/synthetics receiver — a code-level crash, not a credentials issue. Agentless security posture collection (cloudbeat/cis_gcp) is affected. No exposed user-facing dependency edges. Schedule investigation of the seccomp panic in the heartbeat receiver component.",
    "criticality": 31,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Component State Transition to FAILED (Message-Based)",
      "Cloudbeat Launcher Fatal Exit"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the heartbeat/synthetics receiver component for duplicate seccomp policy registration: kubectl logs -n <agentless-namespace> <agentless-pod> -c agentless | grep -i seccomp",
      "If the panic is reproducible, roll back the elastic-agent image to the previous version: kubectl set image deployment/<agentless-deployment> agentless=docker.elastic.co/observability-ci/ecp-elastic-agent-service:<previous-tag> -n <namespace>",
      "If rollback is not available, disable the heartbeat/synthetics receiver in the agentless OTel collector config to allow cloudbeat to start: kubectl edit configmap <agentless-otel-config> -n <namespace> and remove the heartbeat receiver entry"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless cloudbeat launcher is crashing because a Go panic (\"seccomp policy already registered\") is thrown during heartbeat receiver initialization, causing the OTel collector to fail to start and the unit to cycle FAILED→STARTING."
  },
  {
    "event_id": "153e277c-2fbd-412e-8a3e-0a5c9711e3a5",
    "timestamp": "2026-07-15T23:18:26.217Z",
    "created_at": "2026-07-15T23:18:26.217Z",
    "discovery_id": "1a175212-7723-4685-aff6-94115f6f817c",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-notion-api-response-error-a1ee164e",
    "status": "acknowledged",
    "title": "Connectors — Notion: API response error signal",
    "summary": "Connectors: Notion API connection errors confirmed active as of 23:14Z (1 minute before review). Notion connector sync operations are failing — content ingestion from Notion is affected. Detection has indeterminable change type and p_value=0 (no credible statistical signal), but the error is live. Impact is bounded to Notion connector sync; no core user journey blocked. Monitor for recovery or escalate if Notion API status confirms an outage.",
    "criticality": 25,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Notion API status at https://status.notion.so and verify whether the outage is on Notion's side before taking connector action.",
      "Inspect the failing Notion connector configuration in Kibana (Stack Management > Connectors) and verify the API token has not expired: navigate to the connector settings and run a test connection.",
      "If the Notion API is healthy, restart the affected agentless connector pod: kubectl -n <project-namespace> rollout restart deployment/<agentless-connector-deployment>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "42881520-af87-435d-b680-84e835c6a03f",
    "timestamp": "2026-07-15T22:43:46.393Z",
    "created_at": "2026-07-15T22:43:46.393Z",
    "discovery_id": "3a4c4555-7dcf-4f30-9bbc-73dfff7faa2c",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-failed-state-1c8d1ceb",
    "status": "acknowledged",
    "title": "Agentless components — startup: seccomp policy panic / units FAILED",
    "summary": "Agentless-managed Heartbeat/Synthetics and Cloudbeat CSPM components are crash-looping due to a seccomp policy double-registration Go panic. Components are entering FAILED state and being restarted repeatedly, interrupting data collection for all affected integrations. Actively crashing as of 2026-07-15T22:39Z. Fix: pin affected integrations to a known-good agent version or disable Heartbeat/Synthetics temporarily until the seccomp double-registration bug is patched.",
    "criticality": 45,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Go Panic in Agentless Component",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the agentless pods running the crashing Heartbeat/Synthetics components and check the current crash-loop state: kubectl get pods -n agentless-api -l component=heartbeat --field-selector=status.phase=Running | grep -E 'CrashLoopBackOff|Error'",
      "Pin the affected integrations to a known-good agent version that does not have the seccomp double-registration bug: in Fleet > Agent Policies > [affected policy] > Settings, downgrade the agent version to the last stable release before the current build (2026-07-14).",
      "If a version pin is not immediately available, disable the Heartbeat/Synthetics integration temporarily to stop the crash loop: Fleet > Integrations > [Heartbeat/Synthetics integration] > Disable, then re-enable after the seccomp fix is deployed."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed Heartbeat/Synthetics components are crashing because seccomp policy registration runs more than once during startup, triggering a Go panic and causing unit/component state transitions to FAILED."
  },
  {
    "event_id": "c72e0229-688d-4ba5-b47e-5c4da635317b",
    "timestamp": "2026-07-15T22:43:03.771Z",
    "created_at": "2026-07-15T22:43:03.771Z",
    "discovery_id": "18978c89-b392-4137-a40b-c23025880ca8",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__azure-oauth-client-secret-expired-aadsts-58177961",
    "status": "acknowledged",
    "title": "Agentless integration — Azure OAuth: client secret expired (AADSTS7000222)",
    "summary": "An agentless Azure integration is failing OAuth token acquisition due to an expired Azure AD client secret (AADSTS7000222). Azure data collection is interrupted for the affected integration. Actively failing as of 2026-07-15T22:37Z. Fix: rotate the expired client secret in Azure Portal and update the integration credentials in Fleet.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate the expired Azure AD client secret: in Azure Portal, navigate to Azure Active Directory > App registrations > [affected app] > Certificates & secrets > New client secret, then update the integration credentials in Fleet > Integrations > [Azure integration] > Edit.",
      "After rotating the secret, force the agentless integration to restart and re-authenticate: kubectl delete pod -n agentless-api -l integration=[azure-integration-name] to trigger a fresh pod with the new credentials.",
      "If the Azure app registration is unknown, identify it from the error logs by searching for the application ID in the AADSTS7000222 error message: kubectl logs -n agentless-api -l app=agentless-api --since=1h | grep AADSTS7000222"
    ],
    "dependency_edges": [],
    "root_cause": "The agentless integration is failing because its Azure AD application client secret has expired (AADSTS7000222), preventing OAuth token acquisition."
  },
  {
    "event_id": "24ec38b8-52aa-4f8a-a7dc-86a420f02f1e",
    "timestamp": "2026-07-15T22:40:47.007Z",
    "created_at": "2026-07-15T22:40:47.007Z",
    "discovery_id": "77edb9e7-f51c-40cb-b7eb-5568638a57b9",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-c868f2c2",
    "status": "acknowledged",
    "title": "Agentless AWS OTel collector — startup: missing credentials configuration",
    "summary": "AWS OTel collector is failing to start across multiple AWS integrations (lambda, elb, ec2, sqs, ecs, rds) due to missing credential configuration in the awscredentialsprovider extension. AWS CloudWatch data collection is interrupted for all 6 affected integrations. Actively failing as of 2026-07-15T22:39Z. Fix: update each integration to provide explicit credentials, configure assume_role, or remove the auth block to use the default SDK credential chain.",
    "criticality": 45,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "For each failing AWS integration, update the integration configuration to either provide explicit credentials (access_key_id/secret_access_key), configure assume_role, or remove the awscredentialsprovider auth block entirely to fall back to the default SDK credential chain: navigate to Fleet > Integrations > [AWS integration] > Edit and update the credentials section.",
      "If the credential misconfiguration was introduced by a recent policy or template change, roll back the affected integration policy: kubectl get agentpolicies -n agentless-api and identify the policy version to revert.",
      "Verify the agentless execution environment has an IAM instance profile or workload identity attached that can serve as the default credential chain: aws sts get-caller-identity --region us-east-1 from within the agentless pod."
    ],
    "dependency_edges": [],
    "root_cause": "The AWS OTel collector is failing because its awscredentialsprovider auth configuration is present but no credentials, assume_role, or profile is set, causing startup configuration validation to fail."
  },
  {
    "event_id": "a201f61f-0ed0-4896-8350-ed54d0a381f4",
    "timestamp": "2026-07-15T22:14:19.818Z",
    "created_at": "2026-07-15T22:14:19.818Z",
    "discovery_id": "opslead-20260715-authproxy-1",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-auth-failures-and-controller-warnings",
    "status": "acknowledged",
    "title": "UIAM Proxy — authenticate endpoint: elevated authentication failures",
    "summary": "UIAM Proxy: authentication failures on the proxy authenticate endpoint (status_code >=400) are actively ongoing, with the most recent failure at 22:11:57Z. Elasticsearch controller warnings are present but stationary (chronic background, no new spike). Affects users authenticating through the proxy; root cause not yet established. Onset ~21:02Z; no sign of recovery. Immediate action: inspect proxy service logs for the authenticate endpoint to identify the specific error and upstream cause.",
    "criticality": 35,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings",
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect proxy service logs for the authenticate endpoint to identify the specific error code and upstream cause: kubectl logs -n <proxy-namespace> -l app=proxy --tail=200 | grep _authenticate",
      "Check elasticsearch-controller for any upstream dependency failures that may be contributing to auth rejections: kubectl logs -n <controller-namespace> -l app=elasticsearch-controller --tail=100 | grep -E 'error|warning'",
      "If auth failures are correlated with a recent deployment, roll back the proxy service: kubectl rollout undo deployment/proxy -n <proxy-namespace>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "dcfa4d37-17b1-4558-85e2-8afbeb6a264a",
    "timestamp": "2026-07-15T22:13:49.714Z",
    "created_at": "2026-07-15T22:13:49.714Z",
    "discovery_id": "opslead-20260715-agentless-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-log-default__otel-recovery-and-auth-invalid-client",
    "status": "acknowledged",
    "title": "Agentless integrations — OTel collector: recovery restart loop and OAuth invalid_client failures",
    "summary": "Agentless platform: OTel collector is actively stuck in a recovery restart loop (most recent restart at 22:12:20Z, total retries accumulating), and Azure AD OAuth requests are failing with invalid_client (most recent failure at 22:12:16Z). Both issues are confirmed ongoing as of review time. Affects telemetry ingestion/processing and M365 Defender/Azure AD integration authentication. Notion connector is unconfigured (not an active failure). Onset ~21:00Z; no sign of recovery. Immediate actions: check OTel collector health and validate Azure AD client credentials.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "M365 Defender Azure AD OAuth invalid_client",
      "OTel Collector Persistent Recovery Restart Loop",
      "OTel Collector Accumulated High Recovery Retry Count",
      "Notion Connector API Token Invalid"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect OTel collector pod logs and restart if stuck: kubectl logs -n <agentless-namespace> -l app=otel-collector --tail=100 and kubectl rollout restart deployment/otel-collector -n <agentless-namespace>",
      "Validate Azure AD client credentials for M365 Defender integration: check client_id/client_secret in the agentless secret store and rotate if expired via az ad app credential reset --id <app-id>",
      "Verify Notion connector configuration in Kibana Fleet UI — connector is unconfigured and cannot sync until credentials are provided"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "77c42e54-a3e8-4fc4-b331-10d417bad67a",
    "timestamp": "2026-07-15T22:06:42.094Z",
    "created_at": "2026-07-15T22:06:42.094Z",
    "discovery_id": "dfdc1c7c-0e32-4154-9e00-898f52c2ec28",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-87233f92",
    "status": "acknowledged",
    "title": "Agentless logging — connectors/inputs: permission and configuration errors",
    "summary": "Agentless connectors and inputs have multiple chronic configuration failures. O365 DLP subscription returns 401 Unauthorized (AF10001 — missing permission), confirmed active at 21:56Z. CEL retryable HTTP input is failing requests, confirmed active at 21:59Z. Elastic Agent symlink cleanup failure and Confluence connector field validation errors are also present (evidence from March/June 2026 — long-standing). All signals are stationary/indeterminable, indicating chronic per-tenant misconfiguration rather than a new incident. Schedule configuration review for affected integration policies.",
    "criticality": 25,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)",
      "CEL Input Retryable HTTP Request Failure",
      "Elastic Agent Data Directory Symlink Missing",
      "Connectors Field Validation Error (ConfigurableFieldValueError)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix O365 DLP integration permissions: in the Microsoft 365 admin center, grant the required DLP audit subscription permissions to the service account used by the affected agentless integration, then restart the CEL input via Fleet: POST /api/fleet/package_policies/<policy_id>/upgrade.",
      "Fix CEL retryable HTTP input failures: identify the affected integration policy via kubectl logs -n <agentless-namespace> <pod> | grep 'input.cel.retryablehttp' and update the endpoint URL or credentials in the integration policy configuration via the Fleet API.",
      "Fix Confluence connector field validation: in the Kibana Connectors UI or via API GET /api/actions/connectors, identify connectors with missing required fields (password, URL) and update their configuration, or delete and recreate the connector with valid values."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "7b2bea6d-2d7c-431f-8323-8150ac3740d6",
    "timestamp": "2026-07-15T22:05:55.987Z",
    "created_at": "2026-07-15T22:05:55.987Z",
    "discovery_id": "121c7db1-c19a-4776-a050-178250db5593",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-a8fff98d",
    "status": "acknowledged",
    "title": "Platform logging — proxy/controller: 5xx dip and controller warnings",
    "summary": "Platform logging stream shows both elasticsearch-controller warnings/errors and proxy HTTP 5xx errors are active. ES controller errors confirmed at 21:55Z; proxy 5xx confirmed at 21:59Z. Original evidence timed out (~1.5h ago); current-state checks confirm both are ongoing. The proxy dip change type suggests a period of silence (possible brief outage) followed by resumed error logging. No exposed dependency edges confirmed. Investigate ES controller error content and proxy 5xx upstream targets to determine blast radius.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings",
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check elasticsearch-controller pod logs for the specific error/warning content: kubectl logs -n <controller-namespace> -l app=elasticsearch-controller --since=30m | grep -E 'error|warn' to identify the root cause.",
      "Investigate proxy 5xx errors: kubectl logs -n <proxy-namespace> -l app=proxy --since=30m | grep ' 5[0-9][0-9] ' to identify which upstream endpoints are returning errors and whether the dip indicates a period of silence.",
      "If proxy 5xx errors are user-facing, check the proxy deployment health: kubectl rollout status deployment/proxy -n <proxy-namespace> and kubectl get endpoints -n <proxy-namespace> proxy to verify all backends are healthy."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "159aebab-09bb-419e-9c6b-69b001d4e648",
    "timestamp": "2026-07-15T22:04:26.073Z",
    "created_at": "2026-07-15T22:04:26.073Z",
    "discovery_id": "6d7c8cbe-4eb7-4bc2-9b30-39640038f305",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__azure-oauth-client-secret-expi-1e8594cc",
    "status": "acknowledged",
    "title": "Agentless integrations — cloud credentials: misconfiguration/expired secret signals",
    "summary": "Agentless integrations are reporting cloud credential failures across multiple providers. AWS OTel collector components are missing credentials configuration (confirmed active at 21:59Z). Azure OAuth client secret expiry (AADSTS7000222) is inconclusive. GCP invalid credentials JSON was refuted. Affected integrations cannot collect data from their respective cloud sources. Stationary signals indicate chronic misconfiguration rather than a new incident. Schedule credential review and rotation for affected integration policies.",
    "criticality": 25,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)",
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Review and rotate the Azure OAuth client secret for affected agentless integrations: kubectl get secret -n <agentless-namespace> | grep azure, then update the secret value via the Elastic Cloud console or API for the affected integration policy.",
      "Fix AWS OTel collector credential configuration for affected agentless deployments: kubectl describe pod -n <agentless-namespace> <agentless-pod> to identify the affected stack ID, then update the integration policy credentials via the Fleet API: PUT /api/fleet/package_policies/<policy_id>.",
      "Validate GCP credentials JSON for Cloudbeat integrations: kubectl logs -n <agentless-namespace> <cloudbeat-pod> | grep 'invalid credentials' to identify affected deployments, then re-upload valid GCP service account JSON via the integration policy configuration."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f3024cad-3071-40cd-8f34-d0d7eb84b3c1",
    "timestamp": "2026-07-15T21:29:17.094Z",
    "created_at": "2026-07-15T21:29:17.094Z",
    "discovery_id": "e04add1f-586a-4c15-baa9-0d5d8ad624cf",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-50ede08b",
    "status": "acknowledged",
    "title": "UIAM — service runtime: entropy source stuck errors",
    "summary": "UIAM service is emitting persistent 'entropy source stuck' errors. The fault has been active since at least 2026-07-15T00:03Z and was confirmed still firing at 21:04Z (~21 hours). No exposed dependency edges confirmed; proxy-level authentication impact not yet verified. Schedule investigation of UIAM pod entropy availability and consider pod restart to clear the stuck state.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM pod entropy availability: kubectl exec -n uiam-external $(kubectl get pod -n uiam-external -l app.kubernetes.io/role=uiam-external -o jsonpath='{.items[0].metadata.name}') -- cat /proc/sys/kernel/random/entropy_avail",
      "If entropy is exhausted, install or verify haveged/rngd is running on the node: kubectl get daemonset -n kube-system | grep -i rng",
      "Restart the affected UIAM pod to clear the stuck entropy state: kubectl rollout restart deployment -n uiam-external -l app.kubernetes.io/role=uiam-external"
    ],
    "dependency_edges": [],
    "root_cause": "UIAM service is erroring because its entropy source is stuck, producing persistent error-level log events for approximately 21 hours. The mechanism is kernel entropy pool exhaustion or a stuck /dev/random reader that an SRE can address by verifying entropy availability and restarting the affected pod."
  },
  {
    "event_id": "2c408497-3a13-4e49-8df2-4e67b73453fc",
    "timestamp": "2026-07-15T21:27:47.512Z",
    "created_at": "2026-07-15T21:27:47.512Z",
    "discovery_id": "afb7fae1-62a2-4a6d-8500-442322397c8a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-write-latency-spike-74beaaff",
    "status": "resolved",
    "title": "Libbeat — output write latency: quiet (recovered)",
    "summary": "Libbeat output write latency spike alert has returned to baseline. Detection rule is quiet; no active latency spike rows in the stream. Recovery confirmed as of 2026-07-15T20:26Z.",
    "criticality": 10,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Write Latency Spike"
    ],
    "cause_ki_ids": [],
    "recommendations": [],
    "dependency_edges": []
  },
  {
    "event_id": "4907b3a3-b00e-4e65-872d-321ee5c93434",
    "timestamp": "2026-07-15T21:27:34.280Z",
    "created_at": "2026-07-15T21:27:34.280Z",
    "discovery_id": "046bfb49-d575-4909-b9b2-ca076153ecde",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__k8s-client-check-failure-820d3ef5",
    "status": "resolved",
    "title": "Agentless API — health checks: alerts recovered",
    "summary": "Agentless API K8s client check and liveness HTTP error alerts have returned to baseline. Both detection rules are quiet; no active failure rows in the stream. Recovery confirmed as of 2026-07-15T21:16Z.",
    "criticality": 20,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "K8s Client Check Failure",
      "Liveness Check HTTP Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [],
    "dependency_edges": []
  },
  {
    "event_id": "6d8284c3-9be5-4a5b-bf99-445019997ce5",
    "timestamp": "2026-07-15T21:11:28.326Z",
    "created_at": "2026-07-15T21:11:28.326Z",
    "discovery_id": "6a6dda4f-5c5f-4d32-861c-edfbef1f4428",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-fleet-checkin-json-parse-failu-174ca190",
    "status": "acknowledged",
    "title": "Agentless Cloudbeat — component: FAILED→STARTING restart loop",
    "summary": "Agentless Cloudbeat CIS GCP component is in a restart loop, cycling through HEALTHY→STOPPED→FAILED→STARTING states. CSPM data collection for affected agentless deployments is degraded. Component restart confirmed active at 21:09:17Z (exit code 1), ongoing since at least 21:04:33Z. Investigate Cloudbeat launcher failures and the specific exit cause; check Fleet policy configuration for the affected agentless stack.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Fleet Checkin JSON Parse Failure",
      "Cloudbeat Launcher Fatal Exit",
      "Component State Transition to FAILED (Message-Based)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Cloudbeat component logs for the specific exit code: kubectl logs -n <agentless-namespace> -l component=cloudbeat --tail=200 | grep -E 'FAILED|exit|error'",
      "Inspect the Cloudbeat CIS GCP component configuration for misconfigurations: kubectl describe pod -n <agentless-namespace> -l k8s.elastic.co/agent-policy-id=<policy-id>",
      "If the restart loop persists, force a policy re-enrollment via Fleet UI: navigate to Fleet → Agents → select affected agentless agent → Reassign policy to trigger a clean restart"
    ],
    "dependency_edges": [],
    "root_cause": "Cloudbeat component is unstable because it is repeatedly restarting (HEALTHY→STOPPED→FAILED→STARTING transitions), preventing stable execution of the Cloudbeat beater; exit code 1 indicates a configuration or runtime error in the CIS GCP CSPM component."
  },
  {
    "event_id": "45f90684-09d0-4542-a2af-6dc74f76c224",
    "timestamp": "2026-07-15T21:01:23.204Z",
    "created_at": "2026-07-15T21:01:23.204Z",
    "discovery_id": "a5a6af9d-cf7f-4a3e-b952-6767c47aae3b",
    "discovery_slug": "otel-default__tool-argument-validation-failure-e5199209",
    "status": "acknowledged",
    "title": "Agent Builder — tools: argument validation failures",
    "summary": "Agent Builder (logs-agent_builder.otel-default): tool argument validation failures (toolValidationError) are occurring in agent workflows. The specific tool and argument schema causing the failure has not been identified — projected message fields were unavailable in the evidence query. 9 alerts detected; most recent event confirmed at 20:23Z. No exposed user-facing dependency edges identified. Investigate which tool schema is generating validation errors and review recent schema changes in the Agent Builder pipeline.",
    "criticality": 50,
    "confidence": 0.4,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Tool argument validation failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect recent toolValidationError events in logs-agent_builder.otel-default to identify which tool and argument schema is failing: run `curl -X POST '<kibana>/api/console/proxy?path=logs-agent_builder.otel-default/_search&method=POST' -d '{\"query\":{\"term\":{\"attributes.exception.type\":\"toolValidationError\"}},\"sort\":[{\"@timestamp\":\"desc\"}],\"size\":10}'` to retrieve the most recent error payloads.",
      "Review and validate the tool schema definitions in the Agent Builder pipeline — check for recently changed argument schemas or tool registrations that may have introduced a validation mismatch.",
      "If a specific tool is identified as the source, temporarily disable or roll back that tool's registration in the Agent Builder configuration to stop the validation error loop while a fix is prepared."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "3e7da180-d151-487c-9882-03c35e7abcf6",
    "timestamp": "2026-07-15T20:25:02.086Z",
    "created_at": "2026-07-15T20:25:02.086Z",
    "discovery_id": "af627d91-fefa-411e-9b99-9893a199defa",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__all-error-level-log-entries-3964f5e0",
    "status": "acknowledged",
    "title": "Agentless OTel Collector — embedded collector: restart loop from seccomp policy conflict",
    "summary": "Agentless OTel Collector: embedded collector is in an active restart loop due to a seccomp policy double-registration panic in the heartbeat receiver and stats endpoint socket failure. All agentless ingestion/telemetry collection for affected projects is degraded. Failure confirmed still active at 20:20Z (onset ~18:30Z, ~110 minutes ongoing). Restart the affected agentless deployment to clear the seccomp state.",
    "criticality": 60,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-all",
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Proxy Request Error Logger",
      "OTel Collector Persistent Recovery Restart Loop",
      "OTel Collector Accumulated High Recovery Retry Count",
      "All Error-Level Log Entries"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the agentless pod in the restart loop and check its current state: kubectl get pods -A -l app=agentless --field-selector=status.phase!=Running | grep -v Completed",
      "Restart the affected agentless deployment to clear the seccomp double-registration state: kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace>",
      "If restart loop persists, pin the heartbeat receiver to a version that does not double-register the seccomp policy, or disable the heartbeat receiver in the OTel collector config: kubectl edit configmap <otel-collector-config> -n <project-namespace> and remove the heartbeat receiver entry"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless embedded OpenTelemetry Collector is failing because the heartbeat receiver panics on duplicate seccomp policy registration (MustRegisterPolicy called twice) and the stats endpoint socket accept closes, causing the collector to exit and enter a recovery restart loop that has been ongoing since ~18:30Z."
  },
  {
    "event_id": "b5d2f5ac-d201-4705-91f9-63077a145ad4",
    "timestamp": "2026-07-15T20:24:16.446Z",
    "created_at": "2026-07-15T20:24:16.446Z",
    "discovery_id": "0ae65cfd-5bbf-4072-85c2-82124b243d91",
    "discovery_slug": "logging-gcp-us-central1-logs-all__zwischending-s3-proxy-errors-97880f93",
    "status": "acknowledged",
    "title": "Zwischending — S3 proxy: error-level failures proxying to S3",
    "summary": "Zwischending S3 proxy: error-level logs from zwischending-production-vanilla indicate failures proxying requests to S3. Artifact delivery workflows depending on Zwischending are affected. Active since ~18:30Z with at least one confirming error row; indeterminable change type limits confidence. Inspect Zwischending→S3 connectivity and upstream S3 error responses.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Zwischending S3 Proxy Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Zwischending→S3 connectivity: kubectl logs -n zwischending-production deployment/zwischending-production-vanilla --tail=100 | grep -i 'error\\|s3\\|proxy'",
      "Inspect upstream S3 error responses for missing artifacts or auth failures: kubectl exec -n zwischending-production deployment/zwischending-production-vanilla -- curl -v <s3-endpoint> to verify reachability and credentials",
      "If S3 credentials are expired or misconfigured, rotate them via the secrets manager and restart the deployment: kubectl rollout restart deployment/zwischending-production-vanilla -n zwischending-production"
    ],
    "dependency_edges": [],
    "root_cause": "Zwischending production is erroring because its S3 proxy path is returning service errors while proxying requests to S3, indicating upstream S3 connectivity or artifact availability failures."
  },
  {
    "event_id": "bebf808e-3443-4739-aba3-adedc754d570",
    "timestamp": "2026-07-15T20:03:38.022Z",
    "created_at": "2026-07-15T20:03:38.022Z",
    "discovery_id": "disc-aws-otel-missing-creds-20260715T195455Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-24742e27",
    "status": "acknowledged",
    "title": "AWS OTel collector — auth: missing credentials configuration",
    "summary": "AWS OTel collector: all AWS CloudWatch input collectors (ec2, elb, ecs, lambda, sqs, rds) are failing to start because the awscredentialsprovider extension has no credentials, assume_role, or profile configured. Affects AWS telemetry ingestion for agentless deployment 0a105cde-521e-46d2-9e56-9b825baa61e6 in logging-gcp-us-central1. Actively failing as of 19:59Z with no sign of recovery. Configure AWS credentials or remove the explicit auth option to use the default SDK credential chain.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In the agentless integration config for the affected deployment (agentless ID 0a105cde-521e-46d2-9e56-9b825baa61e6), add AWS credentials to the OTel collector config: set credentials, assume_role, or profile under the awscredentialsprovider extension, or remove the explicit auth option to use the default SDK credential chain.",
      "If using IAM role-based auth, verify the agentless pod's service account has the correct AWS IAM role binding: kubectl describe serviceaccount -n <agentless-namespace> and confirm the annotation iam.amazonaws.com/role is set.",
      "If the integration was intentionally configured without AWS credentials, remove the awscredentialsprovider extension from the OTel collector config to suppress the error and use the default SDK chain."
    ],
    "dependency_edges": [],
    "root_cause": "AWS OTel collector is failing because its awscredentialsprovider extension has no credentials, assume_role, or profile configured, preventing the collector from authenticating to AWS services."
  },
  {
    "event_id": "59b21aaf-358f-4089-a752-0046f3144314",
    "timestamp": "2026-07-15T19:39:59.692Z",
    "created_at": "2026-07-15T19:39:59.692Z",
    "discovery_id": "disc-libbeat-20260715-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-read-errors-644b3c21",
    "status": "acknowledged",
    "title": "Agentless log pipeline — libbeat output: read errors / write latency spike",
    "summary": "Agentless log pipeline libbeat output is reporting read errors continuously since ~17:30Z, confirmed still active at 19:35Z. Write latency spike was also detected (non-stationary, p_value=0.0007) but could not be confirmed due to field mapping ambiguity in the query. The output destination is returning errors or is intermittently unreachable, potentially causing log delay or drop for all sources shipping via this pipeline. Action: check libbeat output destination health and connectivity from agentless pipeline pods.",
    "criticality": 45,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Write Latency Spike",
      "Libbeat Output Read Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the libbeat output destination health: verify the Elasticsearch output endpoint is reachable from the agentless pipeline pods with `kubectl -n <agentless-namespace> exec -it <agentless-pod> -- curl -s <elasticsearch-output-url>/_cluster/health`.",
      "Review libbeat output configuration and connection pool status: `kubectl -n <agentless-namespace> logs -l app=agentless --tail=200 | grep -E 'libbeat|output|read.errors'` to identify the specific output destination returning errors.",
      "If the output destination is an Elasticsearch cluster, check its health and index availability: `kubectl -n <project-namespace> get elasticsearch` and review the cluster status. If indices are unavailable, run `kubectl -n <project-namespace> rollout restart deployment/<es-deployment>` after confirming the root cause."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "9753e9d4-590b-41ea-9c27-b5876085988b",
    "timestamp": "2026-07-15T19:39:19.965Z",
    "created_at": "2026-07-15T19:39:19.965Z",
    "discovery_id": "disc-connectors-20260715-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsup-37dddc78",
    "status": "acknowledged",
    "title": "Agentless connectors — configuration/auth failures: token 403 / malformed URL / API errors",
    "summary": "Agentless connectors pipeline has multiple simultaneous configuration and credential failures: OAuth token fetch returning 403, Notion API token invalid, CEL input URL with unsupported protocol scheme, service type not configured for at least one connector, and HTTPJSON retryable request failures. All confirmed still active at 19:36Z, onset ~17:00–17:30Z. No exposed user-facing dependency edges; impact is limited to external-source data ingestion via agentless connectors. Action: audit and fix connector credentials and configuration for each affected integration type in Kibana Fleet.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure",
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)",
      "Connectors Notion API Response Error",
      "Integration OAuth Token Fetch 403 Forbidden",
      "Connectors Service Type Not Configured",
      "HTTPJSON Retryable HTTP Request Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix OAuth 403 failures: rotate or re-authorize the OAuth credentials for the affected integration in Kibana Fleet > Integrations > [affected integration] > Edit, then update the OAuth client ID/secret. Identify the failing integration by checking `kubectl -n <project-namespace> logs -l component.type=connectors-py --tail=200 | grep oauth2`.",
      "Fix Notion connector API token: navigate to Kibana Fleet > Integrations > Notion > Edit and update the API token. The current token is invalid (APIResponseError). Verify the token has the required permissions in the Notion developer portal.",
      "Fix CEL input URL misconfiguration: identify the connector with the unsupported protocol scheme via `kubectl -n <project-namespace> logs -l input.type=cel --tail=100 | grep 'unsupported protocol scheme'`, then correct the URL in the integration configuration in Kibana Fleet. Fix service type misconfiguration by completing the connector setup in Kibana: Fleet > Connectors > [unconfigured connector] > Configure."
    ],
    "dependency_edges": [],
    "root_cause": "Connector ingestion is failing because multiple connector configurations or credentials are invalid: OAuth token fetch is returning 403, CEL URLs include unsupported protocol schemes, and at least one connector lacks required service type configuration, leading to repeated request failures."
  },
  {
    "event_id": "58b256c2-1872-4c7f-9eaa-1f7f17ba693f",
    "timestamp": "2026-07-15T19:38:17.014Z",
    "created_at": "2026-07-15T19:38:17.014Z",
    "discovery_id": "disc-uiam-proxy-20260715-1",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-bccca2d9",
    "status": "acknowledged",
    "title": "UIAM — proxy auth monitoring: failure signal dip / possible log drop",
    "summary": "UIAM proxy authentication failures are ongoing: proxy authenticate endpoint is returning 4xx errors continuously since ~17:30Z, confirmed still active at 19:36Z. The detection rule fired as a dip (brief gap in failure log emission), but current-state verification shows failures are still being emitted. No exposed dependency edges confirmed; impact is to proxy-mediated authentication flows. Action: validate UIAM service health in uiam-regional namespace and proxy-to-UIAM connectivity.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM service health in the uiam-regional namespace: `kubectl -n uiam-regional get pods -l app=uiam` and review recent pod logs with `kubectl -n uiam-regional logs -l app=uiam --tail=100 --since=2h` for authentication error patterns.",
      "Verify proxy-to-UIAM connectivity and whether the proxy is correctly forwarding authenticate requests: check ingress-proxy logs for upstream errors to the UIAM endpoint (`kubectl -n ingress-proxy logs -l app=ingress-proxy --tail=100 | grep authenticate`).",
      "If UIAM is returning 4xx errors due to a configuration or credential issue, review the UIAM service configuration and restart if needed: `kubectl -n uiam-regional rollout restart deployment/uiam`."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "7989670f-ec7f-4cb5-bb82-61f0acfff9c7",
    "timestamp": "2026-07-15T19:37:39.687Z",
    "created_at": "2026-07-15T19:37:39.687Z",
    "discovery_id": "disc-okta-e0000260-20260715-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-e06b6455",
    "status": "acknowledged",
    "title": "Okta integration — auth tenant: developer org deactivated (E0000260)",
    "summary": "Okta integration in the agentless pipeline is returning E0000260 (developer org deactivated) errors on every authentication/token request. The failure has been continuous since ~17:30Z and is confirmed still active at 19:36Z. No exposed user-facing dependency edges; impact is limited to Okta-backed integration data ingestion. Action: verify Okta developer org status and rotate/update credentials or tenant configuration for the affected integration.",
    "criticality": 25,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Okta developer org status at https://developer.okta.com/login — if deactivated, reactivate or provision a new org and update the integration credentials in Kibana Fleet: navigate to Fleet > Integrations > Okta > Edit and update the API token/tenant URL.",
      "If the org cannot be reactivated, create a new Okta developer org and re-configure the agentless integration: `kubectl -n <project-namespace> get secret okta-integration-credentials -o yaml` to identify the secret, then update with new credentials.",
      "Disable the failing Okta integration in Fleet to stop error noise while the org issue is resolved: Fleet > Integrations > Okta > Disable, then re-enable after credentials are updated."
    ],
    "dependency_edges": [],
    "root_cause": "Okta-backed integration/auth flow is failing because the Okta developer org is deactivated (E0000260), preventing successful authentication/token operations."
  },
  {
    "event_id": "f47b3b0d-755d-4237-9366-855e2e854c88",
    "timestamp": "2026-07-15T19:26:29.693Z",
    "created_at": "2026-07-15T19:26:29.693Z",
    "discovery_id": "aadsts7000222-client-secret-expired-2026-07-15T18:07:49Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__azure-oauth-client-secret-expired-aadsts-fda4320b",
    "status": "acknowledged",
    "title": "Agentless Azure OAuth — client secret: AADSTS7000222 expired secret error",
    "summary": "Agentless Azure OAuth: token acquisition is failing with AADSTS7000222 (client secret expired). Affects agentless Azure collection flows in the logging-gcp-us-central1 agentless pipeline — internal backend only, no exposed user-facing services confirmed. Failure confirmed ongoing as of 2026-07-15T19:22:08Z, persisting since at least 2026-07-15T17:01Z (~2h+). Rotate the expired Azure AD application client secret to restore authentication.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate the expired Azure AD application client secret: navigate to Azure Portal → Azure Active Directory → App Registrations → locate the affected application → Certificates & Secrets → add a new client secret and update the agentless deployment configuration with the new secret value.",
      "Update the agentless deployment Kubernetes secret with the new Azure client secret: `kubectl -n agentless get secret -l app=agentless | grep azure` to identify the secret name, then `kubectl -n agentless create secret generic <secret-name> --from-literal=client_secret=<new-value> --dry-run=client -o yaml | kubectl apply -f -`",
      "After rotating the secret, verify token acquisition resumes by monitoring for absence of AADSTS7000222 errors: `kubectl -n agentless logs -l app=agentless --since=5m | grep -i AADSTS7000222`"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless Azure auth is failing because the Azure AD application client secret is expired (AADSTS7000222) and token requests are rejected."
  },
  {
    "event_id": "b0cbd845-111c-49be-8ec3-8902e6446da9",
    "timestamp": "2026-07-15T19:25:25.387Z",
    "created_at": "2026-07-15T19:25:25.387Z",
    "discovery_id": "31e371e1-6471-4483-b524-c11833fcdee7",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__all-error-level-log-entries-0dad87c9",
    "status": "acknowledged",
    "title": "Agentless OTel Collector — embedded collector: restart loop / invalid configuration",
    "summary": "Agentless OTel Collector: embedded collector is in a persistent restart loop due to invalid awscredentialsprovider configuration (missing credentials/profile for multiple AWS CloudWatch inputs) and a supervised unit panic (duplicate seccomp policy registration). Affects agentless telemetry collection for deployment 932e7bad-bbd6-4053-bfdb-78351a266427 in the logging-gcp-us-central1 agentless pipeline — internal backend only, no exposed user-facing services. Failure confirmed ongoing as of 2026-07-15T19:23:28Z with continuous restart cycles. Inspect and correct the agentless deployment configuration for the affected AWS CloudWatch inputs.",
    "criticality": 40,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Accumulated High Recovery Retry Count",
      "OTel Collector Persistent Recovery Restart Loop",
      "All Error-Level Log Entries"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the agentless deployment configuration for the affected agentless instance (ID: 932e7bad-bbd6-4053-bfdb-78351a266427) and remove or correct the awscredentialsprovider extension entries for all AWS CloudWatch inputs (EC2, ECS, Lambda, RDS, ELB, SQS) — either supply valid credentials/assume_role/profile, or remove the auth option to use the default SDK credential chain: `kubectl -n agentless get agentlessappconfig 932e7bad-bbd6-4053-bfdb-78351a266427 -o yaml` then patch the policy.",
      "Investigate the seccomp policy duplicate registration panic in the supervised unit startup path — check the elastic-agent/edot version deployed in the agentless pod and compare against known-good versions: `kubectl -n agentless describe pod -l agentless.id=932e7bad-bbd6-4053-bfdb-78351a266427` and review container image tags.",
      "If the restart loop is causing data loss for the affected agentless deployment, consider temporarily deleting and re-creating the agentless deployment to force a clean configuration reload: `kubectl -n agentless delete agentlessappconfig 932e7bad-bbd6-4053-bfdb-78351a266427` (only after confirming the policy can be re-applied)."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless embedded OpenTelemetry Collector is exiting and restarting because awscredentialsprovider extensions are configured without credentials/profile and a supervised unit panics due to duplicate seccomp policy registration, preventing stable collector graph initialization."
  },
  {
    "event_id": "d14dddfc-05bc-4849-8dab-e2d26a5e9cf9",
    "timestamp": "2026-07-15T19:14:14.145Z",
    "created_at": "2026-07-15T19:14:14.145Z",
    "discovery_id": "2e36f9bf-2a84-4e94-a217-7da765d71b88",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-58f6d65a",
    "status": "acknowledged",
    "title": "Proxy — HTTP responses: 5xx errors signal changed",
    "summary": "Proxy HTTP 5xx errors: proxy is still producing 5xx responses as of 19:09Z (onset ~17:00Z, ~2 hours duration). Rate is below historical baseline (dip change type) but errors are ongoing. Investigate proxy pod health and backend upstream errors to identify the 5xx source and restore clean responses.",
    "criticality": 40,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy pod health and recent restarts: run `kubectl get pods -n ingress-proxy -o wide` and `kubectl describe pod -n ingress-proxy <pod-name>` to identify any crash-looping or OOMKilled pods.",
      "Review proxy error logs for the 5xx root cause: run `kubectl logs -n ingress-proxy -l app=ingress-proxy --since=1h | grep -E '\"status_code\":[5][0-9][0-9]'` to identify the specific backend or upstream causing 5xx responses.",
      "If a specific backend is returning 5xx, temporarily remove it from the proxy routing pool: run `kubectl edit configmap proxy-config -n ingress-proxy` and comment out the failing backend entry, then `kubectl rollout restart deployment/ingress-proxy -n ingress-proxy`."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "5b911654-de40-4d54-86dc-557ce30b7fcc",
    "timestamp": "2026-07-15T19:13:45.857Z",
    "created_at": "2026-07-15T19:13:45.857Z",
    "discovery_id": "disc_ab_tool_call_key_missing_20260715T1904Z",
    "discovery_slug": "logs-agent_builder.otel-default__llm-streaming-chunk-missing-tool-call-key",
    "status": "acknowledged",
    "title": "Agent Builder — researchAgent: malformed LLM tool call chunks break execution",
    "summary": "Agent Builder researchAgent: executions are failing due to malformed LLM streaming chunks ('Tool call key is missing'). All researchAgent workflows using streamed tool calls are affected. Failure confirmed active as of 19:02Z (onset ~18:30Z, ~40 minutes duration). Apply non-streaming fallback or pin to a known-good model version to restore agent runs.",
    "criticality": 55,
    "confidence": 0.6,
    "stream_names": [
      "logs-agent_builder.otel-default"
    ],
    "rule_names": [
      "Agent execution error in researchAgent workflow",
      "Tool call key missing in LLM response chunk"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the upstream LLM provider/model version serving researchAgent and check for recent model or API changes: run `kubectl get configmap -n agent-builder -o yaml | grep -i model` to find the configured model endpoint.",
      "Apply a non-streaming fallback for researchAgent tool calls: set `stream: false` in the LLM client configuration for the researchAgent workflow to bypass the malformed chunk issue while the upstream regression is investigated.",
      "If the LLM provider supports it, pin to a known-good model version: update the agent_builder deployment config with `kubectl set env deployment/agent-builder LLM_MODEL_VERSION=<last-known-good-version> -n agent-builder` and roll out."
    ],
    "dependency_edges": [],
    "root_cause": "Agent Builder researchAgent is failing because the upstream LLM streaming response contains a tool_calls entry with a missing tool call key, causing chunk merge/agent execution to throw and terminate the run."
  },
  {
    "event_id": "d109b01e-0335-41c4-9a36-3f2bbfdff109",
    "timestamp": "2026-07-15T19:13:11.483Z",
    "created_at": "2026-07-15T19:13:11.483Z",
    "discovery_id": "disc_agentless_otel_invalid_aws_creds_20260715T1904Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-log-default__otelcol-invalid-awscredentialsprovider-config",
    "status": "acknowledged",
    "title": "Agentless ingestion — OTel collector: invalid awscredentialsprovider config causes collector exit",
    "summary": "Agentless OTel Collector: crash-recovery loop active since ~18:00Z. Agentless data collection and O365 DLP feed onboarding are degraded for affected projects. Collector is still exiting as of 19:09Z — initially due to awscredentialsprovider misconfiguration, now also hitting a seccomp policy panic on restart. Fix the awscredentialsprovider config and resolve the seccomp policy conflict to restore stable collector operation.",
    "criticality": 45,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)",
      "Integration API 401 Unauthorized Errors",
      "CEL Input Retryable HTTP Request Failure",
      "OTel Collector Exited with Error (otel_manager)",
      "OTel Stats Endpoint Closed Network Connection",
      "Component State Transition to FAILED (Message-Based)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the agentless OTel collector configuration for the awscredentialsprovider extension: run `kubectl get configmap -n <agentless-namespace> -o yaml | grep -A10 awscredentialsprovider` and set at least one of credentials, assume_role, or profile.",
      "Investigate the seccomp policy panic in the collector crash loop: run `kubectl logs -n <agentless-namespace> <otel-collector-pod> --previous | grep -i seccomp` to identify the conflicting policy registration and remove the duplicate.",
      "Fix O365 DLP permissions: add the DLP.All permission to the service principal used by the agentless pipeline via `az ad app permission add --id <app-id> --api <office365-api-id> --api-permissions <DLP.All-permission-id>=Role` and grant admin consent."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless OTel Collector is failing because it is in a crash-recovery loop — initially due to awscredentialsprovider misconfiguration, and now additionally hitting a seccomp policy panic on restart, preventing stable recovery."
  },
  {
    "event_id": "c77e6064-edea-4b7e-9324-2ca44aa092c3",
    "timestamp": "2026-07-15T18:43:08.890Z",
    "created_at": "2026-07-15T18:43:08.890Z",
    "discovery_id": "disc_aws_otl_missing_creds_20260715T1830Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-configuration-4ce2489a",
    "status": "acknowledged",
    "title": "Agentless collector — AWS OTel input: missing credentials configuration",
    "summary": "Agentless collector: AWS OTel collector components (aws-sqs, aws-ecs, aws-rds, aws-elb, aws-ec2, aws-lambda) are failing to start because no AWS credential source is configured. The collector is cycling with recovery attempts. All AWS CloudWatch/SQS source ingestion for this agentless deployment is blocked. Failure confirmed active as of 18:41Z. Inspect the integration configuration in Fleet/Kibana and set credentials/assume_role/profile or remove the auth block to use the default SDK credential chain.",
    "criticality": 35,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected agentless deployment: `kubectl get pods -A -l k8s.elastic.co/application-id=agentless | grep -v Running` to find the pod, then inspect its config with `kubectl exec -n <namespace> <pod> -- cat /agentless/data/otelcol-*.yaml | grep -A5 awscredentialsprovider`.",
      "Set the correct AWS credential source in the integration configuration in Fleet/Kibana: either provide explicit credentials, configure assume_role with the appropriate IAM role ARN, or remove the auth block entirely to use the default SDK credential chain (instance profile/IRSA).",
      "After updating the configuration, trigger a policy re-deployment: `kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace>` to force the collector to reload with the corrected credentials configuration."
    ],
    "dependency_edges": [],
    "root_cause": "awscredentialsprovider is failing because no AWS credential source is configured (none of credentials/assume_role/profile set), preventing the AWS OTel collector component from starting and blocking AWS CloudWatch/SQS input initialization."
  },
  {
    "event_id": "77df1eb2-db14-456e-8c18-687f0d2c29f6",
    "timestamp": "2026-07-15T18:42:41.908Z",
    "created_at": "2026-07-15T18:42:41.908Z",
    "discovery_id": "disc_azure_oauth_secret_expired_20260715T1830Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__azure-oauth-client-secret-expired-aadsts7000222-4c5f90f5",
    "status": "acknowledged",
    "title": "Agentless collector — Azure OAuth: client secret expired (AADSTS7000222)",
    "summary": "Agentless collector: Azure OAuth token acquisition is failing with AADSTS7000222 (client secret expired) for an agentless integration. The error.message field filter is still matching as of 18:40Z, indicating the failure is ongoing. No exposed dependency edges identified; impact is limited to the Azure data source for the affected integration. Locate the Azure app registration, renew the expired client secret, and update the integration configuration.",
    "criticality": 31,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Locate the Azure app registration used by the affected agentless integration: run `kubectl get secret -n <agentless-namespace> -o yaml | grep -i azure` to identify the client ID, then check the Azure portal for the app registration's secret expiry.",
      "Rotate or renew the expired client secret in the Azure portal under App Registrations → Certificates & secrets, then update the integration configuration in Fleet/Kibana with the new secret value.",
      "Restart the affected agentless pod to force re-authentication: `kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace>`"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "ba3ae790-b8bd-452f-a719-45fabec66b4e",
    "timestamp": "2026-07-15T18:30:50.626Z",
    "created_at": "2026-07-15T18:30:50.626Z",
    "discovery_id": "cdb51443-236d-424e-982f-407713d58515",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-5aa8a73b",
    "status": "acknowledged",
    "title": "Agentless collector — heartbeat receiver: panic on seccomp policy registration",
    "summary": "Agentless collector is in an active panic/restart loop: the heartbeat receiver crashes on startup with \\\"panic: a seccomp policy is already registered\\\" in heartbeat/security/seccomp.go, causing the cel-es-default-output-internal unit to fatally exit and restart repeatedly. Onset ~16:30Z; confirmed still occurring at 18:27Z. Agentless log ingestion and output pipeline are degraded for affected integrations. No exposed downstream services. Identify affected pods in crash loop and roll back to a stable image version or disable the heartbeat receiver component to stop the loop.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure",
      "Libbeat Output Read Errors",
      "Libbeat Output Write Latency Spike",
      "Connectors Service Type Not Configured"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected agentless pod(s) in a crash loop: kubectl get pods -n <project-namespace> -l unit.id=cel-es-default-output-internal --sort-by=.status.startTime | grep -v Running to find restarting pods.",
      "Pin the affected agentless integration to a known-good image version that does not exhibit the double seccomp registration: kubectl set image deployment/agentless-<policy-id> agentless=docker.elastic.co/observability-ci/ecp-elastic-agent-service:<previous-stable-tag> -n <project-namespace>.",
      "If rollback is not immediately possible, disable the heartbeat receiver component for the affected integration to stop the crash loop: kubectl annotate deployment/agentless-<policy-id> -n <project-namespace> agentless.elastic.co/disable-heartbeat=true and file a bug against the seccomp double-registration in heartbeat/security/seccomp.go:MustRegisterPolicy."
    ],
    "dependency_edges": [],
    "root_cause": "agentless collector is failing because the heartbeat receiver process panics when registering a seccomp policy (\"a seccomp policy is already registered\"), causing the cel-es-default-output-internal unit to fatally exit and restart."
  },
  {
    "event_id": "eba687ca-efec-474b-9a64-ca83cc770e9c",
    "timestamp": "2026-07-15T18:28:08.438Z",
    "created_at": "2026-07-15T18:28:08.438Z",
    "discovery_id": "1ca26cf2-9f62-4cac-b86f-dc3235581f00",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-19524da3",
    "status": "acknowledged",
    "title": "O365 ingestion — DLP subscription: permission missing (AF10001)",
    "summary": "O365 DLP audit collection is blocked due to a missing permission scope on the configured O365 app. The subscription start call to /activity/feed/subscriptions/start for DLP.All returns 401 Unauthorized with AF10001 (\"permission set does not include the expected permission\"). Onset ~17:01Z; confirmed still active at 18:23Z. No downstream services are exposed. Assign to the team managing O365 app credentials and correct the permission scope to restore DLP audit ingestion.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Grant the required DLP.All permission scope to the O365 app registration used by the agentless integration: navigate to Azure AD → App Registrations → [app] → API Permissions → Add permission → Office 365 Management APIs → Application permissions → ActivityFeed.Read (DLP.All scope), then grant admin consent.",
      "Restart the affected agentless integration unit after permission grant: kubectl rollout restart deployment/agentless-<policy-id> -n <project-namespace> to force a fresh subscription start attempt.",
      "Verify the fix by tailing the agentless log stream: kubectl logs -n <project-namespace> -l k8s.elastic.co/agent-policy-id=<policy-id> --since=5m | grep -i 'AF10001\\|DLP.All\\|subscription'"
    ],
    "dependency_edges": [],
    "root_cause": "o365.audit subscription start is failing because the configured permission set for DLP.All is missing required scopes, resulting in AF10001 and 401 Unauthorized responses from the O365 API."
  },
  {
    "event_id": "f24cd759-46c2-4ac5-a534-8577b5be2e10",
    "timestamp": "2026-07-15T18:18:37.348Z",
    "created_at": "2026-07-15T18:18:37.348Z",
    "discovery_id": "agentless-seccomp-policy-conflict-2026-07-15T18:07:49Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__go-panic-in-agentless-component-aa132def",
    "status": "acknowledged",
    "title": "Agentless component — heartbeat/synthetics: seccomp policy conflict causes Go panic",
    "summary": "Agentless heartbeat/synthetics component is crashing with a Go panic due to a seccomp policy conflict: 'panic: a seccomp policy is already registered' confirmed active as recently as 18:15:28Z. The panic occurs during OTel collector startup when heartbeat's MustRegisterPolicy is called but a seccomp policy is already registered by the parent process. This causes the spawned unit to terminate immediately, disrupting agentless synthetic monitoring and collection jobs. No exposed user-facing dependency edges. Identify and remove the duplicate seccomp policy registration in the heartbeat/synthetics component configuration to stop the panic loop.",
    "criticality": 45,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the agentless heartbeat/synthetics deployment registering the duplicate seccomp policy: kubectl get pods -A | grep agentless | grep -v Running, then inspect the unit configuration for duplicate seccomp policy registration.",
      "Pin the heartbeat/synthetics component to a version that does not double-register the seccomp policy, or patch the agentless integration configuration to disable seccomp policy registration if already handled by the parent process: update the agentless policy in Kibana Fleet to remove duplicate seccomp settings.",
      "If an immediate fix is not available, restart the affected agentless deployment to clear the panic loop: kubectl rollout restart deployment/<agentless-heartbeat-deployment> -n <agentless-namespace>, then monitor for recurrence."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless heartbeat/synthetics component is panicking at startup because MustRegisterPolicy is called when a seccomp policy is already registered, causing immediate process termination and downstream FAILED state transitions."
  },
  {
    "event_id": "878e9a81-e3d5-4255-9c17-c459ae110316",
    "timestamp": "2026-07-15T18:18:01.041Z",
    "created_at": "2026-07-15T18:18:01.041Z",
    "discovery_id": "agentless-component-failed-state-2026-07-15T18:07:49Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-failed-state-61369fd2",
    "status": "acknowledged",
    "title": "Agentless component — state machine: FAILED state transition alerts",
    "summary": "Agentless component state machine is showing FAILED signals in the agentless log stream, with 'request failed' messages confirmed as recently as 18:15:45Z. The explicit component.state FAILED signature query returned no rows, so the failure mode is non-specific. This signal is likely a downstream symptom of the confirmed seccomp policy conflict panic (see related incident). No exposed dependency edges. Monitor alongside the seccomp panic fix — if that resolves, verify whether FAILED state signals also clear.",
    "criticality": 30,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless component state logs for explicit FAILED transitions: kubectl logs -n <agentless-namespace> <agentless-pod> | grep -i 'component.state\\|FAILED\\|state transition' to identify which component is failing.",
      "Cross-reference with the seccomp policy conflict incident (D5) — if the seccomp panic is resolved, verify whether FAILED state transitions also clear.",
      "If FAILED state persists after seccomp fix, restart the affected agentless deployment: kubectl rollout restart deployment/<agentless-deployment-name> -n <agentless-namespace>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "680d5714-9576-4fb1-ac7f-1ae16a091d38",
    "timestamp": "2026-07-15T18:17:05.670Z",
    "created_at": "2026-07-15T18:17:05.670Z",
    "discovery_id": "agentless-cloud-credentials-misconfig-2026-07-15T18:07:49Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-66273bd4",
    "status": "acknowledged",
    "title": "Agentless cloud collection — credentials: invalid GCP credentials JSON / missing credentials config alerts",
    "summary": "Agentless Cloudbeat is failing to initialize GCP collection because the provided GCP credentials JSON is invalid. The beater exits immediately on startup with \"failed to initialize gcp config: invalid credentials JSON\", confirmed active as recently as 18:15:43Z. AWS OTel collector missing-credentials alert is firing on the same stream but the most recent matching row is the GCP credentials error — AWS-specific confirmation is inconclusive. Agentless cloud security posture collection (CSPM/CIS GCP) is disrupted for affected stacks. Correct the GCP credentials JSON in the agentless integration configuration to restore collection.",
    "criticality": 50,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Locate the agentless integration configuration for the affected GCP stack and replace the invalid credentials JSON: in Kibana Fleet, navigate to the agentless policy → GCP integration → edit credentials field, paste valid service account JSON, and save.",
      "Verify the GCP service account JSON is well-formed by running: echo '<credentials_json>' | python3 -m json.tool — fix any syntax errors before re-uploading.",
      "After correcting credentials, monitor the agentless-log stream for 'Beater successfully started' or absence of 'invalid credentials JSON' errors to confirm recovery: FROM $.logging-gcp-us-central1-logs-agentless-log-default | WHERE message : \"invalid credentials\" | SORT @timestamp DESC | LIMIT 5"
    ],
    "dependency_edges": [],
    "root_cause": "Cloudbeat agentless collection is failing because the provided GCP credentials JSON is invalid, preventing beater initialization and causing immediate process exit."
  },
  {
    "event_id": "99df5672-13bd-4da3-9a1a-455e31800d82",
    "timestamp": "2026-07-15T18:06:39.980Z",
    "created_at": "2026-07-15T18:06:39.980Z",
    "discovery_id": "disc_connectors_config_errors_20260715T165819Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-field-validation-error-config-23d7bbd5",
    "status": "acknowledged",
    "title": "Connectors — configuration validation: missing required fields prevents startup",
    "summary": "Connectors: connector startup blocked by configuration validation failures across multiple connector types. Affects users provisioning connectors (Google Drive, and others with missing Authentication Token/Days of message history fields) — sync jobs cannot run. Onset ~2026-07-15T15:30Z; most recent validation failures confirmed at 2026-07-15T18:00:47-56Z — still active. Validate connector policy/settings and populate required fields/credentials in Kibana Search > Connectors.",
    "criticality": 45,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured",
      "Connectors Field Validation Error (ConfigurableFieldValueError)",
      "Connectors Missing Required Configuration Fields"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In Kibana, navigate to Search > Connectors and identify connectors showing configuration errors; populate all required fields (service account JSON, API tokens, credentials) for each affected connector",
      "For Google Drive connectors: provide a valid service account JSON with appropriate Drive API permissions in the connector configuration",
      "For connectors with 'Authentication Token' errors: rotate and re-enter the API token in the connector settings; verify the token has not expired and has the required scopes"
    ],
    "dependency_edges": [],
    "root_cause": "Elastic Connectors service is failing because required connector configuration fields are empty (example: 'Google Drive service account JSON' not set), causing ConfigurableFieldValueError validation failures and preventing connector startup."
  },
  {
    "event_id": "841049b3-79e8-41e0-8250-c8d2ad0aa9f7",
    "timestamp": "2026-07-15T18:04:04.595Z",
    "created_at": "2026-07-15T18:04:04.595Z",
    "discovery_id": "disc_integration_api_401_20260715T165819Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-api-401-unauthorized-errors-2aa481c7",
    "status": "acknowledged",
    "title": "Integration API — authentication: 401 unauthorized errors",
    "summary": "Integration API: 401 Unauthorized errors from agentless integration components. Affects agentless integration calls relying on Integration API auth; requests are rejected. Onset ~2026-07-15T16:00Z; most recent failure confirmed at 2026-07-15T18:00:48Z — still active. Validate the API credentials/token used by the agentless integration component.",
    "criticality": 20,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration API 401 Unauthorized Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Validate the API credentials/token used by the agentless integration component: in Kibana Fleet, navigate to the affected agentless policy and re-enter or rotate the Integration API credentials",
      "Check Integration API service logs for auth failures: kubectl logs -n <integration-api-namespace> -l app=integration-api --tail=100 | grep -i 401",
      "If credentials were recently rotated, update the agentless policy secret: kubectl create secret generic integration-api-creds --from-literal=token=<new-token> -n <agentless-namespace> --dry-run=client -o yaml | kubectl apply -f -"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "27dd8e08-0f70-41e4-b5fc-9ba0a0b0cf54",
    "timestamp": "2026-07-15T18:03:30.223Z",
    "created_at": "2026-07-15T18:03:30.223Z",
    "discovery_id": "cf60f42a-4bc1-4820-9fa7-494ae9ac409c",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsup-a3bd785a",
    "status": "acknowledged",
    "title": "Agentless integrations — config/auth failures: multiple inputs erroring",
    "summary": "Agentless integrations: multiple inputs failing simultaneously across 9 detection rules. Affects agentless data collection for connectors (Notion, Google Drive, others), Okta system logs, HTTPJSON/CEL inputs, and OTel collector for AWS CloudWatch. Internal-only blast radius (httpjson→okta dependency). Onset ~2026-07-15T15:30Z; all failure domains confirmed still active at ~2026-07-15T18:00Z. Review recent agentless policy/config changes — fix missing AWS credentials config for OTel collector and restore required connectors indices / integration credentials.",
    "criticality": 45,
    "confidence": 0.67,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)",
      "Connectors Notion API Response Error",
      "Integration OAuth Token Fetch 403 Forbidden",
      "Okta Developer Org Deactivated (E0000260)",
      "HTTPJSON Retryable HTTP Request Failures",
      "OTel Collector Exited with Error (otel_manager)",
      "Connectors Elasticsearch Index Not Found",
      "Elastic Agent RPC Context Canceled Errors",
      "Connectors Python Client API Retry Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restore the missing Elasticsearch index for connectors: POST .elastic-connectors-sync-jobs/_create or re-run the Fleet/Kibana setup that provisions connector indices (check kibana-system user permissions)",
      "Fix OTel collector AWS credentials config: kubectl edit configmap -n <agentless-namespace> <otel-collector-config> and add credentials/assume_role/profile to each awscredentialsprovider extension, or remove the auth option to use the default SDK credential chain",
      "Rotate/re-validate Okta and OAuth integration credentials: in Kibana Fleet, navigate to the failing agentless integrations and update the API token/OAuth client credentials for Okta and affected HTTPJSON inputs"
    ],
    "dependency_edges": [
      {
        "source": "httpjson",
        "target": "okta",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "Agentless-managed collectors are failing because multiple integration configurations are invalid or missing required upstream credentials/resources: the OTel collector awscredentialsprovider extensions have no credentials/assume_role/profile configured, and the connectors service cannot access required Elasticsearch indices (e.g., .elastic-connectors-sync-jobs) while external integrations (Okta/Notion/CEL/HTTPJSON) encounter authentication or endpoint configuration errors."
  },
  {
    "event_id": "78146d99-3323-49ac-9268-5e3e7eab5964",
    "timestamp": "2026-07-15T18:02:12.288Z",
    "created_at": "2026-07-15T18:02:12.288Z",
    "discovery_id": "7ab921d3-c93f-4011-bc54-dc043d1ae2e3",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-398b7040",
    "status": "acknowledged",
    "title": "UIAM — authentication endpoint: proxy auth failures",
    "summary": "UIAM authentication requests via ingress proxy are returning HTTP ≥400 errors on the /_authenticate path. Affects clients authenticating through the proxy to UIAM. Onset ~2026-07-15T15:30Z; most recent failure confirmed at 2026-07-15T17:59:54Z — still active. Review UIAM service error logs (service.name=uiam) and proxy routing health for the UIAM backend.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM pod health: kubectl get pods -n uiam -l app.kubernetes.io/role=uiam-external and kubectl logs -n uiam -l app.kubernetes.io/role=uiam-external --tail=100",
      "Inspect ingress proxy routing for UIAM backend: kubectl describe ingress -n ingress-proxy | grep -A5 uiam and verify backend endpoints are healthy",
      "If UIAM pods are crash-looping, restart the deployment: kubectl rollout restart deployment -n uiam -l app.kubernetes.io/role=uiam-external"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "4b56c16c-d462-4530-9ff7-1b4120abfe01",
    "timestamp": "2026-07-15T17:47:05.850Z",
    "created_at": "2026-07-15T17:47:05.850Z",
    "discovery_id": "disc_agent_symlink_missing_20260715T165819Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__elastic-agent-data-directory-symlink-mis-f1de0386",
    "status": "acknowledged",
    "title": "Agentless Elastic Agent — data directory: live home symlink missing",
    "summary": "Agentless Elastic Agent cleanup is failing because the live versioned home symlink in the agent data directory is missing or unresolvable. Confirmed still active at 17:43Z — orphan directories are accumulating but agent operation is not blocked. No exposed dependency edges; impact is limited to disk housekeeping. Schedule remediation to restore the symlink or restart affected pods.",
    "criticality": 15,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Elastic Agent Data Directory Symlink Missing"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify the agent data directory symlink structure on affected pods: kubectl exec -n <agentless-namespace> <pod-name> -- ls -la /opt/Elastic/Agent/data/ to identify missing or broken symlinks.",
      "Restore the live versioned home symlink if missing: kubectl exec -n <agentless-namespace> <pod-name> -- ln -s /opt/Elastic/Agent/data/<version-dir> /opt/Elastic/Agent/data/elastic-agent-active.",
      "If symlink cannot be restored, force a pod restart to trigger fresh agent initialization: kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "33bdcc89-0283-4063-923c-0abcd56f90fc",
    "timestamp": "2026-07-15T17:46:42.522Z",
    "created_at": "2026-07-15T17:46:42.522Z",
    "discovery_id": "19b9ea33-7685-4635-ad7b-f50b7fd8f24d",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-9540945c",
    "status": "acknowledged",
    "title": "Elasticsearch controller — warnings/errors: alert present but log signature not captured",
    "summary": "Elasticsearch controller is emitting error/warning logs since ~15:30Z; the signal is stationary (not a new spike) and still active as of 17:23Z. Message content could not be retrieved from this stream's projection. No exposed dependency edges or known blast radius. Inspect controller logs directly to determine the specific error type and affected resources.",
    "criticality": 25,
    "confidence": 0.3,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect elasticsearch-controller logs directly to retrieve message content: kubectl logs -n <elasticsearch-controller-namespace> -l app=elasticsearch-controller --since=2h | grep -E 'error|warn'",
      "Check Elasticsearch cluster health for any controller-managed resources: kubectl get elasticsearch -A and review any resources in non-green state.",
      "If controller errors are related to a specific resource, describe it for details: kubectl describe elasticsearch <resource-name> -n <namespace>."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "05ecc879-e181-4e3c-b19c-23d9d2765ce4",
    "timestamp": "2026-07-15T17:45:56.401Z",
    "created_at": "2026-07-15T17:45:56.401Z",
    "discovery_id": "b0009947-6168-4cf5-89a8-4c0f33980a76",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__all-error-level-log-entries-1dda95e7",
    "status": "acknowledged",
    "title": "Agentless logging — GCP config init: invalid credentials JSON stops Beat startup",
    "summary": "Agentless log collection pipeline is experiencing errors: the Beat launcher failed to initialize its GCP configuration due to invalid credentials JSON at onset (~15:30Z), and the stream continues to produce errors including O365 DLP 401 Unauthorized (AF10001) and CEL evaluation failures. Current-state check at 17:43Z shows the stream is alive but producing a different error class (state registry 404), suggesting the GCP credentials failure may have been transient while downstream connector errors persist. No exposed dependency edges; blast radius is bounded to agentless log collection. Immediate action: verify GCP credentials JSON validity and check O365 DLP subscription permissions.",
    "criticality": 55,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "All Error-Level Log Entries",
      "Libbeat Output Write Latency Spike",
      "CEL Input Retryable HTTP Request Failure",
      "O365 DLP Subscription Permission Error (AF10001)",
      "Libbeat Output Read Errors",
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and rotate the GCP credentials JSON used by the agentless Beat launcher: kubectl get secret -n <agentless-namespace> <gcp-credentials-secret> -o yaml, then validate the JSON structure and re-apply with kubectl apply -f.",
      "Check O365 DLP subscription permissions for the AF10001 error: review the Microsoft 365 app registration in Azure AD and ensure the required DLP subscription permissions are granted (Application.Read.All, ActivityFeed.Read).",
      "Restart the affected agentless Beat pod to force re-initialization after credentials are fixed: kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless logging pipeline is failing because the Beat process cannot initialize its GCP configuration — credentials JSON is invalid, preventing the beater from starting."
  },
  {
    "event_id": "e6f656b2-3bae-4205-8d00-0d276169e543",
    "timestamp": "2026-07-15T17:21:39.019Z",
    "created_at": "2026-07-15T17:21:39.019Z",
    "discovery_id": "disc_agentless_degraded_state_cleanup_registry_20260715T165819Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-degraded-sta-138f6516",
    "status": "acknowledged",
    "title": "Agentless component — state management: degraded due to registry cleanup failures",
    "summary": "Agentless component: state registry cleanup is failing with Elasticsearch 404 Not Found on agentless-state documents, causing repeated degraded-state cleanup cycles rescheduled every 10 minutes. Affects state management for agentless integrations in logging-gcp-us-central1; no user-facing path exposed. Degraded state confirmed active at 17:17:08Z. Investigate agentless-state index consistency in Elasticsearch.",
    "criticality": 25,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL State Registry Cleanup Failure",
      "Agentless Component Entered DEGRADED State"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Investigate the Elasticsearch agentless-state-* index for missing or inconsistent documents causing 404 errors during registry cleanup: `curl -X GET '<ES_HOST>/_cat/indices/agentless-state-*?v'` and check for index health issues.",
      "If the agentless-state index is missing or corrupt, recreate it or restore from snapshot, then restart the affected agentless component to clear the degraded state: `kubectl rollout restart deployment -n <agentless-namespace> <agentless-deployment-name>`",
      "Monitor cleanup retry cycles to confirm recovery: `kubectl logs -n <agentless-namespace> <agentless-pod> | grep -E 'DEGRADED|registry|cleanup'`"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless component is operating in a degraded state because CEL state registry cleanup fails on the Elasticsearch state store (store/remove returns 404 Not Found for agentless-state documents), causing cleanup to complete in degraded mode and reschedule retries."
  },
  {
    "event_id": "478f0168-8e82-44d2-aefc-c40ac8e2c934",
    "timestamp": "2026-07-15T17:08:42.467Z",
    "created_at": "2026-07-15T17:08:42.467Z",
    "discovery_id": "disc_proxy_5xx_stationary_20260715T165819Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-cc7c9ed2",
    "status": "acknowledged",
    "title": "Proxy — HTTP responses: 5xx server errors (stationary alert)",
    "summary": "Proxy: intermittent 5xx responses confirmed still active as of 17:06:59Z. No exposed dependency edges; blast radius is limited to proxy-routed requests. Stationary change type indicates chronic background behavior rather than a new incident onset. Monitor for rate increase; inspect proxy logs if user-impact reports emerge.",
    "criticality": 20,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy pod logs for 5xx error patterns: kubectl logs -n ingress-proxy -l app.kubernetes.io/name=proxy --tail=100 | grep -E '\"status_code\":[5][0-9][0-9]'",
      "Verify upstream backend health for proxy-routed services: kubectl get pods -n ingress-proxy -l app.kubernetes.io/name=proxy -o wide",
      "If 5xx rate is elevated above baseline, check proxy configuration and upstream endpoint availability: kubectl describe svc -n ingress-proxy"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "2baf90c1-4354-43bb-9e95-65f9a2ab898e",
    "timestamp": "2026-07-15T16:04:44.367Z",
    "created_at": "2026-07-15T16:04:44.367Z",
    "discovery_id": "16453b90-881d-4d0c-9365-f3bae46a244c",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-d7d221f3",
    "status": "acknowledged",
    "title": "Proxy — edge routing: HTTP 5xx and auth failures",
    "summary": "Proxy: elevated HTTP 5xx server errors and authentication failures on the _authenticate endpoint are active and ongoing. Onset ~2026-07-15T15:56:49Z; confirmed still active as of 16:02:35Z. The proxy is shared infrastructure — users attempting to authenticate may be experiencing login failures. The 5xx signal shows a distribution change (p_value=0.0043); auth failures are at a stationary baseline level. Immediate action: inspect proxy pod health and recent restarts, verify upstream backend (Elasticsearch) health, and roll back any recent proxy deployment if applicable.",
    "criticality": 55,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors",
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy pod health and recent restarts: kubectl get pods -n ingress-proxy -l app.kubernetes.io/name=proxy --sort-by=.status.startTime and review logs of any recently restarted pods: kubectl logs -n ingress-proxy <pod-name> --previous.",
      "Inspect upstream backend health for the proxy: verify that Elasticsearch and other backend services the proxy routes to are healthy. Check: kubectl get pods -n <es-namespace> -l app.kubernetes.io/name=elasticsearch and review any pods in non-Running state.",
      "If a recent proxy deployment is suspected, roll back: helm rollback ingress-proxy -n ingress-proxy or kubectl rollout undo deployment/ingress-proxy-us-central1-a -n ingress-proxy (repeat for each zone replica)."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "1d40e823-2138-4cdd-80ff-7ec4340b1919",
    "timestamp": "2026-07-15T16:04:06.094Z",
    "created_at": "2026-07-15T16:04:06.094Z",
    "discovery_id": "d46ecf24-d500-4f72-9a81-69da0e43dfc0",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-degraded-sta-0e67200f",
    "status": "acknowledged",
    "title": "Agentless runtime — connector execution: degraded state and configuration/credential errors",
    "summary": "Agentless runtime: multiple connector and integration failures are active and ongoing. Affected components include Okta/OAuth token fetch (403 Forbidden), connector service type misconfiguration, HTTPJSON retryable request failures, missing Elastic Agent data directory symlink, connector field validation errors (empty required fields), CEL state registry cleanup failures (ES 404), and agentless component DEGRADED state. Onset ~2026-07-15T15:56:49Z; confirmed still active as of 16:02:27Z. Impact is limited to agentless connector integrations — no exposed user-facing dependency edges. Immediate action: audit agentless connector configurations in Kibana for missing required fields and invalid OAuth/credential settings, and verify the Elastic Agent data directory symlink on affected pods.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)",
      "Integration OAuth Token Fetch 403 Forbidden",
      "Connectors Service Type Not Configured",
      "HTTPJSON Retryable HTTP Request Failures",
      "Elastic Agent Data Directory Symlink Missing",
      "Connectors Field Validation Error (ConfigurableFieldValueError)",
      "CEL State Registry Cleanup Failure",
      "Agentless Component Entered DEGRADED State"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Audit all agentless connector configurations in Kibana Fleet > Integrations: identify connectors with empty required fields (e.g. Authentication Token, Days of message history) and complete their configuration. Run: kubectl get pods -n <agentless-namespace> -l app.kubernetes.io/component=agentless to list affected pods.",
      "Validate OAuth credentials for Okta and other OAuth-based integrations: check that client_id, client_secret, and token_url are correctly set in each integration policy. Rotate or re-enter credentials if expired.",
      "Inspect the Elastic Agent data directory symlink on degraded pods: kubectl exec -n <agentless-namespace> <pod-name> -- readlink -f /usr/share/elastic-agent/data/elastic-agent-<version> and recreate the symlink if missing. If the pod is in a crash loop, delete and allow it to reschedule: kubectl delete pod -n <agentless-namespace> <pod-name>."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "a8b698df-6633-4e1c-a094-22dc271cfe0e",
    "timestamp": "2026-07-15T16:01:39.938Z",
    "created_at": "2026-07-15T16:01:39.938Z",
    "discovery_id": "ffb43244-58a3-4167-baa3-1f6dc6226fbc",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-a034a9f1",
    "status": "acknowledged",
    "title": "Elasticsearch controller — logs: errors and warnings detection (unverified)",
    "summary": "Elasticsearch controller log stream is unverifiable: the index `logging-gcp-us-central1-logs-all` returned an unknown-index error during current-state check, indicating a telemetry gap rather than confirmed recovery. The underlying alert (stationary pattern, p_value=0) has no query KI backing and no confirmed error rows. Cannot determine whether the stream is healthy or absent. Monitor for index availability; add a query KI for rule 76cc20f4 to enable ES|QL validation next cycle.",
    "criticality": 20,
    "confidence": 0.25,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify that the index `logging-gcp-us-central1-logs-all` exists and is accessible: run `GET logging-gcp-us-central1-logs-all/_stats` in Kibana Dev Tools or via the Elasticsearch API to confirm index health.",
      "Add a query KI for rule UUID 76cc20f4-6f50-5f43-a870-c2df0e768ac4 (Elasticsearch Controller Errors and Warnings) so the alert can be validated via ES|QL in the next review cycle.",
      "If the index is missing, check the GCP logging pipeline and Elastic Agent/Logstash configuration for the `logging-gcp-us-central1-logs-all` data stream to restore ingestion."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "e359e204-367b-4585-bb7a-48e8b1f15125",
    "timestamp": "2026-07-15T15:41:25.005Z",
    "created_at": "2026-07-15T15:41:25.005Z",
    "discovery_id": "disc-azure-oauth-aadsts7000222-2026-07-15T15:34:57Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-cc63bc12",
    "status": "acknowledged",
    "title": "Agentless integration — Azure OAuth: client secret expired (AADSTS7000222)",
    "summary": "Agentless Azure-backed integration in logging-gcp-us-central1 is failing OAuth token acquisition with AADSTS7000222 (expired client secret). The affected integration(s) cannot authenticate to Azure AD and are blocked from collecting data. Error confirmed still active at 15:40Z (just before this review). No user-facing services are directly exposed. Immediate action: rotate the Azure AD app client secret and update the integration configuration in Fleet/Kibana.",
    "criticality": 30,
    "confidence": 0.68,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Azure OAuth Client Secret Expired (AADSTS7000222)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate the Azure AD app client secret: in Azure Portal → App registrations → [affected app] → Certificates & secrets → New client secret. Copy the new secret value immediately.",
      "Update the integration credential in Fleet: Kibana → Fleet → Integrations → [affected Azure integration] → Edit → update the Client Secret field with the new value, then save and redeploy.",
      "Verify recovery by checking that AADSTS7000222 errors stop appearing in the agentless logs: kubectl logs -n <project-namespace> <agentless-pod> | grep AADSTS7000222"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless integration OAuth is failing because the configured Azure AD client secret is expired, causing token acquisition to return AADSTS7000222."
  },
  {
    "event_id": "5812eba3-17a6-4256-8dca-688dca22ea19",
    "timestamp": "2026-07-15T15:27:16.567Z",
    "created_at": "2026-07-15T15:27:16.567Z",
    "discovery_id": "0553b11c-5df6-402f-99e4-a1e5912c0a9e",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-f5d33675",
    "status": "acknowledged",
    "title": "Cloudbeat — credentials provider: invalid configuration (missing credentials/profile)",
    "summary": "Cloudbeat is failing to start due to invalid GCP credentials configuration — the credentials provider requires at least one of credentials JSON, assume_role, or profile, but none is set. GCP CSPM data collection is blocked for affected agentless deployments. The error is ongoing — most recent occurrence confirmed at 10:48Z. Restore the GCP credentials configuration in the affected Fleet agent policy to resume collection.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and restore the GCP credentials configuration for the affected cloudbeat integration: in Kibana Fleet, navigate to the affected agent policy → cloudbeat/CIS GCP integration → edit credentials settings to provide a valid credentials JSON, assume_role ARN, or profile name.",
      "If using a GCP service account key, regenerate and re-upload the credentials JSON: `gcloud iam service-accounts keys create /tmp/sa-key.json --iam-account=<sa-email>` then update the integration config in Fleet.",
      "Restart the affected agentless pod after credentials are updated to force a clean startup: `kubectl rollout restart deployment/<cloudbeat-agentless-deployment> -n <project-namespace>`"
    ],
    "dependency_edges": [
      {
        "source": "cloudbeat",
        "target": "elasticsearch",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "Cloudbeat is failing to start because its GCP credentials provider configuration is missing required authentication settings — none of credentials JSON, assume_role, or profile is set — causing config validation to fail at startup."
  },
  {
    "event_id": "6b6ebe9b-fd2e-4011-9451-27cbd1a81e1a",
    "timestamp": "2026-07-15T15:26:22.863Z",
    "created_at": "2026-07-15T15:26:22.863Z",
    "discovery_id": "72b3b584-4403-45c7-b1fe-6f5a1a241222",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-cross-az-backend-routing-093b4535",
    "status": "acknowledged",
    "title": "Ingress proxy — backend routing: cross-AZ routing events",
    "summary": "Ingress proxy: cross-AZ backend routing is active, indicating one or more same-AZ Elasticsearch backends are unavailable or unhealthy. Clients routed through the proxy experience increased latency due to cross-zone traffic. Confirmed still active as of 15:23Z; onset ~13:30Z. Verify health of same-AZ backends and restore to stop cross-AZ fallback.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy Cross-AZ Backend Routing"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check health of same-AZ Elasticsearch backends for the affected zone: kubectl get pods -l app=es -n <project-namespace> --field-selector spec.nodeName=<same-az-node> to identify unhealthy pods causing cross-AZ fallback.",
      "If same-AZ backends are unhealthy, trigger a rolling restart to recover: kubectl rollout restart deployment/<es-deployment> -n <project-namespace> for the affected zone's ES deployment.",
      "Monitor proxy routing metrics to confirm same-AZ routing resumes after backend recovery: watch kubectl logs -l app=ingress-proxy -n ingress-proxy --tail=20 | grep routing_decision to verify same_az routing returns."
    ],
    "dependency_edges": [],
    "root_cause": "Ingress proxy is routing cross-AZ because at least one same-AZ backend is unavailable or unhealthy, forcing selection of a backend in another zone."
  },
  {
    "event_id": "bfd0dba5-408d-446c-9854-81f4abf33f56",
    "timestamp": "2026-07-15T15:25:49.051Z",
    "created_at": "2026-07-15T15:25:49.051Z",
    "discovery_id": "3aa79fb8-4216-49e7-8582-d3cf083fc7a7",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-elasticsearch-index-not-found-c78e228c",
    "status": "acknowledged",
    "title": "Connectors — sync job storage: required Elasticsearch index missing",
    "summary": "Connectors: all connector sync job operations are failing due to a missing Elasticsearch system index (.elastic-connectors-sync-jobs). Connector sync jobs and related API calls are blocked with 404/index_not_found_exception errors. Confirmed still active as of 15:23Z; onset ~13:30Z with no recovery. Restore or initialize the missing connectors system index immediately.",
    "criticality": 35,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Index Not Found",
      "Connectors Elasticsearch Refresh API 404 Errors",
      "Connectors Python Client API Retry Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restore the missing Elasticsearch system index by running the connector setup/initialization: POST /_connector/_sync_job (or via Kibana Connectors UI) to trigger index creation, or manually create the index: PUT .elastic-connectors-sync-jobs with the required mappings from the connectors service schema.",
      "If the index was accidentally deleted, check Elasticsearch snapshots and restore from the most recent snapshot: POST /_snapshot/<repository>/<snapshot>/_restore with indices: '.elastic-connectors-sync-jobs'.",
      "Verify all required connector system indices exist after restoration: GET /_cat/indices/.elastic-connectors* to confirm .elastic-connectors, .elastic-connectors-sync-jobs, and .elastic-connectors-access-control are present and healthy."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors are failing because the required Elasticsearch system index .elastic-connectors-sync-jobs does not exist, returning index_not_found_exception and blocking connector sync job execution."
  },
  {
    "event_id": "0e073fa5-33fc-45a4-b0a7-5340dbd0be4f",
    "timestamp": "2026-07-15T15:25:16.016Z",
    "created_at": "2026-07-15T15:25:16.016Z",
    "discovery_id": "e3bc28f1-1872-4553-9003-b0496c5002cb",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cloudbeat-launcher-fatal-exit-02134b1a",
    "status": "acknowledged",
    "title": "Agentless runtime — component lifecycle: seccomp policy double-registration panic",
    "summary": "Agentless runtime: Heartbeat-based receiver components are crashing on startup in a continuous loop due to a seccomp policy double-registration panic. Agentless-managed integrations (Cloudbeat/Heartbeat-based receivers) are unable to collect data. Confirmed still active as of 15:22Z; onset ~13:30Z with no recovery. Roll back the affected agentless component build or disable the hbreceiver factory to stop the crash loop.",
    "criticality": 40,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Elastic Agent RPC Context Canceled Errors",
      "Cloudbeat Launcher Fatal Exit"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the affected agentless component build: kubectl rollout undo deployment -l app.kubernetes.io/component=agentless -n <affected-namespace> to revert to the last known-good image that does not double-register the seccomp policy.",
      "If rollback is not immediately available, patch the affected agentless deployments to disable the Heartbeat/receiver component by removing the hbreceiver factory from the component spec: kubectl set env deployment/<agentless-deployment> DISABLE_HEARTBEAT_RECEIVER=true -n <affected-namespace>.",
      "Identify all affected agentless integration namespaces and verify component health after rollback: kubectl get pods -l app.kubernetes.io/component=agentless --all-namespaces | grep -v Running to confirm crash loop resolution."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless component units are exiting because a Heartbeat/receiver process panics on startup when a seccomp policy is double-registered ('a seccomp policy is already registered' in heartbeat/security.mustConfigureSeccompPolicy), leading to fatal spawn failures and RPC contexts being canceled."
  },
  {
    "event_id": "295b6e8c-8d22-4b05-9ff7-5265525eb6f8",
    "timestamp": "2026-07-15T15:10:56.554Z",
    "created_at": "2026-07-15T15:10:56.554Z",
    "discovery_id": "a8843224-af30-4d98-8f3a-7073378918e4",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__otel-collector-invalid-configuration-err-0655b99d",
    "status": "acknowledged",
    "title": "Agentless OTel manager — collector startup: invalid configuration error",
    "summary": "Agentless OTel manager is rejecting the collector configuration for multiple AWS integrations. Six AWS OTel collector components (EC2, SQS, ELB, ECS, Lambda, RDS) are failing to start because their awscredentialsprovider extensions have no credentials, assume_role, or profile configured. Active errors confirmed as recently as 15:05:52Z, with onset around 13:30Z. Configure AWS credentials for the affected integration policy in Kibana to restore telemetry collection.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Invalid Configuration Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected integration policy in Kibana (Search > Integrations, filter by AWS) and navigate to the OTel collector configuration to add AWS credentials, assume_role ARN, or profile for each affected component (EC2, SQS, ELB, ECS, Lambda, RDS)",
      "Alternatively, configure the default AWS SDK credential chain on the agentless pod by setting AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY environment variables or attaching an IAM instance profile: kubectl annotate serviceaccount -n <agentless-namespace> <sa-name> eks.amazonaws.com/role-arn=<role-arn>",
      "After updating credentials, verify the collector restarts successfully: kubectl logs -n <agentless-namespace> -l app=agentless --since=5m | grep -E 'otel_manager|invalid configuration|collector started'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "9452cf72-9721-4a90-aa5f-0667eb552ef0",
    "timestamp": "2026-07-15T15:08:19.745Z",
    "created_at": "2026-07-15T15:08:19.745Z",
    "discovery_id": "0abcf387-c728-4487-be42-07031f3835e9",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-retryable-http-request-failures-9e451bcf",
    "status": "acknowledged",
    "title": "Agentless HTTPJSON — upstream API polling: retryable failures / 401s",
    "summary": "Agentless HTTPJSON polling is failing with retryable HTTP request errors and 401 Unauthorized responses from upstream APIs. Affected integrations have stopped collecting data. Active failures confirmed as recently as 15:05:51Z, with onset around 13:30Z. Identify the affected integration and rotate or re-enter its API credentials.",
    "criticality": 42,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Retryable HTTP Request Failures",
      "Integration API 401 Unauthorized Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify which HTTPJSON integration is returning 401s: kubectl logs -n <agentless-namespace> -l k8s.elastic.co/agentless-integration-name --since=2h | grep -E '401|Unauthorized|request failed' | head -50",
      "Rotate or re-enter the API credentials for the affected integration in Kibana: navigate to the integration policy, update the API key/token, and save",
      "Verify upstream endpoint reachability from the agentless pod: kubectl exec -n <agentless-namespace> <pod-name> -- curl -I <upstream-api-endpoint>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "2ff9a734-2381-49a7-8742-1519371ffa1b",
    "timestamp": "2026-07-15T15:07:46.611Z",
    "created_at": "2026-07-15T15:07:46.611Z",
    "discovery_id": "d9c29235-1bc6-428b-8fe7-8e306d17ec5f",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-field-validation-error-config-43d9b376",
    "status": "acknowledged",
    "title": "Connectors — configuration validation: required fields missing",
    "summary": "Connectors service is failing configuration validation for one or more connectors. Connector sync jobs for affected sources (confirmed: Azure Blob Storage connector missing all required credentials) cannot run, blocking data ingestion. Active validation errors confirmed as recently as 15:05:44Z, with onset around 13:30Z. Identify and complete the required configuration fields for affected connectors in Kibana.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Missing Required Configuration Fields",
      "Connectors Field Validation Error (ConfigurableFieldValueError)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify affected connector policies in Kibana: navigate to Search > Connectors, filter by status 'Error' or 'Needs configuration', and complete the required fields (Account name, Account key, Blob endpoint, List of containers for Azure Blob Storage)",
      "For each affected connector, verify required fields are populated via the Kibana connector configuration UI or via the Connectors API: GET /_connector?filter_path=results.id,results.name,results.status,results.error",
      "Trigger a manual sync after fixing configuration to verify the connector can now run: POST /_connector/_sync_job with connector_id of the fixed connector"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "28dab29f-866e-4eba-9661-4f34f3d408de",
    "timestamp": "2026-07-15T15:07:10.546Z",
    "created_at": "2026-07-15T15:07:10.546Z",
    "discovery_id": "92275b12-f0e8-4d20-9c20-981fcc86b0e6",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-1cf999c7",
    "status": "promoted",
    "title": "Ingress proxy — request handling: HTTP 5xx server errors",
    "summary": "Ingress proxy is returning HTTP 503 errors to clients. All users routing through the proxy path are at risk of receiving 5xx responses; the proxy depends on the Elasticsearch index tier backend (internal). Active 503s confirmed as recently as 15:05:57Z, with onset around 13:30Z — over 1.5 hours of sustained failure. Immediately check proxy pod health and Elasticsearch index tier backend connectivity.",
    "criticality": 78,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check ingress proxy pod health: kubectl get pods -n ingress-proxy -l app=ingress-proxy --field-selector=status.phase!=Running",
      "Check Elasticsearch index tier pod health and recent events: kubectl get pods -n <es-namespace> -l deployment=es-es-index && kubectl describe pods -n <es-namespace> -l deployment=es-es-index | grep -A5 Events",
      "Review proxy error logs for upstream connection failures: kubectl logs -n ingress-proxy -l app=ingress-proxy --since=2h | grep -E '5[0-9]{2}|upstream|backend|connect'"
    ],
    "dependency_edges": [
      {
        "source": "proxy",
        "target": "es-es-index",
        "protocol": "http",
        "exposure": "not_exposed"
      }
    ],
    "root_cause": "Ingress proxy is returning 503 errors because the Elasticsearch index tier backend (es-es-index) is unreachable or returning errors, causing the proxy to fail requests with 5xx responses."
  },
  {
    "event_id": "867ad536-668b-4d42-83fc-044b75b253ce",
    "timestamp": "2026-07-15T14:58:16.881Z",
    "created_at": "2026-07-15T14:58:16.881Z",
    "discovery_id": "248457e8-2613-49db-8a63-331b753dac99",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsup-2f136369",
    "status": "acknowledged",
    "title": "Agentless integrations — polling: unsupported protocol scheme from empty URL config",
    "summary": "Agentless integrations (GCP us-central1): CEL-based polling inputs are failing with \\\"unsupported protocol scheme\\\" errors caused by empty URL configuration, preventing upstream API data collection. Confirmed active as of 14:55Z. Affects agentless CEL integrations sharing the same onset window; failure is ongoing with no sign of recovery. Immediate action: identify and correct the blank URL field in the affected integration policies via Fleet UI, then restart the affected agentless pods.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)",
      "CEL Input Retryable HTTP Request Failure",
      "Libbeat Output Read Errors",
      "Connectors SSH Connection Failure",
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify and fix the empty URL configuration for affected CEL inputs: inspect the integration policy for each agentless CEL input in Fleet UI (Kibana > Fleet > Agent Policies), locate inputs with a blank or malformed URL field, and update them with the correct endpoint URL, then save and re-deploy the policy.",
      "If the URL was previously set and is now blank, check for a recent policy edit or migration that may have cleared the field — run `kubectl get configmap -n elastic-agent -l integration=cel -o yaml` to inspect the rendered config and identify which integration lost its URL.",
      "Restart the affected agentless integration pods after fixing the URL config to clear the error state: `kubectl rollout restart deployment/<agentless-cel-integration-pod> -n elastic-agent`."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless CEL inputs are failing because their configured URL is empty, causing HTTP requests to error with \\\"unsupported protocol scheme\\\" and preventing upstream API polling."
  },
  {
    "event_id": "217f225b-656e-4a1e-a1c7-b04c3f87e77c",
    "timestamp": "2026-07-15T14:46:31.259Z",
    "created_at": "2026-07-15T14:46:31.259Z",
    "discovery_id": "bacdb06a-0386-4a1b-a630-c29f9d68d80c",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-71afd1f0",
    "status": "acknowledged",
    "title": "Proxy — authentication: elevated failures via proxy detected",
    "summary": "Proxy/UIAM auth: elevated authentication failures via proxy confirmed active as recently as 2026-07-15T14:42:53Z (seconds before review). Distribution change (p=0.004) indicates a real shift in auth failure patterns. Message content could not be retrieved due to a schema projection issue; failure endpoint and error signature unconfirmed. No exposed dependency edges identified. Inspect proxy access logs directly for status_code and request_path details.",
    "criticality": 31,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect proxy access logs directly for status_code and request_path details: `kubectl logs -n <proxy-namespace> -l app=proxy --since=1h | grep -E '_authenticate|40[0-9]|50[0-9]'`",
      "Check UIAM service health and recent error rates: `kubectl get pods -n <uiam-namespace>` and `kubectl logs -n <uiam-namespace> -l app=uiam --since=1h | grep -E 'error|ERROR|failed'`",
      "If UIAM is returning 5xx errors, check for recent deployments or config changes: `kubectl rollout history deployment/uiam -n <uiam-namespace>` and consider rolling back if a recent change correlates with the distribution shift."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "542d0880-c4c5-49eb-b9aa-4d1d6375f23e",
    "timestamp": "2026-07-15T14:46:03.225Z",
    "created_at": "2026-07-15T14:46:03.225Z",
    "discovery_id": "ac050e58-7fe8-41b5-b660-5a7dd82f0872",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-f0cc5919",
    "status": "acknowledged",
    "title": "Elasticsearch controller — logs: error/warning observed",
    "summary": "Elasticsearch controller: error/warning log rows confirmed present as recently as 2026-07-15T14:13:29Z, but message content could not be retrieved due to a schema projection issue. Signal is real (stream alive, error/warning rows present) but failure mechanism is unconfirmed. No exposed dependency edges. Review controller logs directly to identify the specific error.",
    "criticality": 20,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Review elasticsearch-controller logs directly for the error message: `kubectl logs -n <elasticsearch-controller-namespace> -l app=elasticsearch-controller --since=1h | grep -E 'error|warning|ERROR|WARN'`",
      "Check the elasticsearch-controller's managed Elasticsearch cluster statuses: `kubectl get elasticsearch -A` to identify any clusters in a non-green state.",
      "If a specific cluster is failing, inspect its events: `kubectl describe elasticsearch <cluster-name> -n <namespace>` to identify the controller-plane failure mechanism."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "24be5753-5696-4248-ac2a-0754a4eca33f",
    "timestamp": "2026-07-15T14:45:35.564Z",
    "created_at": "2026-07-15T14:45:35.564Z",
    "discovery_id": "47a41655-2ab4-49a4-86db-51978911f5ce",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-3585e26b",
    "status": "acknowledged",
    "title": "O365 integration — DLP subscription: permission error AF10001 blocks collection",
    "summary": "O365 integration: DLP subscription start is failing with AF10001 permission-set errors, leaving the CEL component DEGRADED and blocking O365 DLP audit data collection. Agentless O365 integration is the only affected path; no user-facing services are exposed. Failure confirmed active as of 2026-07-15T14:40:04Z with a strong trend_change signal (p=0.000003) indicating sustained degradation. Grant DLP.All permissions on the Azure AD app and restart the integration pod.",
    "criticality": 50,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Grant the required DLP.All permission to the Azure AD app used by the O365 integration: in Azure Portal > Azure Active Directory > App registrations > [your app] > API permissions, add 'ActivityFeed.Read' and 'DLP.All' under Office 365 Management APIs, then grant admin consent.",
      "After granting permissions, restart the affected agentless integration pod to force a fresh subscription attempt: `kubectl rollout restart deployment/<agentless-o365-deployment> -n <agentless-namespace>`.",
      "Verify the CEL component recovers to HEALTHY state: `kubectl logs -n <agentless-namespace> <agentless-pod> | grep -E 'AF10001|DEGRADED|HEALTHY'` and confirm no further AF10001 errors appear."
    ],
    "dependency_edges": [],
    "root_cause": "CEL-based O365 integration is failing because the configured Azure AD app lacks the required Office 365 Management API permission set for DLP.All, causing subscription start to return AF10001 and the component to enter DEGRADED state."
  },
  {
    "event_id": "44212292-d0c7-4424-b783-e207ed119e0d",
    "timestamp": "2026-07-15T14:45:03.419Z",
    "created_at": "2026-07-15T14:45:03.419Z",
    "discovery_id": "c8fae526-4a69-4f3a-84a5-4d42a0df979d",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-cbfc1b1a",
    "status": "acknowledged",
    "title": "Okta integration — OAuth token fetch: 403 Forbidden due to org deactivation",
    "summary": "Okta integration: OAuth token fetch is returning 403 Forbidden with E0000260 'developer org has been deactivated', halting Okta system log collection. Agentless Okta integration is the only affected path; no user-facing services are exposed. Failure confirmed active as of 2026-07-15T14:42:45Z and persisting since at least 2026-07-15T00:00:16Z. Re-activate the Okta developer org or reconfigure the integration to an active tenant.",
    "criticality": 50,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Re-activate the Okta developer org: log into the Okta Admin Console for the deactivated tenant and restore the org, or contact Okta support with error code E0000260 to expedite reactivation.",
      "If the Okta org cannot be reactivated promptly, reconfigure the agentless Okta integration to point to an active Okta tenant: update the integration credentials in Fleet > Integrations > Okta and redeploy the agentless policy.",
      "Verify the integration resumes log collection after remediation: run `kubectl logs -n <agentless-namespace> <agentless-pod> | grep okta` to confirm oauth2 token fetch succeeds."
    ],
    "dependency_edges": [],
    "root_cause": "Okta agentless integration is failing because the configured Okta developer organization is deactivated (E0000260), causing OAuth token fetch to return 403 Forbidden and halting system log collection."
  },
  {
    "event_id": "7645d7b1-8fa7-48eb-8eb1-ca03ca4dff93",
    "timestamp": "2026-07-15T13:31:24.741Z",
    "created_at": "2026-07-15T13:31:24.741Z",
    "discovery_id": "308edc61-d215-49c4-b05b-a8cd7e2466a3",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-5c48e36b",
    "status": "acknowledged",
    "title": "Agentless logging — credentials config: AWS OTel missing credentials and Cloudbeat invalid GCP credentials JSON",
    "summary": "Agentless logging pipeline: two active credentials configuration failures confirmed in `logging-gcp-us-central1-logs-agentless-log-default`. AWS OTel Collector is rejecting its auth config (no credentials/assume_role/profile set for `otelcol-aws-ec2-99fe7836`), blocking AWS CloudWatch log collection. Cloudbeat is failing to initialize its GCP input due to invalid credentials JSON, blocking GCP telemetry collection. Both errors confirmed still firing as of 13:30Z. No user-facing services are exposed; impact is limited to internal observability pipeline. Fix both credential configurations to restore full telemetry coverage.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix AWS OTel Collector credentials: edit the collector config for `otelcol-aws-ec2-99fe7836-56d0-478c-87db-987766320e4b` and set at least one of `credentials`, `assume_role`, or `profile` under the `awscredentialsprovider` extension — or remove the `auth` option to fall back to the default SDK credential chain: `kubectl edit configmap otelcol-aws-ec2-99fe7836-56d0-478c-87db-987766320e4b -n <namespace>`.",
      "Fix Cloudbeat GCP credentials: locate the Cloudbeat configuration for the GCP input and replace the `credentials_json` value with a valid GCP service account JSON key — verify the JSON is well-formed and the service account has the required IAM permissions: `kubectl edit secret <cloudbeat-gcp-credentials-secret> -n <namespace>`.",
      "Verify telemetry recovery after credential fixes: confirm AWS CloudWatch and GCP log ingestion resumes by checking `logging-gcp-us-central1-logs-agentless-log-default` for new rows without credential errors within 5 minutes of applying the fix."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "5ca01d2d-4e2f-4246-bcb3-a094f33d6600",
    "timestamp": "2026-07-15T13:23:43.382Z",
    "created_at": "2026-07-15T13:23:43.382Z",
    "discovery_id": "disc-20260715-01",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-failed-state-12d73f6e",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — embedded runtime: seccomp policy panic causes FAILED state transitions",
    "summary": "Agentless Heartbeat/Synthetics components are crashing and entering FAILED state in logging-gcp-us-central1 due to a seccomp policy double-registration panic and fatal stats endpoint Unix socket closure during startup. Affected path is internal (synthetics-tcp → agentless-metrics-endpoint via Unix socket); no user-facing services are directly exposed. Failure is persistent and ongoing — FAILED transitions confirmed as recently as 13:22:30Z with no sign of recovery. Assign to the agentless platform team to patch the seccomp init / stats endpoint lifecycle in the embedded Beats startup path.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Pin or roll back the elastic-agent / beats dependency to the last known-good commit before `00068f79631b` (2026-07-10): `helm upgrade elastic-agent elastic/elastic-agent --set image.tag=<last-good-tag> -n elastic-agent` — this targets the seccomp double-registration introduced in that build.",
      "Force-restart the failing agentless units to clear the FAILED state while the fix is prepared: `kubectl rollout restart deployment/agentless-heartbeat -n elastic-agent` — units will re-attempt startup; monitor for recurrence.",
      "If restart loops persist, temporarily disable the seccomp policy registration in the Heartbeat security init by setting the env var `HEARTBEAT_SECCOMP_DISABLED=true` on the agentless pod spec and redeploying: `kubectl set env deployment/agentless-heartbeat HEARTBEAT_SECCOMP_DISABLED=true -n elastic-agent`."
    ],
    "dependency_edges": [
      {
        "source": "synthetics-tcp",
        "target": "agentless-metrics-endpoint",
        "protocol": "unix",
        "exposure": "internal"
      }
    ],
    "root_cause": "Agentless Heartbeat/Synthetics components are transitioning to FAILED because the embedded Beats seccomp module double-registers a seccomp policy (panic: policy already registered) and the internal stats endpoint Unix socket is closed during startup, causing fatal unit/component spawn failures."
  },
  {
    "event_id": "ae9b35ea-1a9e-4014-809e-9375c02714e1",
    "timestamp": "2026-07-15T12:49:50.907Z",
    "created_at": "2026-07-15T12:49:50.907Z",
    "discovery_id": "disc-90978945-4dad-582e-ae89-7897c5ec068b-20260715T124355Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-d03fa406",
    "status": "acknowledged",
    "title": "Cloudbeat CIS GCP CSPM — startup: invalid credentials JSON",
    "summary": "Cloudbeat CIS GCP CSPM: the integration process is failing to start due to an invalid GCP credentials JSON configuration. The most recent failure was logged at 2026-07-15T12:48:40Z, confirming the issue is ongoing. All affected dependency edges are internal (cloudbeat → GCP APIs); no end-user-facing services are impacted. Action required: replace or correct the GCP credentials JSON configured for the cis_gcp integration so Cloudbeat can initialize and resume posture collection.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Replace the GCP credentials JSON for the cis_gcp integration: in Fleet → Integrations → Cloudbeat CIS GCP CSPM, update the credentials JSON field with a valid service account key and save.",
      "Verify the service account key is not expired and has the required IAM roles (e.g. roles/viewer or CIS-required roles) by running: gcloud iam service-accounts keys list --iam-account=<SA_EMAIL>",
      "After updating credentials, confirm Cloudbeat restarts cleanly by checking the agentless log stream for absence of 'invalid credentials JSON' errors within 2 minutes of the update."
    ],
    "dependency_edges": [
      {
        "source": "cloudbeat",
        "target": "gcp",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "cloudbeat",
        "target": "gcp-compute",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "cloudbeat",
        "target": "gcp-storage",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "cloudbeat",
        "target": "gcp-cloudkms",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "cloudbeat",
        "target": "gcp-iam",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "cloudbeat cis_gcp component is failing to start because the configured GCP credentials JSON is malformed/invalid, causing GCP config initialization to fail at startup."
  },
  {
    "event_id": "fa5cd610-588b-4f00-8267-eccd3739020f",
    "timestamp": "2026-07-15T12:49:50.884Z",
    "created_at": "2026-07-15T12:49:50.884Z",
    "discovery_id": "disc-3f81c6e4-f338-554b-806d-73fbf7439a89-20260715T124355Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-7d8f6535",
    "status": "acknowledged",
    "title": "O365 audit — DLP subscription: permission error AF10001",
    "summary": "O365 audit (DLP): the CEL collector is continuously failing to start the DLP.All subscription with 401 Unauthorized AF10001 — the configured O365 app permission set is missing the required permission. Most recent failure logged at 2026-07-15T12:47:54Z, confirming the issue is ongoing. The affected dependency edge (cel → o365) is internal. Action required: add the missing O365 API permission to the registered app so the DLP.All subscription can be created.",
    "criticality": 35,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In Azure AD / Entra ID, navigate to App Registrations → select the O365 integration app → API Permissions, and add the required Office 365 Management APIs permission for ActivityFeed.Read (DLP.All scope), then grant admin consent.",
      "After granting the permission, restart the agentless O365 integration in Fleet → Integrations → O365 Audit to force a new subscription start attempt.",
      "Confirm recovery by checking the agentless log stream for absence of AF10001 errors and presence of successful subscription start messages within 5 minutes of the permission grant."
    ],
    "dependency_edges": [
      {
        "source": "cel",
        "target": "o365",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "o365 audit CEL component is failing to create/start the DLP.All subscription because the configured O365 app permission set is missing the required permission, resulting in AF10001 401 Unauthorized from the subscription start API."
  },
  {
    "event_id": "f69c3cda-e413-4abb-a773-6ad68ce63811",
    "timestamp": "2026-07-15T12:36:43.453Z",
    "created_at": "2026-07-15T12:36:43.453Z",
    "discovery_id": "01179862-82fa-44f0-9ca2-3908cac449d7",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-f373e67b",
    "status": "acknowledged",
    "title": "Agentless Runtime — Heartbeat/Synthetics startup: seccomp policy already registered panic",
    "summary": "Agentless runtime on logging-gcp-us-central1-logs-agentless-log-default is crashing on every Heartbeat/Synthetics unit startup due to a fatal Go panic: \"a seccomp policy is already registered\". Spawned units immediately fail, and the internal stats endpoint unix socket is closed, preventing any unit from reporting. Blast radius is internal only — the synthetics-tcp → agentless-metrics-endpoint dependency edge carries no exposed user-facing path. Failure has been stationary since at least 2026-07-15T11:30Z with no sign of recovery. Immediate action: identify and remove the duplicate seccomp policy registration in the embedded Heartbeat startup path (beats v7 alpha build) and restore the agentless stats endpoint socket.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the beats v7 alpha build's Heartbeat startup path for duplicate seccomp policy registration: `kubectl exec -n agentless <heartbeat-pod> -- cat /proc/1/status | grep Seccomp` and review the startup init sequence in the deployed image for double `seccomp.LoadFilter()` calls.",
      "Roll back the beats v7 alpha build to the last known-good Heartbeat image: `kubectl set image deployment/agentless-heartbeat heartbeat=<last-stable-image-tag> -n agentless && kubectl rollout status deployment/agentless-heartbeat -n agentless`",
      "If rollback is not immediately available, restart the agentless runtime pod to clear the stuck unix socket state and confirm whether the panic recurs: `kubectl rollout restart deployment/agentless-heartbeat -n agentless`"
    ],
    "dependency_edges": [
      {
        "source": "synthetics-tcp",
        "target": "agentless-metrics-endpoint",
        "protocol": "unix",
        "exposure": "internal"
      }
    ],
    "root_cause": "Agentless Heartbeat/Synthetics receiver units are failing because the startup path calls seccomp policy registration when a policy is already registered, triggering a fatal Go panic (\"a seccomp policy is already registered\") and collapsing the internal stats endpoint unix socket used by spawned units."
  },
  {
    "event_id": "74c818e2-6105-4fe6-9c45-8f47de0f07be",
    "timestamp": "2026-07-15T12:25:08.499Z",
    "created_at": "2026-07-15T12:25:08.499Z",
    "discovery_id": "90978945-4dad-582e-ae89-7897c5ec068b-ad6bc777-5cd0-4789-b26f-17d834fe1e14",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-0e9071be",
    "status": "acknowledged",
    "title": "Cloudbeat agentless — credentials auth: missing credentials configuration",
    "summary": "Cloudbeat agentless GCP collection is failing with credentials validation errors on stream logging-gcp-us-central1-logs-agentless-log-default. The GCP service account JSON is empty or invalid, blocking the SDK credential chain. No exposed downstream dependency edges identified. Signal is stationary — likely a persistent misconfiguration; confirmed still active at 2026-07-15T12:23Z. Correct the GCP credentials configuration in the affected Fleet integration to restore collection.",
    "criticality": 40,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Locate the affected cloudbeat agentless integration and verify the GCP service account JSON credentials are correctly populated: kubectl get secret -n agentless -l app=cloudbeat -o yaml | grep -i credentials",
      "Update the integration's GCP credentials configuration with a valid service account JSON key via Fleet UI or API: POST /api/fleet/package_policies/<id> with corrected google_credentials_json field",
      "Restart the affected cloudbeat agentless pod after credentials are corrected to force re-authentication: kubectl rollout restart deployment/cloudbeat-agentless -n agentless"
    ],
    "dependency_edges": [],
    "root_cause": "Cloudbeat agentless collection is failing because the GCP credentials configuration is missing required fields (credentials, assume_role, or profile), causing the SDK credential chain to error and preventing authentication."
  },
  {
    "event_id": "496ce84d-8c7c-431e-8486-54e9e8adb283",
    "timestamp": "2026-07-15T11:08:22.722Z",
    "created_at": "2026-07-15T11:08:22.722Z",
    "discovery_id": "b9b9c328-58a4-4039-b765-baac51bdbf95",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-5d678777",
    "status": "acknowledged",
    "title": "Agentless runtime — Heartbeat/Synthetics startup: seccomp policy already registered panic",
    "summary": "Agentless unit runtime on logging-gcp-us-central1 is continuously crashing: Heartbeat/Synthetics and CEL units fail at every startup with a Go panic (\"seccomp policy is already registered\"), collapsing the internal stats-socket endpoint. Confirmed still active at 2026-07-15T11:07:17Z — all agentless integrations on this collector are non-functional. Impact is internal (synthetics-tcp → agentless-metrics-endpoint unix socket); no exposed user-facing path confirmed. Failure is stationary/chronic since onset 2026-07-15T00:00:02Z with no sign of recovery. Schedule a fix to remove the duplicate seccomp policy registration in the embedded Heartbeat startup path (beats v7 @ 20260710190233-00068f79631b).",
    "criticality": 45,
    "confidence": 0.73,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Go Panic in Agentless Component",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Patch the duplicate seccomp registration: in the beats v7 heartbeat startup path, guard `MustRegisterPolicy` with a check — run `kubectl exec -n agentless <pod> -- grep -r 'MustRegisterPolicy' /proc/1/exe` to confirm the call site, then deploy a patched build that calls `RegisterPolicy` (non-fatal) or adds an `isRegistered` guard in `heartbeat/security/seccomp.go:290`.",
      "Restart the affected agentless collector pod to clear the current crash loop while the patch is prepared: `kubectl rollout restart deployment/agentless-collector -n agentless --context=gcp-us-central1`.",
      "Pin the beats dependency to a version prior to the double-registration regression: update `go.mod` to reference a known-good commit before `20260710190233-00068f79631b` and redeploy via `helm upgrade agentless-collector <chart> --set image.tag=<prior-tag> -n agentless`."
    ],
    "dependency_edges": [
      {
        "source": "synthetics-tcp",
        "target": "agentless-metrics-endpoint",
        "protocol": "unix",
        "exposure": "internal"
      }
    ],
    "root_cause": "Agentless Heartbeat/Synthetics receiver units are failing because the startup path calls seccomp policy registration when a policy is already registered, triggering a fatal Go panic (\"a seccomp policy is already registered\") and collapsing the internal stats endpoint unix socket used by the spawned unit."
  },
  {
    "event_id": "43d5d2c7-310a-4c62-a036-b2fdb17e5407",
    "timestamp": "2026-07-15T10:49:41.306Z",
    "created_at": "2026-07-15T10:49:41.306Z",
    "discovery_id": "c29d6b13-7041-46ae-8a3f-04bf837fc669",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-5d04f0b3",
    "status": "acknowledged",
    "title": "elasticsearch-controller — reconciliation loop: warnings/errors",
    "summary": "Elasticsearch controller is emitting warnings or errors in its reconciliation loop. The signal is real — matching log rows confirmed at 10:26Z — but the failure mechanism is ungrounded due to a schema mismatch in the stream that prevents message field capture. No exposed dependency edges; impact is likely limited to internal control-plane reconciliation. Manual log inspection is required to determine the specific failure reason and affected resources.",
    "criticality": 25,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect elasticsearch-controller logs directly to identify the reconciliation failure reason: `kubectl logs -l app=elasticsearch-controller -n <controller-namespace> --since=1h | grep -E 'error|warning|Warning|Error'`",
      "Check the status of Elasticsearch custom resources for reconciliation failures: `kubectl get elasticsearch --all-namespaces -o wide | grep -v Running`",
      "If a specific resource is stuck, describe it for events: `kubectl describe elasticsearch <resource-name> -n <namespace>`"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "b2fe6ddf-b15b-44d3-8804-e4ce9598e7b9",
    "timestamp": "2026-07-15T10:49:16.176Z",
    "created_at": "2026-07-15T10:49:16.176Z",
    "discovery_id": "09215df0-471a-4808-99ff-5b3cb251c51e",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-d3ac578c",
    "status": "acknowledged",
    "title": "O365 audit ingestion — DLP subscription start: unauthorized (AF10001)",
    "summary": "O365 audit ingestion is failing to start the DLP.All subscription due to a missing permission (AF10001). The configured O365 app permission set does not include the required permission for POST /activity/feed/subscriptions/start?contentType=DLP.All. DLP audit event collection is blocked for affected tenants in the agentless ingestion pipeline. The error is ongoing — most recent occurrence confirmed at 10:47Z. Update the O365 app registration to include the required DLP subscription permission to restore collection.",
    "criticality": 40,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Update the O365 app registration in Azure AD: navigate to Azure Portal → App Registrations → [affected app] → API Permissions, add the required ActivityFeed.Read (or equivalent DLP subscription) permission, and grant admin consent: `az ad app permission add --id <app-id> --api 00000003-0000-0ff1-ce00-000000000000 --api-permissions <permission-id>=Role && az ad app permission admin-consent --id <app-id>`",
      "Restart the affected agentless integration pod to force a re-attempt of the DLP.All subscription start after the permission is granted: `kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace>`",
      "Verify the fix by tailing the agentless pod logs for a successful subscription start response: `kubectl logs -f deployment/<agentless-deployment-name> -n <project-namespace> | grep -i 'DLP.All'`"
    ],
    "dependency_edges": [],
    "root_cause": "O365 audit ingestion is failing because the configured O365 app permission set is missing the required permission for the DLP.All subscription API, causing all DLP.All subscription start requests to return 401 Unauthorized (AF10001)."
  },
  {
    "event_id": "6c551165-891a-4277-8394-e302c7c59318",
    "timestamp": "2026-07-15T10:42:34.709Z",
    "created_at": "2026-07-15T10:42:34.709Z",
    "discovery_id": "disc-20260715-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-2fc93b7f",
    "status": "acknowledged",
    "title": "Agentless Cloudbeat / OTel Collector — agentless unit: component entered FAILED state",
    "summary": "Agentless Cloudbeat (cis_gcp) is repeatedly entering FAILED state on the GCP us-central1 agentless collector. The cloudbeat unit exits with code 1 and the embedded AWS OTel Collector is misconfigured — awscredentialsprovider has no credentials, assume_role, or profile set. Failure onset was ~2026-07-15T09:00Z and is confirmed still active as of 10:41Z. Impact is limited to internal CIS GCP posture collection and AWS CloudWatch input telemetry for the affected collector instance; no user-facing services are in the blast radius. Fix the AWS credentials configuration for the agentless collector and investigate the cloudbeat unit crash to restore posture data collection.",
    "criticality": 55,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix AWS credentials for the agentless OTel collector: update the agentless integration configuration to supply valid credentials — set at least one of `credentials`, `assume_role`, or `profile` in the AWS CloudWatch input config via `elastic-agent` policy update in Fleet UI or `elastic-agent enroll` with corrected policy.",
      "Inspect the cloudbeat unit crash: run `journalctl -u elastic-agent --since '2026-07-15 09:00:00' | grep cloudbeat` on the affected GCP us-central1 agentless host to retrieve the full exit-code-1 stack trace and identify the root crash cause.",
      "Restart the agentless collector after credentials are corrected: `systemctl restart elastic-agent` on the affected instance, then verify unit state recovers via `elastic-agent status` — confirm cloudbeat/cis_gcp transitions to HEALTHY."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless Cloudbeat unit is failing because its process exits with code 1, and the embedded AWS OTel Collector is misconfigured because awscredentialsprovider has no credentials/assume_role/profile set, causing components to transition to FAILED."
  },
  {
    "event_id": "d6ecfd69-0fb6-4bb1-bd4c-a9f0f921a485",
    "timestamp": "2026-07-15T09:42:29.534Z",
    "created_at": "2026-07-15T09:42:29.534Z",
    "discovery_id": "c51a56ef-7315-55e1-bb17-6747450681e7-ac272b64-896f-48a5-b05e-cbe8b46d6462",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-5e85849d",
    "status": "acknowledged",
    "title": "Connectors — SSH sync jobs: index_not_found_exception for .elastic-connectors-sync-jobs",
    "summary": "Connectors SSH sync jobs are failing because the .elastic-connectors-sync-jobs Elasticsearch index does not exist. Affects all SSH-based connector sync operations; no user-facing services confirmed exposed. Failure confirmed active as of 09:38Z (onset ~08:00Z, ~98 min ongoing). Restore or recreate the missing index to unblock sync jobs.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restore the missing index: run `POST /.elastic-connectors-sync-jobs/_create` or re-run the Kibana connector setup wizard to recreate the system index (`kibana-setup` or `bin/kibana --setup`).",
      "Check recent index deletions or ILM policy changes: `GET /_cat/indices/.elastic-connectors*?v` and review cluster audit logs for any delete-index operations against `.elastic-connectors-sync-jobs`.",
      "If the index was removed by a migration or upgrade, re-run the connector framework bootstrap: `kubectl exec -it <connectors-pod> -n <namespace> -- python -m connectors.protocol.connectors --action setup`."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "3973cc73-1f95-42c1-8cba-e8ec3ebfebb7",
    "timestamp": "2026-07-15T09:39:17.891Z",
    "created_at": "2026-07-15T09:39:17.891Z",
    "discovery_id": "disc-20260715-083325Z-01",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-service-type-not-configured-dcbbc047",
    "status": "acknowledged",
    "title": "Agentless Connectors / Proxy — auth + upstream failures: token invalid and 5xx errors",
    "summary": "Agentless connectors/proxy: connector ingestion is failing due to an invalid API token and concurrent proxy 5xx errors. Affects agentless connector data collection pipelines; no exposed downstream user-facing services identified. Three rules confirmed active since ~08:30Z with no sign of recovery. Schedule token rotation and proxy upstream investigation within the hour.",
    "criticality": 55,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default",
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured",
      "HTTPJSON Retryable HTTP Request Failures",
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate the agentless connector API token: update the secret in the connector deployment config (e.g. `kubectl edit secret agentless-connector-secret -n <namespace>`) and restart the connector pod (`kubectl rollout restart deployment/agentless-connector -n <namespace>`).",
      "Investigate the proxy upstream dependency returning 5xx: check proxy service logs (`kubectl logs -l app=proxy -n <namespace> --tail=100`) and verify the upstream target is reachable (`kubectl exec -it <proxy-pod> -n <namespace> -- curl -v <upstream-url>`).",
      "If token rotation is not immediately possible, temporarily disable the failing connector integration to stop retry storms: `kubectl scale deployment/agentless-connector --replicas=0 -n <namespace>`."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "73c02a74-a258-48fb-b038-273284002bdd",
    "timestamp": "2026-07-15T09:19:25.700Z",
    "created_at": "2026-07-15T09:19:25.700Z",
    "discovery_id": "55184666-8094-4bd0-a3f8-2e437c8b7bc0",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-start-failing-af10001-permission-mismatch",
    "status": "acknowledged",
    "title": "O365 audit ingestion — DLP subscription: AF10001 permission mismatch",
    "summary": "O365 audit ingestion: the agentless collector is failing to start the DLP.All subscription with 401 Unauthorized AF10001 errors, indicating the configured app/service principal lacks the required permission set. The Microsoft 365 DLP audit feed is blocked for all affected integrations. Errors confirmed still active as of 09:17Z (component state HEALTHY→DEGRADED). Assign to the team managing O365 integration credentials and grant the required DLP.All subscription-start permissions.",
    "criticality": 40,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Grant the DLP.All subscription-start permission to the configured O365 app/service principal: in Azure AD, navigate to App registrations → [integration app] → API permissions → Add permission → Office 365 Management APIs → Application permissions → ActivityFeed.Read (DLP.All scope), then grant admin consent.",
      "Rotate or re-provision the O365 integration credentials in Elastic Fleet: navigate to Fleet → Integrations → Microsoft 365 → [affected policy] → Edit integration → update the Client ID/Secret with a principal that has the correct permissions.",
      "Verify the fix by checking agentless collector logs: kubectl logs -n <project-namespace> <agentless-pod> | grep -i 'AF10001\\|DLP.All\\|subscription' — confirm no new 401 errors after credential update."
    ],
    "dependency_edges": [],
    "root_cause": "O365 audit collection is failing because the configured app/service principal lacks the required permission set for the DLP.All subscription-start API, causing 401 Unauthorized AF10001 errors."
  },
  {
    "event_id": "8c9bb2ef-0649-497f-984a-4c72eb379d6f",
    "timestamp": "2026-07-15T09:13:18.649Z",
    "created_at": "2026-07-15T09:13:18.649Z",
    "discovery_id": "aws-otel-credentials-missing-2026-07-15T09:10Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-components-failing-aws-otel-collector-missing-credentials",
    "status": "acknowledged",
    "title": "Agentless — AWS OTel collector: missing AWS credentials causes FAILED state transitions",
    "summary": "Agentless AWS OTel collector components are repeatedly cycling to FAILED state due to a missing AWS credentials configuration in the awscredentialsprovider extension. All agentless integrations depending on the AWS CloudWatch input OTel collector path are unable to ingest AWS telemetry. Failures have been continuous since 2026-07-15T00:00Z (9+ hours) with no recovery observed; the most recent FAILED transition was at 09:11:09Z. Fix the AWS credentials configuration or switch to the default SDK credential chain to restore ingestion.",
    "criticality": 35,
    "confidence": 0.63,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Update the agentless AWS OTel collector configuration to supply valid credentials: set one of `credentials`, `assume_role`, or `profile` in the awscredentialsprovider extension block, then restart the affected agentless component via `elastic-agent restart` or by redeploying the agentless policy in Fleet UI.",
      "If no explicit credentials are required, remove the awscredentialsprovider extension configuration entirely to fall back to the default AWS SDK credential chain (IAM instance role / environment variables), then trigger a policy re-push from Fleet.",
      "Verify the IAM role or credentials attached to the agentless host have the required CloudWatch permissions (`cloudwatch:GetMetricData`, `cloudwatch:ListMetrics`, `logs:DescribeLogGroups`, `logs:GetLogEvents`) using `aws iam simulate-principal-policy --action-names cloudwatch:GetMetricData --resource-arns '*'`."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed AWS OTel collector is failing because the awscredentialsprovider extension is configured without any of credentials, assume_role, or profile, causing the collector to exit during startup and drive repeated component FAILED state transitions."
  },
  {
    "event_id": "83e0abaa-1d21-4420-9882-fe8c47a92fac",
    "timestamp": "2026-07-15T09:00:17.060Z",
    "created_at": "2026-07-15T09:00:17.060Z",
    "discovery_id": "69d39bcb-8e1b-4cd2-8503-dde0b071b042",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-e7998d7c",
    "status": "acknowledged",
    "title": "Cloudbeat — credentials handling: invalid credentials JSON log line detected",
    "summary": "Cloudbeat (GCP agentless): the process is actively crashing on startup with \"failed to initialize gcp config: invalid credentials JSON\", confirmed at review time (08:58Z). GCP Cloud Security Posture Management (CSPM) scanning is blocked for the affected agentless integration(s). This is an internal backend failure — no user-facing journeys are exposed. The failure appears persistent (stationary signal); check whether GCP service account credentials were recently rotated or misconfigured. Verify and re-apply valid GCP credentials for the affected integration.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the GCP credentials secret/configmap for the affected cloudbeat integration: kubectl get secret -n <project-namespace> -o yaml | grep -i credentials, then verify the JSON is valid and the service account key has not expired or been rotated.",
      "Re-apply or rotate the GCP service account credentials for the affected agentless integration via the Fleet UI: navigate to Fleet > Agent Policies > [affected policy] > Cloud Security Posture integration > edit credentials, then save to trigger a re-deployment.",
      "If credentials were recently rotated, update the Kubernetes secret directly: kubectl create secret generic <credentials-secret-name> -n <project-namespace> --from-file=credentials.json=<new-key-file> --dry-run=client -o yaml | kubectl apply -f -"
    ],
    "dependency_edges": [],
    "root_cause": "Cloudbeat is crashing on startup because the GCP credentials JSON configured for the affected agentless integration is invalid or malformed, preventing the GCP config from initializing."
  },
  {
    "event_id": "e18a7b3c-5a53-4510-9e09-1c9903a9ecd5",
    "timestamp": "2026-07-15T08:53:08.163Z",
    "created_at": "2026-07-15T08:53:08.163Z",
    "discovery_id": "f8013e30-ada0-42a5-938a-9213f4ec675a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-python-client-api-retry-error-49bf9f5e",
    "status": "acknowledged",
    "title": "Elastic Connectors — connectors-py: refresh API retries on 404",
    "summary": "Elastic Connectors (connectors-py) in the logging-gcp-us-central1 agentless environment is repeatedly failing the 'refresh' API call with HTTP 404, triggering retry loops. Connector sync jobs are degraded; content sources backed by affected connectors are not receiving fresh data. Error confirmed still active at 08:29Z (at review time). Distribution-change signal onset at 06:30Z. Identify the affected connector instance(s) in Kibana and verify or correct the target resource configuration.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Python Client API Retry Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected connector instance(s) by checking Kibana → Search → Connectors and look for connectors in error state; note the connector ID from the logs (e.g. labels.connector_id).",
      "Verify the connector's target Elasticsearch index exists and the base URL is correctly configured: in Kibana → Search → Connectors → [affected connector] → Configuration, check the endpoint URL and credentials.",
      "If the target index was deleted, recreate it or reconfigure the connector to point to the correct index; then trigger a manual sync: POST /_connector/[connector_id]/_sync_job"
    ],
    "dependency_edges": [],
    "root_cause": "Connectors (connectors-py) is retrying because the connector API 'refresh' call returns HTTP 404, indicating a missing/invalid endpoint or misconfigured connector target resource."
  },
  {
    "event_id": "174bd9b4-df14-41cb-a949-5ebc26f846fa",
    "timestamp": "2026-07-15T08:31:11.995Z",
    "created_at": "2026-07-15T08:31:11.995Z",
    "discovery_id": "8b54868e-70b5-478b-ba9a-4ab2883910c4",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-state-registry-cleanup-failure-19f6bd59",
    "status": "acknowledged",
    "title": "Agentless CEL — state registry: cleanup remove 404 Not Found",
    "summary": "CEL/HTTPJSON agentless ingestion in logging-gcp-us-central1 is repeatedly failing to clean up state registry entries, with the store/remove operation returning 404 Not Found for a ti_abusech.url cursor document in the agentless-state index. The affected integration has a stale or orphaned state document that cannot be removed. Error confirmed still active at 08:29Z (at review time). Step-change signal onset at 06:30Z indicates a sustained new error condition. Delete the orphaned state document or the state index to resolve the cleanup loop.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL State Registry Cleanup Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check for and delete the orphaned state document in the agentless-state-cel-ti_abusech.url index: DELETE agentless-state-cel-ti_abusech.url-a5cc9202-4439-43bd-8e71-a4c2a9b34c50/_doc/cel::cel-ti_abusech.url-a5cc9202-4439-43bd-8e71-a4c2a9b34c50::https://urlhaus-api.abuse.ch/v1/urls/recent/",
      "Verify the ti_abusech.url integration policy is still active and correctly configured in Kibana Fleet → Integrations; if the integration was deleted or reconfigured, ensure the state index is cleaned up: DELETE agentless-state-cel-ti_abusech.url-a5cc9202-4439-43bd-8e71-a4c2a9b34c50",
      "If the error persists after cleanup, restart the affected agentless pod: kubectl rollout restart deployment/agentless-[policy-id] -n project-[stack-id]"
    ],
    "dependency_edges": [],
    "root_cause": "CEL state registry cleanup is failing because the state store remove operation returns 404 Not Found for an agentless-state-cel-ti_abusech.url registry cursor document (stale/missing registry entry), causing cleanup to error."
  },
  {
    "event_id": "a3efd21e-2fbe-4b94-95bb-14822e005880",
    "timestamp": "2026-07-15T08:30:12.475Z",
    "created_at": "2026-07-15T08:30:12.475Z",
    "discovery_id": "0eb060d5-f3cf-4c34-916b-db51f109810b",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-bb69ed57",
    "status": "acknowledged",
    "title": "O365 agentless integration — DLP subscription: AF10001 missing permission",
    "summary": "O365 audit ingestion is failing to start the DLP.All subscription with 401 Unauthorized (AF10001 — permission set missing expected permission). The affected agentless integration in logging-gcp-us-central1 cannot ingest DLP audit events until the Azure/O365 app registration is granted the required subscription permission. Error confirmed still active at 08:28Z (within 1 minute of review). Stationary signal indicates this is a chronic misconfiguration, not a transient fault. Re-grant the DLP subscription permission on the Azure app registration to restore ingestion.",
    "criticality": 30,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Re-grant the DLP subscription permission on the Azure app registration used by the O365 agentless integration: in Azure Portal → App registrations → [integration app] → API permissions, add 'ActivityFeed.Read' (or the required DLP permission) and grant admin consent.",
      "Verify the integration's configured credentials in Kibana Fleet → Integrations → Microsoft 365 → [affected policy] and confirm the app ID and tenant ID match the Azure app registration that has the correct permissions.",
      "If the permission was recently revoked, check Azure AD audit logs for permission changes: az monitor activity-log list --resource-type 'Microsoft.Authorization/roleAssignments' --start-time 2026-07-14T00:00:00Z"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "85c9ae08-bd1c-4b8e-ac70-00d565c97897",
    "timestamp": "2026-07-15T08:22:26.156Z",
    "created_at": "2026-07-15T08:22:26.156Z",
    "discovery_id": "ee04da45-24d7-560c-896b-2075a3d23ddb-91c84dc7-fab7-4a77-9748-7203df9df404",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-retryable-http-request-failures-4a0eaf29",
    "status": "acknowledged",
    "title": "HTTPJSON agentless integrations — outbound HTTP: retryable request failures",
    "summary": "HTTPJSON agentless integrations: outbound HTTP requests are failing after all retries are exhausted (go-retryablehttp 'request failed'). Affects customers whose HTTPJSON integrations depend on the failing external endpoint(s). Errors confirmed active as recently as 08:20Z, ~80 minutes after onset with no recovery. Identify the specific failing endpoint from agent logs and restore reachability or rotate credentials.",
    "criticality": 40,
    "confidence": 0.63,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Retryable HTTP Request Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected HTTPJSON integration endpoint by reviewing recent logs: check Kibana → Fleet → Agents → [affected agent] → Logs for the specific URL returning failures, then verify endpoint reachability with `curl -v <endpoint-url>`",
      "If the endpoint requires authentication, rotate and reissue credentials in Kibana → Fleet → Integrations → [HTTPJSON integration] → Edit and update the API key or token",
      "If the external endpoint is confirmed unreachable, disable the failing integration temporarily to stop error noise: `elastic-agent integration disable --integration <httpjson-integration-id>` and open a ticket with the endpoint owner"
    ],
    "dependency_edges": [],
    "root_cause": "HTTPJSON agentless integration is failing because outbound HTTP requests are failing after retries are exhausted in the go-retryablehttp client."
  },
  {
    "event_id": "7634fa4d-9cf1-4196-aacb-0891f9f48766",
    "timestamp": "2026-07-15T08:21:49.777Z",
    "created_at": "2026-07-15T08:21:49.777Z",
    "discovery_id": "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6-91c84dc7-fab7-4a77-9748-7203df9df404",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-service-type-not-configured-f0d6274c",
    "status": "acknowledged",
    "title": "Elastic Connectors — connectors-py: service type not configured",
    "summary": "Elastic Connectors (connectors-py): connector runtime errors due to incomplete configuration — missing service_type and required credentials (e.g. Google Drive service account JSON). Affects customers with the misconfigured connector instance; sync jobs cannot run. Errors confirmed active as recently as 08:20Z with no recovery. Assign to the affected customer to complete connector configuration in Kibana.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Configure a valid service_type for the connector in Kibana: navigate to Search → Content → Connectors → [affected connector] → Edit configuration and set the correct service type",
      "Complete all required connector credentials: for Google Drive connectors, provide the service account JSON via Kibana → Search → Content → Connectors → [affected connector] → Configuration → 'Google Drive service account JSON'",
      "If the connector was provisioned incorrectly, delete and re-create it with the correct configuration: `POST kbn:/api/connector/_delete/<connector_id>` then re-provision via Fleet or Kibana UI"
    ],
    "dependency_edges": [],
    "root_cause": "Elastic Connectors (connectors-py) is failing because the connector was provisioned without complete configuration — missing service_type and required credentials — preventing startup and sync job execution."
  },
  {
    "event_id": "c0da7ef3-2206-4f17-88f5-d259a0d8e7eb",
    "timestamp": "2026-07-15T08:21:16.599Z",
    "created_at": "2026-07-15T08:21:16.599Z",
    "discovery_id": "34b2bc19-42a4-5964-bc46-55191291dc2c-91c84dc7-fab7-4a77-9748-7203df9df404",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-b9a1e4c6",
    "status": "acknowledged",
    "title": "Okta agentless integration — system logs: developer org deactivated (E0000260)",
    "summary": "Okta agentless integration: system log collection is failing with error E0000260 (developer org deactivated), causing OAuth token fetch to return 403. Affects customers whose agentless integration is configured against the deactivated Okta tenant. Errors confirmed active as recently as 08:20Z with no sign of recovery. Assign to the affected customer's account team to reactivate the Okta developer org or reconfigure the integration to an active tenant.",
    "criticality": 40,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Reactivate the Okta developer org via the Okta Admin Console (Admin → Settings → Account → Reactivate), or reconfigure the agentless integration to point to an active Okta tenant using: `elastic-agent integration update --integration okta --setting okta_url=<active-tenant-url>`",
      "Rotate and reissue the OAuth client credentials for the Okta integration after reactivation: navigate to Kibana → Fleet → Integrations → Okta → Edit and re-enter valid OAuth client ID and secret",
      "If the developer org cannot be reactivated, remove the broken integration instance to stop error noise: `elastic-agent integration remove --integration okta --id <integration-id>`"
    ],
    "dependency_edges": [],
    "root_cause": "Okta agentless integration is failing because the configured Okta developer org is deactivated (E0000260) and OAuth token fetch returns 403."
  },
  {
    "event_id": "a1058208-f535-4312-ae76-4683e86f059f",
    "timestamp": "2026-07-15T08:05:10.982Z",
    "created_at": "2026-07-15T08:05:10.982Z",
    "discovery_id": "90978945-4dad-582e-ae89-7897c5ec068b-20260715T075433Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-200af9c4",
    "status": "acknowledged",
    "title": "Cloudbeat — credentials provider: invalid configuration error",
    "summary": "Cloudbeat agentless ingestion is failing due to invalid GCP credentials JSON configuration, causing the launcher to exit on startup. Only the Cloudbeat agentless ingestion path is affected — no user-facing services impacted. Error has been present since at least 2026-07-15T06:30Z (stationary, pre-existing) and confirmed still active at 08:03Z. Correct the GCP credentials JSON in the Cloudbeat configuration secret and restart the deployment.",
    "criticality": 20,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Validate the Cloudbeat GCP credentials configuration: inspect the credentials secret/configmap used by the agentless Cloudbeat deployment with kubectl get secret <cloudbeat-credentials-secret> -n <namespace> -o yaml and verify the JSON structure is valid and contains required fields (credentials, assume_role, or profile)",
      "Correct the invalid credentials JSON by updating the secret: kubectl create secret generic <cloudbeat-credentials-secret> -n <namespace> --from-file=credentials.json=<valid-credentials-file> --dry-run=client -o yaml | kubectl apply -f -",
      "After correcting the credentials, restart the affected Cloudbeat agentless deployment: kubectl rollout restart deployment/<cloudbeat-deployment> -n <namespace>"
    ],
    "dependency_edges": [],
    "root_cause": "Cloudbeat ingestion is failing because the GCP credentials provider configuration contains invalid JSON, causing the launcher to exit on startup before any data collection can occur."
  },
  {
    "event_id": "63ec5224-109c-44f1-b6de-41e8a95a5df4",
    "timestamp": "2026-07-15T08:04:38.351Z",
    "created_at": "2026-07-15T08:04:38.351Z",
    "discovery_id": "9ccd26b0-bce6-5b84-b60b-9cf347400f2f-20260715T075433Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-e6d4a632",
    "status": "acknowledged",
    "title": "UIAM — runtime: entropy source stuck",
    "summary": "UIAM service is reporting an entropy source stuck condition, which can block cryptographic and auth operations. No exposed downstream services confirmed in this discovery. Error first observed at 2026-07-15T07:08Z and confirmed still active at 07:58Z. Investigate host/container entropy availability and restart the UIAM pod if entropy pool is depleted.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM pod entropy availability: kubectl exec -n <uiam-namespace> <uiam-pod> -- cat /proc/sys/kernel/random/entropy_avail — if below 256, the host kernel entropy pool is depleted",
      "If entropy is depleted, restart the UIAM pod to trigger rescheduling to a node with sufficient entropy: kubectl rollout restart deployment/uiam -n <uiam-namespace>",
      "If the issue persists across restarts, install or verify haveged/rng-tools is running on the host node: systemctl status haveged on the affected node, or enable virtio-rng for the GKE node pool"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f26036b4-39cc-44e3-8de1-8cbedc867f00",
    "timestamp": "2026-07-15T08:04:08.096Z",
    "created_at": "2026-07-15T08:04:08.096Z",
    "discovery_id": "76cc20f4-6f50-5f43-a870-c2df0e768ac4-20260715T075433Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-ed68ce64",
    "status": "acknowledged",
    "title": "Elasticsearch controller — control loop: warnings/errors",
    "summary": "Elasticsearch controller is emitting warning/error logs in its control loop. The failure is internal to the control plane with no exposed downstream services identified. Errors first observed at 2026-07-15T06:55Z and confirmed still active at 07:55Z. Inspect controller logs directly to identify the specific error mechanism — the current query projection does not surface message text.",
    "criticality": 20,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect elasticsearch-controller pod logs directly: kubectl logs -n <controller-namespace> -l app=elasticsearch-controller --since=30m | grep -E 'WARN|ERROR' to retrieve the full error message text",
      "If the controller is in a crash loop, restart it: kubectl rollout restart deployment/elasticsearch-controller -n <controller-namespace>",
      "Check controller reconciliation queue depth and recent events: kubectl describe deployment elasticsearch-controller -n <controller-namespace> && kubectl get events -n <controller-namespace> --sort-by=.lastTimestamp | tail -20"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "42531b24-a764-45ec-bad1-4559ff65f221",
    "timestamp": "2026-07-15T07:15:19.898Z",
    "created_at": "2026-07-15T07:15:19.898Z",
    "discovery_id": "a543d735-55dd-585d-8640-f65baac5a212-2026-07-15T07:10:41Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-component-meta-file-corruption-9ba42840",
    "status": "acknowledged",
    "title": "Agentless OTel collector — otel_manager: recovery restart loop",
    "summary": "Agentless OTel collector in logging-gcp-us-central1 is stuck in a persistent recovery restart loop: the otel_manager process has accumulated 1,602 retries as of 07:14Z, up from 41 at onset (~05:30Z), confirming the failure is active and worsening. A fatal init error — invalid GCP credentials JSON — is present in the same window and is the likely root cause preventing the collector from staying healthy. All telemetry collection for the agentless GCP environment is disrupted. Immediate action: validate and rotate the GCP credentials referenced by the agentless configuration in logging-gcp-us-central1.",
    "criticality": 55,
    "confidence": 0.67,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Component Meta File Corruption",
      "OTel Collector Persistent Recovery Restart Loop",
      "OTel Collector Accumulated High Recovery Retry Count"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect and rotate the GCP credentials JSON referenced by the agentless configuration: locate the credentials secret in the agentless deployment for logging-gcp-us-central1 (e.g. `kubectl get secret -n elastic-agent -l environment=logging-gcp-us-central1`) and replace the invalid credentials with a valid GCP service account key.",
      "Restart the agentless elastic-agent pod after credentials are corrected: `kubectl rollout restart deployment/elastic-agent-agentless -n elastic-agent` (or the equivalent deployment name for logging-gcp-us-central1).",
      "Verify otel_manager recovery loop clears post-restart by tailing logs: `kubectl logs -n elastic-agent -l environment=logging-gcp-us-central1 --since=5m | grep otel_manager` — confirm absence of 'collector recovery restarting' messages."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless OTel collector is failing to start because the GCP credentials JSON referenced in the agentless configuration is invalid, causing otel_manager to enter a persistent recovery restart loop (1,602 retries over ~1h44m) with no recovery."
  },
  {
    "event_id": "c48d797a-d665-434a-a61c-ebac143987b3",
    "timestamp": "2026-07-15T06:37:12.824Z",
    "created_at": "2026-07-15T06:37:12.824Z",
    "discovery_id": "agentless-seccomp-panic-2026-07-15T06:35Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-433b1f19",
    "status": "acknowledged",
    "title": "Agentless unit — Heartbeat/Synthetics receiver: startup panic (seccomp policy already registered)",
    "summary": "Agentless platform: multiple components (synthetics/tcp, CEL) are crashing at startup with a Go panic — \"seccomp policy already registered\" — during Heartbeat security module initialization. All affected agentless integrations on this unit are unable to start and remain in a FAILED→STARTING crash loop. Onset confirmed at 2026-07-15T00:00:02Z; still active at 06:35:52Z (6+ hours, no recovery). The stats endpoint Unix socket is also closing on each crash, compounding the failure. Immediate action: pin or roll back the Beats v7 alpha2 build (currently v7.0.0-alpha2.0.20260710190233) to a version without the duplicate seccomp registration, or patch `heartbeat/security/seccomp.go` to guard against double-registration.",
    "criticality": 45,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the Beats v7 alpha2 build on the affected agentless unit: update the integration package to use a Beats build prior to v7.0.0-alpha2.0.20260710190233 — e.g., `kubectl set image deployment/<agentless-deployment> heartbeat=docker.elastic.co/beats/heartbeat:<last-stable-tag> -n <namespace>`",
      "If rollback is not immediately available, patch the agentless_hello_world integration policy to disable the synthetics/tcp and CEL components temporarily: `elastic-agent policy update --disable-component synthetics/tcp-es-default-output-internal` to stop the crash loop and reduce noise",
      "File a bug against `github.com/elastic/beats` targeting `heartbeat/security/seccomp.go:290` — add a guard (`if policy already registered { return }`) in `mustConfigureSeccompPolicy()` before calling `MustRegisterPolicy`, then cut a new alpha2 snapshot build and redeploy"
    ],
    "dependency_edges": [
      {
        "source": "synthetics-tcp",
        "target": "agentless-metrics-endpoint",
        "protocol": "unix",
        "exposure": "internal"
      }
    ],
    "root_cause": "The agentless Heartbeat/Synthetics and CEL receivers are panicking at startup because `heartbeat/security.InitializeModule()` calls `seccomp.MustRegisterPolicy()` unconditionally, and the policy is already registered by the time the OTel receiver factory invokes it — causing a fatal double-registration panic in Beats v7.0.0-alpha2 (build 20260710190233) that terminates every spawned component."
  },
  {
    "event_id": "fc1f99f5-24d9-43e2-88ff-c99181ef4151",
    "timestamp": "2026-07-15T06:15:00.152Z",
    "created_at": "2026-07-15T06:15:00.152Z",
    "discovery_id": "12e34444-ba47-4bf5-bb3f-aa81d1f38a55",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-write-errors-e0563d6c",
    "status": "acknowledged",
    "title": "Agentless Beats — output pipeline: write errors metric spike",
    "summary": "Agentless Beats output pipeline is reporting non-zero write errors since ~2026-07-15T05:30Z, still elevated at 06:01Z (~30min). Metric counter confirms write errors are occurring but error signature text (specific backend error) was not captured in available log rows. Credible spike detection (p_value=0.0034). Internal agentless pipeline only — no exposed user-facing dependency edges. Immediate action: retrieve libbeat output error details from pod logs to identify the specific output backend failure (connection refused, 4xx/5xx, queue overflow).",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Write Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check libbeat output error details: kubectl logs -n <agentless-namespace> -l component.type=cel,component.type=log --since=2h | grep -E 'Cannot index|connection refused|write error|output error' to identify the specific output backend failure.",
      "Verify Elasticsearch output connectivity from agentless pods: kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v https://<elasticsearch-endpoint>/_cluster/health to confirm the output target is reachable.",
      "If write errors are persistent, check the libbeat output queue fill level and consider restarting the affected agentless pod: kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "52dd22b8-9192-41b5-8c2b-147a3b368832",
    "timestamp": "2026-07-15T06:14:24.299Z",
    "created_at": "2026-07-15T06:14:24.299Z",
    "discovery_id": "b43a2eef-a766-4622-9714-ff3e7d286e12",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-f30c7e8f",
    "status": "acknowledged",
    "title": "UIAM — auth API: service-level errors",
    "summary": "UIAM auth service is emitting ERROR/WARN level logs continuously since ~2026-07-15T05:05Z, still active at 05:52Z (~47min). Error message content could not be retrieved (field mapping issue in stream projection). Detection signal is statistically indeterminable (p_value=0, change_point_type=indeterminable) — no credible change-point analysis. No dependency edges confirmed. Immediate action: retrieve UIAM error message text via pod logs to classify the failure mode before escalating.",
    "criticality": 35,
    "confidence": 0.25,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Retrieve UIAM error message text to classify the failure: kubectl logs -n <uiam-namespace> -l service=uiam --since=2h | grep -E 'ERROR|WARN' | tail -50 to identify the specific error type (dependency failure vs internal error).",
      "Check UIAM service health and upstream dependencies: kubectl get pods -n <uiam-namespace> -l app=uiam and verify readiness/liveness probe status.",
      "If UIAM depends on an external identity provider or database, verify connectivity: kubectl exec -n <uiam-namespace> <uiam-pod> -- curl -v <upstream-auth-endpoint> to confirm reachability."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "b3c66f61-3b67-429c-a0d2-3739957891ab",
    "timestamp": "2026-07-15T06:13:40.778Z",
    "created_at": "2026-07-15T06:13:40.778Z",
    "discovery_id": "01b25b55-25e5-4ce2-84a4-5aad7b1edd5f",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-8ab26919",
    "status": "acknowledged",
    "title": "Agentless ingestion — CEL input: retryable HTTP request failures",
    "summary": "CEL input retryable HTTP requests are failing continuously on the agentless ingestion pipeline. The upstream HTTP endpoint is returning errors, causing repeated retries and degraded log ingestion. Failure confirmed active at 2026-07-15T06:12Z — ongoing for ~1h40m since onset. This is an internal agentless pipeline component with no exposed user-facing dependency edges. Immediate action: verify the upstream HTTP endpoint health and connectivity for the CEL input source (check `input_source` URL reachability and authentication).",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the CEL input upstream endpoint reachability: kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v <input_source_url> to confirm HTTP connectivity and auth status.",
      "Review agentless pod logs for the CEL component: kubectl logs -n <agentless-namespace> -l component.type=cel --since=2h | grep 'request failed' to identify the specific endpoint and error code.",
      "If the upstream endpoint is a third-party API (e.g. 1Password, Microsoft Graph), verify API credentials and token expiry in the agentless integration configuration via Fleet UI or kubectl get secret -n <agentless-namespace>."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "5f57cf04-7603-479f-b8fb-5a865a0c49fc",
    "timestamp": "2026-07-15T06:06:01.470Z",
    "created_at": "2026-07-15T06:06:01.470Z",
    "discovery_id": "disc-httpjson-ee04da45-20260715T055740Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__httpjson-retryable-http-request-failures-25e0dc6a",
    "status": "acknowledged",
    "title": "HTTPJSON — outbound API polling: retryable HTTP request failures",
    "summary": "HTTPJSON agentless integration polling is failing with retryable HTTP request errors across 6 exposed upstream integrations (AWS GuardDuty, GitHub, SentinelOne, 1Password, AWS SecurityHub, Cisco Duo). Security and observability telemetry collection is degraded. Failure onset at 2026-07-15T04:30Z; confirmed still active at 06:04Z (~90 min duration, not recovering). Identify the failing upstream endpoint or expired credential in Fleet agentless integration logs and restore connectivity.",
    "criticality": 60,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Retryable HTTP Request Failures"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify which upstream endpoint is failing: kubectl logs -n <agentless-namespace> -l component.type=httpjson --tail=500 | grep -E 'request failed|retryablehttp' | head -50",
      "Check for credential rotation or API key expiry for affected integrations (AWS GuardDuty, GitHub, SentinelOne, 1Password, AWS SecurityHub, Cisco Duo) in Fleet > Agent Policies > Agentless integrations",
      "If a single integration is responsible, disable and re-enable it in Fleet to force credential re-validation: navigate to Fleet > Integrations, locate the failing httpjson integration, and toggle it off then on"
    ],
    "dependency_edges": [
      {
        "source": "httpjson",
        "target": "aws-guardduty",
        "protocol": "https",
        "exposure": "exposed"
      },
      {
        "source": "httpjson",
        "target": "github",
        "protocol": "https",
        "exposure": "exposed"
      },
      {
        "source": "httpjson",
        "target": "sentinelone",
        "protocol": "https",
        "exposure": "exposed"
      },
      {
        "source": "httpjson",
        "target": "1password",
        "protocol": "https",
        "exposure": "exposed"
      },
      {
        "source": "httpjson",
        "target": "aws-securityhub",
        "protocol": "https",
        "exposure": "exposed"
      },
      {
        "source": "httpjson",
        "target": "cisco-duo",
        "protocol": "https",
        "exposure": "exposed"
      }
    ]
  },
  {
    "event_id": "167362df-4cb3-43e0-9d11-4516a380957d",
    "timestamp": "2026-07-15T05:57:12.520Z",
    "created_at": "2026-07-15T05:57:12.520Z",
    "discovery_id": "24d325e5-9bd7-4958-9c2d-57d1c032aab6",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-collector-control-plane-components-unit-comm-6b712597",
    "status": "acknowledged",
    "title": "Agentless — AWS OTel collector: awscredentialsprovider missing credentials causes FAILED state transitions",
    "summary": "Agentless-managed OTel collector components are actively transitioning to FAILED state due to a missing AWS credentials configuration. The awscredentialsprovider extension is configured without any of credentials, assume_role, or profile, causing the collector to crash on startup and cycle through STOPPING→FAILED and HEALTHY→FAILED transitions. Affected scope is internal telemetry ingestion for agentless-managed integrations (cloudbeat/cis_gcp); no end-user request paths are exposed. Failures are ongoing as of 05:56:16Z with the collector attempting recovery loops. Immediate action: correct the AWS credentials configuration (credentials/assume_role/profile) for the affected agentless AWS OTel collector components, or remove the auth option to use the default SDK credential chain.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the awscredentialsprovider configuration for the affected agentless OTel collector: update the collector config to supply at least one of `credentials`, `assume_role`, or `profile` under the `extensions::awscredentialsprovider` block, or remove the `auth` option entirely to fall back to the default AWS SDK credential chain. Locate the config via: `kubectl get configmap -n agentless -l app=otelcol-aws-elb` and apply the corrected version with `kubectl apply -f <corrected-configmap>.yaml`.",
      "Restart the affected agentless OTel collector pod to pick up the corrected credentials config: `kubectl rollout restart deployment/otelcol-aws-elb -n agentless` (or the equivalent deployment name for the affected collector).",
      "Verify recovery by checking that no new FAILED state transitions appear: monitor `logging-gcp-us-central1-logs-agentless-log-default` for `unit.state == \"FAILED\"` or `component.state == \"FAILED\"` entries after the config fix is applied."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed OTel collector is failing because awscredentialsprovider extensions are configured without any of credentials, assume_role, or profile, causing the collector to exit during startup and transition components into FAILED state."
  },
  {
    "event_id": "c34baf25-3d81-4fde-90a1-5a7c3672a6ee",
    "timestamp": "2026-07-15T05:34:23.225Z",
    "created_at": "2026-07-15T05:34:23.225Z",
    "discovery_id": "043ea4c7-ae96-45e3-830e-0a9a93ce870b",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-b6254197",
    "status": "promoted",
    "title": "Ingress proxy — HTTP: 5xx responses",
    "summary": "Ingress Proxy: returning HTTP 5xx responses to clients, confirmed active at 05:29Z. All users routed through the proxy to Elasticsearch search (es-es-search) and index (es-es-index) backends are affected — both paths are exposed. Onset ~03:00Z; failure persisting for over 2.5 hours with no sign of recovery. Page on-call immediately and check Elasticsearch search/index tier pod health for OOMKilled or CrashLoopBackOff pods.",
    "criticality": 82,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Elasticsearch search and index tier pod health: `kubectl get pods -n elasticsearch -l app=es-es-search,app=es-es-index` and `kubectl describe pod <failing-pod>` to identify OOMKilled, CrashLoopBackOff, or evicted pods.",
      "Review ingress proxy upstream error logs for the specific 5xx status codes and upstream targets: `kubectl logs -n ingress-proxy -l app.kubernetes.io/name=proxy --since=30m | grep ' 5[0-9][0-9] '` to determine whether failures are concentrated on search or index backends.",
      "If a specific ES tier pod is unhealthy, cordon and drain it: `kubectl cordon <node>` then `kubectl delete pod <pod> -n elasticsearch` to force rescheduling onto a healthy node."
    ],
    "dependency_edges": [
      {
        "source": "proxy",
        "target": "es-es-search",
        "protocol": "http",
        "exposure": "exposed"
      },
      {
        "source": "proxy",
        "target": "es-es-index",
        "protocol": "http",
        "exposure": "exposed"
      }
    ]
  },
  {
    "event_id": "e69970ce-5608-441f-9146-2bc507e61b50",
    "timestamp": "2026-07-15T05:25:05.846Z",
    "created_at": "2026-07-15T05:25:05.846Z",
    "discovery_id": "c03c6ef4-8d70-40d2-9536-412ca1a1cec8",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-18326b11",
    "status": "acknowledged",
    "title": "HTTPJSON Okta integration — auth: OAuth token fetch 403 (E0000260)",
    "summary": "Agentless Okta integration: OAuth token fetch is failing with 403 Forbidden due to a deactivated Okta developer org (E0000260), blocking all Okta system log collection via httpjson. The httpjson → Okta API dependency is internal-only; no user-facing services are directly exposed. Errors confirmed active as recently as 05:23Z across two independent detection rules with no sign of recovery. Operator action required: reactivate the Okta developer org or reconfigure the integration to point at an active Okta tenant with valid credentials.",
    "criticality": 45,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden",
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Reactivate the Okta developer organization or switch to an active Okta tenant: log in to the Okta Admin Console and check the org status under Settings → Account; if deactivated, contact Okta support to reactivate.",
      "Reconfigure the agentless Okta integration with valid credentials for an active Okta org: in Kibana navigate to Integrations → Okta → affected policy → Edit → update the OAuth client ID, client secret, and Okta domain, then save.",
      "If the org cannot be reactivated immediately, disable the failing integration policy to stop error noise: kubectl annotate elasticagent <agentless-pod> elastic.co/disabled=true -n <namespace> or disable via Kibana Fleet → Agent Policies."
    ],
    "dependency_edges": [
      {
        "source": "httpjson",
        "target": "okta",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "The agentless Okta (httpjson) integration cannot fetch an OAuth token because the configured Okta developer organization is deactivated (E0000260), returning 403 Forbidden and stopping Okta API polling."
  },
  {
    "event_id": "d802ca9f-e8d0-479f-b52b-20c2b62d29c8",
    "timestamp": "2026-07-15T05:24:28.788Z",
    "created_at": "2026-07-15T05:24:28.788Z",
    "discovery_id": "4599f385-94f5-4ae9-8123-843178c95fd7",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-notion-api-response-error-c6781ee2",
    "status": "acknowledged",
    "title": "Connectors — Notion connector: Notion API response errors",
    "summary": "Connectors: The Notion connector is failing to connect to the Notion API, returning APIResponseError on every ping/sync attempt. Notion ingestion is fully blocked for the agentless Notion connector policy in logging-gcp-us-central1; no exposed user-facing services are affected. Errors confirmed active as recently as 05:23Z with no sign of recovery. Operator action required: verify or rotate the Notion integration credentials/permissions in the connector configuration.",
    "criticality": 40,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check and rotate the Notion integration token in the connector configuration: navigate to Kibana → Connectors → Notion connector policy → Edit → update the Notion API key/integration token and save.",
      "Verify the Notion integration has the required permissions (read access to the target databases/pages) in the Notion workspace settings at https://www.notion.so/my-integrations.",
      "If credentials are correct, restart the agentless connector pod: kubectl rollout restart deployment/elastic-agent-agentless -n <namespace> to force a fresh connection attempt."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors is failing to sync Notion because the Notion API is returning APIResponseError during connector ping/sync, indicating invalid/unauthorized Notion integration credentials or permissions."
  },
  {
    "event_id": "4315c0c7-610f-4a69-b0e9-5769490e4351",
    "timestamp": "2026-07-15T05:20:11.067Z",
    "created_at": "2026-07-15T05:20:11.067Z",
    "discovery_id": "26c568b0-6791-42b0-b242-948060059018",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__otel-collector-persistent-recovery-resta-4984fc08",
    "status": "acknowledged",
    "title": "Agentless OTel collector — otel_manager: recovery restart loop",
    "summary": "Agentless OTel collector: managed collector is crash-looping due to invalid AWS credentials configuration. Multiple awscredentialsprovider extensions (ECS, Lambda, EC2, ELB, SQS, RDS) are configured without credentials, assume_role, or profile, causing the collector to exit on every startup attempt. Affects agentless AWS CloudWatch integrations under policy 0a105cde-521e-46d2-9e56-9b825baa61e6. Crash loop confirmed active as of 05:18:13Z, ongoing since at least 03:00Z (~2h15m). Fix the AWS credentials configuration in the affected Fleet integration policy.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Persistent Recovery Restart Loop"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the AWS credentials configuration for the agentless OTel collector: update the integration policy to provide at least one of credentials, assume_role, or profile for each awscredentialsprovider extension, or remove the auth override to use the default SDK credential chain. In Fleet UI: navigate to the affected integration policy (policy ID 0a105cde-521e-46d2-9e56-9b825baa61e6) and update the AWS authentication settings.",
      "If the integration policy cannot be immediately updated, remove the awscredentialsprovider auth override to fall back to the default SDK chain: kubectl exec -n <agentless-namespace> <agentless-pod> -- elastic-agent inspect | grep -A5 awscredentialsprovider to identify the affected config, then update via Fleet API: PUT /api/fleet/agent_policies/<policy-id>",
      "Monitor the crash loop recovery: kubectl logs -n <agentless-namespace> -l app=agentless --tail=50 | grep otel_manager to confirm the collector stops restarting after the credentials fix is applied."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed OTel collector is restarting because awscredentialsprovider extensions are configured without any of credentials, assume_role, or profile, causing invalid configuration and collector exit on startup."
  },
  {
    "event_id": "ad116d34-8c2d-4941-acad-43393b851a86",
    "timestamp": "2026-07-15T05:19:39.767Z",
    "created_at": "2026-07-15T05:19:39.767Z",
    "discovery_id": "e46a61c6-0126-4eca-aa4a-6f4d02c656d2",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-ff3338b8",
    "status": "promoted",
    "title": "UIAM — proxy auth path: authentication failures",
    "summary": "UIAM: authentication failures via proxy are actively ongoing. Users authenticating through the proxy→UIAM path are receiving non-2xx responses on the /_authenticate endpoint. Failure confirmed active as of 05:17:59Z (seconds before this review), with onset at 03:30Z — sustained for ~1h47m with no sign of recovery. Immediately inspect proxy and UIAM service health and restart the affected component.",
    "criticality": 76,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the proxy service health and logs for the /_authenticate path: kubectl logs -n <proxy-namespace> -l app=proxy --tail=200 | grep _authenticate",
      "Check UIAM service health and error rates on the /_authenticate endpoint: kubectl get pods -n <uiam-namespace> -l app=uiam and kubectl logs -n <uiam-namespace> -l app=uiam --tail=200 | grep -E '(error|4[0-9]{2}|5[0-9]{2})'",
      "If UIAM pods are unhealthy, restart them: kubectl rollout restart deployment/<uiam-deployment> -n <uiam-namespace>; if proxy is the source of errors, restart: kubectl rollout restart deployment/<proxy-deployment> -n <proxy-namespace>"
    ],
    "dependency_edges": [],
    "root_cause": "Proxy is returning non-2xx responses on the UIAM /_authenticate path, indicating the proxy→UIAM authentication flow is failing for some requests."
  },
  {
    "event_id": "b3149ad8-80a6-4653-a9fc-7a1d883d2533",
    "timestamp": "2026-07-15T05:03:36.274Z",
    "created_at": "2026-07-15T05:03:36.274Z",
    "discovery_id": "43d01411-e6c9-4af8-ac53-86b81abeda8a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-c1bbe3db",
    "status": "acknowledged",
    "title": "Connectors — SSH connectivity: alert dip (possible logging stop)",
    "summary": "Connectors SSH Connection Failure rule shows a dip in alert volume (p_value ~8.8e-22) since the detection window, indicating the SSH connector may have stopped producing failure logs — a dip pattern often signals the component went silent rather than recovered. The agentless log stream is alive (240K rows since 04:00Z), ruling out a telemetry gap. No confirming SSH failure rows could be retrieved without a matching KI query. Verify connectors-ssh workload health and log pipeline continuity.",
    "criticality": 20,
    "confidence": 0.2,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check connectors-ssh workload health: kubectl get pods -n <connectors-namespace> -l app=connectors-ssh and review recent pod restarts or CrashLoopBackOff states.",
      "Inspect SSH connector logs directly: kubectl logs -n <connectors-namespace> <connectors-ssh-pod> --tail=200 | grep -i ssh to identify connection failure messages.",
      "Verify log pipeline continuity for the agentless SSH connector: kubectl get pods -n <agentless-namespace> | grep connectors and confirm the agent pod is running and not in a failed state."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "c34f04bb-9a71-43e1-958f-1e5a105a29b5",
    "timestamp": "2026-07-15T05:03:36.270Z",
    "created_at": "2026-07-15T05:03:36.270Z",
    "discovery_id": "ff14c732-364a-41e5-85e6-ecaa04f3beeb",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-6b6eda5a",
    "status": "acknowledged",
    "title": "Agentless CEL — retryable HTTP input: request failed",
    "summary": "Agentless CEL input is experiencing retryable HTTP request failures since 2026-07-15T03:30Z, with the most recent failure confirmed at 05:01:04Z (at review time). Affects agentless integrations relying on the CEL retryable HTTP input to pull data from upstream APIs. No exposed downstream dependency edges identified; impact is scoped to data ingestion continuity for affected integrations. Identify the failing upstream endpoint and restore connectivity or authentication for the CEL input.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the failing upstream endpoint by inspecting CEL input logs: kubectl logs -n <agentless-namespace> <agentless-cel-pod> --tail=200 | grep -i 'request failed' to extract the target URL and HTTP status code.",
      "If the upstream endpoint requires authentication, rotate or re-validate the API credentials configured in the CEL integration policy via Fleet UI: Stack Management → Integrations → CEL → Edit policy → update API key/token.",
      "If the upstream endpoint is unreachable (network/DNS), verify connectivity from the agentless pod: kubectl exec -n <agentless-namespace> <agentless-cel-pod> -- curl -v <upstream-url> and escalate to the upstream service owner if confirmed down."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "557463c9-8eb2-4fd4-890a-b5fec1346b80",
    "timestamp": "2026-07-15T05:02:51.612Z",
    "created_at": "2026-07-15T05:02:51.612Z",
    "discovery_id": "3cdb9e6a-2d4b-47b4-b771-a2583250962d",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-370ca477",
    "status": "acknowledged",
    "title": "UIAM — authentication service: ERROR/WARN logs \"entropy source stuck\"",
    "summary": "UIAM authentication service is emitting ERROR/WARN logs with \"entropy source stuck\" since 2026-07-15T03:54Z, with the most recent error confirmed at 04:42Z. Affects the /uiam/api/v1/authentication/_authenticate endpoint; no exposed downstream dependency edges identified. Failure is ongoing and stable — not spreading. Investigate UIAM pod runtime entropy source and restore normal auth processing.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM pod entropy availability: kubectl exec -n <uiam-namespace> <uiam-pod> -- cat /proc/sys/kernel/random/entropy_avail — if below 256, the entropy pool is depleted.",
      "Restart the affected UIAM pod to force re-initialization of the entropy source: kubectl rollout restart deployment/<uiam-deployment> -n <uiam-namespace>",
      "If entropy starvation is confirmed, install haveged or rng-tools on the node: kubectl debug node/<node-name> -it --image=ubuntu -- apt-get install -y haveged && systemctl start haveged"
    ],
    "dependency_edges": [],
    "root_cause": "UIAM is erroring because its runtime entropy source is stuck, preventing normal request handling (confirmed by ERROR/WARN log row containing \"entropy source stuck\")."
  },
  {
    "event_id": "1ce84220-a67a-47c1-b90d-e240a61aa02d",
    "timestamp": "2026-07-15T04:57:31.110Z",
    "created_at": "2026-07-15T04:57:31.110Z",
    "discovery_id": "opslead-2026-07-15-01",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__app-secrets-or-config-object-creation-afae6d92",
    "status": "acknowledged",
    "title": "GCP Agentless Collector — credential configuration: collector crash-looping on invalid credentials",
    "summary": "The agentless log collector for GCP us-central1 is crash-looping and failing to start due to invalid credential configuration. The collector exits with errors on every restart attempt, halting log ingestion for the logging-gcp-us-central1-logs-agentless-log-default and -api-log-default streams. Onset around 2026-07-15T03:00Z; still active as of 04:56Z with no sign of recovery. Current errors point to AWS credential misconfiguration (multiple CloudWatch input components missing credentials/assume_role/profile), not GCP credentials JSON as originally assessed — on-call should audit the full agentless collector credential configuration, not just GCP. Assign as a ticket and correct the credential configuration to restore ingestion.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default",
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure",
      "Libbeat Output Read Errors",
      "App Secrets or Config Object Creation"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the agentless collector credential configuration for all input components: review the collector config file (typically /agentless/data/config/ or equivalent) and ensure every AWS CloudWatch input component has at least one of credentials, assume_role, or profile set — or remove the auth option to use the default SDK credential chain. Restart the collector after correction: `systemctl restart elastic-agent` (or the equivalent agentless process manager command).",
      "Verify GCP credentials JSON is also valid (original hypothesis): check the GCP service account key file referenced by the agentless beater config and confirm it is well-formed JSON with the correct fields. Re-run `elastic-agent inspect` or equivalent to validate config before restarting.",
      "After correcting credentials, confirm ingestion resumes by checking stream health: `curl -s '<Elasticsearch>/_data_stream/logging-gcp-us-central1-logs-agentless-log-default/_stats' | jq '.data_streams[0].store_size'` and verify document count is increasing."
    ],
    "dependency_edges": [],
    "root_cause": "The agentless collector is crash-looping because multiple AWS CloudWatch input components are missing required credential configuration (credentials, assume_role, or profile not set), causing the collector to exit on every startup attempt and preventing log ingestion."
  },
  {
    "event_id": "4bfb05dd-5feb-4dfa-b18c-613be46cf9da",
    "timestamp": "2026-07-15T04:49:54.857Z",
    "created_at": "2026-07-15T04:49:54.857Z",
    "discovery_id": "69c74979-9564-4697-9aec-2288eade1ce6",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-69a22473",
    "status": "acknowledged",
    "title": "O365 integration — DLP subscription: permission error AF10001",
    "summary": "O365 integration DLP subscription is failing with 401 Unauthorized (AF10001 — missing permission) on every attempt to start the DLP.All content type subscription. The CEL-based O365 audit component is cycling HEALTHY→DEGRADED continuously, confirmed active at 04:47Z. DLP audit data collection is silently halted for all affected O365 tenants using this integration. The co-triggered Cloudbeat invalid-credentials rule is noise (refuted). Assign to the integrations team to add DLP.All permission to the Azure AD app registration and grant admin consent.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat",
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify O365 app registration permissions in Azure AD: navigate to Azure Portal → App registrations → [O365 integration app] → API permissions, and confirm 'Office 365 Management APIs' includes 'ActivityFeed.Read' and 'DLP.All' application permissions with admin consent granted",
      "If permissions are missing, add 'ActivityFeed.Read' and 'DLP.All' under Office 365 Management APIs and grant tenant-wide admin consent: az ad app permission add --id <app-id> --api 00000007-0000-0000-c000-000000000000 --api-permissions <permission-id>=Role",
      "After granting permissions, restart the affected O365 agentless integration workload to force a fresh subscription attempt: kubectl delete pod -n <agentless-namespace> -l k8s.elastic.co/agentless-integration-name=o365 to trigger pod recreation"
    ],
    "dependency_edges": [
      {
        "source": "cel",
        "target": "o365",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "O365 DLP audit data collection is halted because the Azure AD application registration used by the CEL-based O365 integration is missing the required DLP.All permission in the Office 365 Management API permission set, causing every subscription start attempt to return 401 Unauthorized AF10001."
  },
  {
    "event_id": "d9da51b3-e76a-4f50-b679-bfc61ddee32b",
    "timestamp": "2026-07-15T04:49:18.532Z",
    "created_at": "2026-07-15T04:49:18.532Z",
    "discovery_id": "6ff2c073-e7ef-40ca-8a52-16123d84f651",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-b69a26fb",
    "status": "acknowledged",
    "title": "Elasticsearch controller — control plane: errors/warnings signal",
    "summary": "Elasticsearch controller is emitting error/warning-level logs from the control plane namespace. The signal is real — rows confirmed present as recently as 04:37Z — but the log message content is not surfaced by available queries, so the specific failure mode (reconciliation error, autoscaler issue, or transient warning) cannot be determined. No exposed dependency edges and no confirmed user-blocking impact. Monitor for escalation or new error signatures; schedule investigation to identify the error content via direct pod log access.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check elasticsearch-controller pod logs directly: kubectl logs -n elasticsearch-controller -l app=elasticsearch-controller --since=1h | grep -E 'error|warning|ERROR|WARN' to surface the actual error message content",
      "If reconciliation errors are found, check ElasticsearchAutoscaler resource status: kubectl get elasticsearchautoscaler -n elasticsearch-controller -o yaml to identify any stuck or failed reconciliation loops",
      "If the error pattern indicates a deployment issue, check recent rollout history: kubectl rollout history deployment/elasticsearch-controller -n elasticsearch-controller and consider rolling back if a recent build (de484f0dc16d or 617abf97623b) introduced regressions"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f9bcf658-d460-4e6d-9032-bf52945004bf",
    "timestamp": "2026-07-15T04:32:19.598Z",
    "created_at": "2026-07-15T04:32:19.598Z",
    "discovery_id": "eb4ca4ba-ce83-48a5-a3ef-b865bbaacdca",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-692d33b7",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — startup: seccomp policy already registered panic",
    "summary": "Agentless Heartbeat/Synthetics components in logging-gcp-us-central1 are crashing at startup with a Go panic caused by double-registration of the seccomp policy. Affected components fail to initialize, with the spawned unit exiting fatally due to a stats endpoint socket error compounded by the seccomp conflict. Onset confirmed at 2026-07-15T00:00:02Z; no exposed user-facing dependency edges identified, but monitoring coverage may be degraded. Schedule investigation of the seccomp initialization path and redeploy affected agentless components.",
    "criticality": 35,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Redeploy the affected agentless component to clear the double-initialization state: navigate to Fleet → Agentless policies → locate the Heartbeat/Synthetics policy in us-central1 → click 'Redeploy' or use `elastic-agent enroll --force` on the affected host to trigger a clean startup.",
      "If redeployment does not resolve the panic, pin the agentless component to the previous known-good version via Fleet: Settings → Upgrade → select the prior release tag, or use `helm upgrade <release> elastic/elastic-agent --set agent.version=<prior-version>` if Kubernetes-managed.",
      "Check for duplicate seccomp policy registration in the component configuration: review `/etc/elastic-agent/elastic-agent.yml` and any mounted seccomp profiles for duplicate `seccomp` stanzas, then remove the duplicate and restart with `systemctl restart elastic-agent`."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed Heartbeat/Synthetics component is crashing on startup because the seccomp policy registration is invoked twice (double-initialization), triggering a Go panic (\"a seccomp policy is already registered\") and causing the spawned unit to exit fatally."
  },
  {
    "event_id": "7529a8ac-21b6-43ed-88b4-ab73eedf0618",
    "timestamp": "2026-07-15T04:29:23.577Z",
    "created_at": "2026-07-15T04:29:23.577Z",
    "discovery_id": "fb98c038-7d1b-505f-8947-89d30da12f15-907e5bf0-bd8a-4579-96c9-97a4174c5f9a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-6b712597",
    "status": "acknowledged",
    "title": "Agentless collector — control-plane components: unit/component state transitioned to FAILED",
    "summary": "Agentless collector components are in a persistent FAILED state affecting security and telemetry ingestion. The Cloudbeat CIS GCP CSPM unit is exiting with code 1, and multiple AWS CloudWatch input OTel collector components (aws-elb_classic, aws-elb_gateway, aws-sqs, aws-elb_network, aws-lambda, aws-ecs, aws-ec2, aws-rds, aws-elb) are failing due to missing awscredentialsprovider configuration — each requires at least one of credentials, assume_role, or profile. The failure is internal (no exposed dependency edges), affecting agentless security posture and telemetry ingestion pipelines only. Signal is stationary and confirmed active as of 04:28Z today, persisting since 2026-07-14T04:16Z (~24 hours). Immediate action: update the agentless integration configuration for the affected AWS CloudWatch OTel components to supply valid credentials, assume_role, or profile settings, and validate the Cloudbeat CIS GCP CSPM unit credentials.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Update the agentless integration configuration for the AWS CloudWatch input OTel components (policy ID 0a105cde-521e-46d2-9e56-9b825baa61e6) to supply at least one of: credentials, assume_role, or profile in the awscredentialsprovider extension — or remove the auth option to use the default SDK credential chain: `kubectl edit configmap -n project-<stack-id> agentless-<policy-id>` and patch the OTel collector config.",
      "Validate and re-provision the Cloudbeat CIS GCP CSPM unit credentials for the failing unit (cloudbeat/cis_gcp-cspm-57124bd9-34ed-487c-b6b1-eff527e272a7): check the GCP credentials JSON is valid and re-apply via `kubectl rollout restart deployment/agentless-a07f47e7-8dc2-4139-9669-34618b87ba85 -n project-b65be5efef7140298c5a85b24579d666`.",
      "If credentials cannot be immediately fixed, temporarily disable the affected AWS CloudWatch OTel integrations in Fleet to stop the crash-restart loop: navigate to Fleet → Integrations → AWS CloudWatch (policy 0a105cde-521e-46d2-9e56-9b825baa61e6) and disable until credentials are corrected."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless collector components are failing because multiple AWS CloudWatch input OTel collector extensions (awscredentialsprovider) are configured without any of credentials, assume_role, or profile, causing the collector to exit with an invalid configuration error on every restart attempt."
  },
  {
    "event_id": "21f993db-c289-4812-b10a-cb5d41b67698",
    "timestamp": "2026-07-15T04:08:34.573Z",
    "created_at": "2026-07-15T04:08:34.573Z",
    "discovery_id": "fcfabc29-4fb4-4cef-a985-e7b785315e82",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-service-type-not-configured-7d49c4b3",
    "status": "acknowledged",
    "title": "Agentless connectors — configuration: service type not configured",
    "summary": "Agentless connectors: a dip change point was detected in the connectors service-type configuration validation signal in the agentless-log-default stream (GCP us-central1). Connectors-py errors are confirmed active as of 04:06 UTC (most recent error: API token invalid — connectors component in error state). Affects connector workloads that cannot start sync jobs due to missing or invalid configuration. No user-facing services are exposed. Operator action required: review and correct connector integration policy configuration in Fleet.",
    "criticality": 35,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify connectors-py pods missing service_type configuration: kubectl get pods -n agentless -l component.type=connectors-py -o yaml | grep -A5 'service_type'",
      "Update the connector integration policy in Fleet to assign a valid service_type: Fleet > Agent Policies > [policy] > Integrations > Elastic Connectors > Edit > set Service Type field",
      "Restart affected connector pods after policy update: kubectl rollout restart deployment -n agentless -l component.type=connectors-py"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "0d8122c5-fe87-4bfa-8c8f-20c487c520fd",
    "timestamp": "2026-07-15T04:08:03.035Z",
    "created_at": "2026-07-15T04:08:03.035Z",
    "discovery_id": "f8ffe8a1-76c2-4ccb-aca9-57332ed00ae3",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-38eed390",
    "status": "acknowledged",
    "title": "Agentless Okta — httpjson input: developer org deactivated (E0000260)",
    "summary": "Agentless Okta: the httpjson Okta integration is failing to collect system logs because the configured Okta developer org is deactivated (error E0000260, OAuth 403 Forbidden). Affects the agentless httpjson → Okta pipeline for the dev-90678350.okta.com tenant; all dependency edges are internal-only with no user-facing exposure. Error confirmed active as of 04:06 UTC. Operator action required: reactivate the Okta developer org or reconfigure the integration to use an active tenant.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Reactivate the Okta developer org or reconfigure the integration to point to an active tenant: in Okta Admin Console, navigate to Settings > Account and reactivate the org, or update the integration policy input_source URL to an active Okta tenant",
      "If the developer org is permanently deactivated, remove or disable the Okta integration policy in Fleet: Fleet > Agent Policies > [policy] > Integrations > Okta > Delete",
      "Verify the httpjson Okta receiver resumes log collection after remediation: kubectl logs -n agentless -l k8s.elastic.co/agentless-integration-name=okta --since=15m | grep -i 'published\\|error'"
    ],
    "dependency_edges": [
      {
        "source": "httpjson",
        "target": "okta",
        "protocol": "https",
        "exposure": "not_exposed"
      }
    ],
    "root_cause": "Okta system log collection is halted because the configured Okta developer org (dev-90678350.okta.com) is deactivated, causing OAuth token fetch to return 403 Forbidden with error code E0000260."
  },
  {
    "event_id": "82ffeea6-e803-4cd9-bca2-2bda125b39cc",
    "timestamp": "2026-07-15T03:56:25.758Z",
    "created_at": "2026-07-15T03:56:25.758Z",
    "discovery_id": "c51a56ef-7315-55e1-bb17-6747450681e7-batch-20260715-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-1d1631df",
    "status": "acknowledged",
    "title": "Agentless logging — connectors/log shipper: SSH connect and output read errors",
    "summary": "Agentless connector SSH connection failures are actively recurring in the agentless-log-default stream. A connect-failure signature (\"Connect call failed\" / errno 22) was confirmed at 03:55 UTC, indicating the issue is ongoing. Libbeat output read errors are co-trending but lack a confirming query. Affected: agentless log collection across multiple project namespaces in GCP us-central1. Onset trend detected; no sign of recovery. Immediate action: check agentless connector runner health and SSH reachability for connector targets in the affected project namespaces.",
    "criticality": 35,
    "confidence": 0.57,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure",
      "Libbeat Output Read Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless connector pod health: kubectl get pods -n <affected-project-namespace> -l app.kubernetes.io/component=agentless and kubectl describe pod <pod-name> to identify SSH target reachability issues.",
      "Inspect connector SSH target connectivity: kubectl exec -n <affected-project-namespace> <agentless-pod> -- ssh -v <target-host> to confirm whether the connect failure is network-level or credential-related.",
      "Review connector configuration for affected project namespaces via Kibana Fleet UI (Stack Management > Connectors) and verify SSH credentials and target host settings are valid."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "8fe982f2-46db-42bb-a7c0-ee7bdf0e8d53",
    "timestamp": "2026-07-15T03:07:49.128Z",
    "created_at": "2026-07-15T03:07:49.128Z",
    "discovery_id": "6e4bf578-657f-41fd-bf9a-9379582598ae",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-57e21c8a",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — startup: seccomp policy already registered panic",
    "summary": "Agentless Heartbeat/Synthetics units in logging-gcp-us-central1 are crash-looping on startup due to a duplicate seccomp policy registration panic. Every spawned unit (heartbeat, cel, cloudbeat) immediately terminates with \"panic: a seccomp policy is already registered\" and enters FAILED state. The failure has been continuous since 2026-07-15T00:00Z and is confirmed still active as of 03:06Z. The panic originates in heartbeat/security/seccomp.go and is tied to build commit 20260710190233-00068f79631b. Agentless synthetic monitoring is fully non-functional in this region. Identify and roll back the heartbeat/seccomp regression introduced in the 2026-07-10 build.",
    "criticality": 55,
    "confidence": 0.78,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Agentless Component Entered FAILED State"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the agentless heartbeat component to the previous stable build: run `elastic-agent upgrade --version <prior-stable-version>` on all agentless nodes in logging-gcp-us-central1, or redeploy the agentless synthetics fleet with the last known-good image tag predating 20260710190233.",
      "If rollback is not immediately available, disable the duplicate seccomp registration call by patching the agentless heartbeat config to set `seccomp.enabled: false` and restart the agentless units: `systemctl restart elastic-agent` on affected hosts.",
      "Pin the agentless heartbeat image to the pre-regression tag in the deployment manifest and trigger a rolling restart: `kubectl rollout restart deployment/agentless-heartbeat -n elastic-agent` in the relevant GCP cluster."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless Heartbeat/Synthetics component is failing because the seccomp policy registration is executed twice during initialization (via `heartbeat/security/seccomp.go:290` → `MustRegisterPolicy`), triggering \"panic: a seccomp policy is already registered\" and terminating every spawned unit process. The regression was introduced in build `v7.0.0-alpha2.0.20260710190233-00068f79631b`."
  },
  {
    "event_id": "dd929167-bb7d-4db7-b5a3-ae103935f30a",
    "timestamp": "2026-07-15T01:33:50.445Z",
    "created_at": "2026-07-15T01:33:50.445Z",
    "discovery_id": "disc-opslead-20260715-o365-dlp-af10001",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-log-default__o365-dlp-subscription-permission-error-af10001-6ad06c3d",
    "status": "acknowledged",
    "title": "O365 audit — DLP subscription start: AF10001 permission error",
    "summary": "O365 DLP audit ingestion is failing with 401 Unauthorized (AF10001 — missing expected permission) on POST /activity/feed/subscriptions/start for the DLP.All content type. The agentless CEL integration component is in DEGRADED state. DLP audit log collection is interrupted; no exposed user-facing services are affected. The error was still active at 01:21Z (most recent confirmed row), approximately 50 minutes after onset. Assign to the team owning the O365 app registration to restore the required permission set.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and restore the O365 app registration permissions: in Azure AD, navigate to the app registration used for the DLP integration and confirm the 'ActivityFeed.Read' (or equivalent DLP subscription) API permission is granted and admin-consented. Command: az ad app permission list --id <APP_ID> && az ad app permission grant --id <APP_ID> --api <GRAPH_API_ID>",
      "Restart the affected agentless CEL integration to force a re-authentication attempt after permissions are restored: kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace>",
      "Confirm subscription start succeeds by tailing the agentless pod logs: kubectl logs -f deployment/<agentless-deployment-name> -n <project-namespace> | grep -E 'AF10001|DLP.All|subscriptions/start'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "48bb43e0-d76d-440d-a5cf-5861f91425f9",
    "timestamp": "2026-07-15T01:29:27.648Z",
    "created_at": "2026-07-15T01:29:27.648Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-76cdda1c",
    "status": "acknowledged",
    "title": "O365 DLP ingestion — subscription start: AF10001 permission error",
    "summary": "O365 DLP subscription start requests are being rejected with 401/AF10001 permission errors, blocking DLP.All audit log ingestion. Affects O365 DLP audit collection for the agentless integration in the logging-gcp-us-central1 deployment. Error confirmed at onset; stationary pattern indicates a persistent misconfiguration. Remediate by granting the required O365 app permissions for DLP.All subscription and re-running admin consent.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and grant the required O365 application permissions for DLP.All subscription: in Azure AD > App registrations > [affected app] > API permissions, add 'ActivityFeed.Read' (or the required DLP permission) and grant admin consent.",
      "Check the O365 integration configuration in Fleet: navigate to Fleet > Agent Policies > [affected policy] > O365 integration and confirm the client credentials and permission scopes are correctly configured for DLP.All subscription.",
      "If permissions were recently revoked or the app registration was modified, re-run the O365 app consent flow for the affected tenant to restore DLP.All subscription access."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "187275ab-16ba-4e62-a9c4-3890cbde3d65",
    "timestamp": "2026-07-15T01:29:00.785Z",
    "created_at": "2026-07-15T01:29:00.785Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-04953a5c",
    "status": "acknowledged",
    "title": "CEL input — HTTP client: retryable request failures",
    "summary": "CEL input HTTP client is failing retryable requests to its upstream endpoint, causing data collection gaps for integrations using CEL HTTP fetches. Affects agentless-managed integrations in the logging-gcp-us-central1 deployment. Failure confirmed ongoing at 2026-07-15T01:26:07Z — no recovery observed. Investigate CEL input connectivity and upstream endpoint health; check for auth/TLS errors in the affected agentless pod logs.",
    "criticality": 40,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check CEL input component health in the agentless deployment: kubectl -n <project-namespace> logs <agentless-pod> -c agentless | grep 'input.cel.retryablehttp' to identify the upstream endpoint and error pattern.",
      "Verify upstream endpoint reachability from the agentless pod: kubectl -n <project-namespace> exec <agentless-pod> -- curl -v <upstream-url> to confirm connectivity or TLS/auth failure.",
      "If the upstream endpoint is confirmed unreachable or returning auth errors, rotate or refresh the CEL input credentials/token via Fleet policy update: navigate to Fleet > Agent Policies > [affected policy] > CEL input configuration and update the auth token."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "57b31a8e-fe42-48af-9de6-b67b7ed34771",
    "timestamp": "2026-07-15T01:10:34.305Z",
    "created_at": "2026-07-15T01:10:34.305Z",
    "discovery_id": "discovery-2026-07-14T11:48:20Z-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-c0f47ba8",
    "status": "promoted",
    "title": "Authentication — proxy/token fetch: 403 forbidden failures",
    "summary": "Authentication service: proxy-mediated auth requests and Okta OAuth token fetches are returning 403 Forbidden, with Okta developer org deactivation (E0000260) confirmed as the root cause. All users relying on Okta-backed authentication through the ingress proxy are blocked from completing authentication. All three detection rules confirmed still active as of 12:06Z — onset ~10:00Z, no recovery. Immediately verify Okta org status and rotate/replace credentials; check proxy auth path configuration for fallback options.",
    "criticality": 80,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-all",
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy",
      "Integration OAuth Token Fetch 403 Forbidden",
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Okta org status immediately: log into the Okta admin console for the affected developer org and verify whether the org has been deactivated or suspended; contact Okta support if deactivated (error E0000260 = org deactivated).",
      "Rotate or replace the Okta OAuth credentials in the agentless integration configuration: kubectl edit secret <okta-oauth-secret> -n <agentless-namespace> and update client_id/client_secret with valid credentials from an active Okta org.",
      "If Okta org cannot be immediately reactivated, disable the Okta integration in Fleet to stop the 403 retry storm: kubectl patch agentpolicy <policy-name> -n fleet-server --type=merge -p '{\"spec\":{\"integrations\":[]}}'  or remove the Okta integration via the Fleet UI to restore proxy auth stability."
    ],
    "dependency_edges": [],
    "root_cause": "Authentication requests are failing because the Okta developer org is deactivated (E0000260), causing OAuth token fetch to return 403 Forbidden and blocking proxy-mediated authentication for all dependent integrations."
  },
  {
    "event_id": "69155001-b8bf-45b7-b447-9efd4fe54ffb",
    "timestamp": "2026-07-15T00:47:16.458Z",
    "created_at": "2026-07-15T00:47:16.458Z",
    "discovery_id": "04d0471d-c502-40d0-a2c0-2337964966ec",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbeat-7cbb8d4b",
    "status": "acknowledged",
    "title": "Cloudbeat — credentials config: invalid configuration error",
    "summary": "Cloudbeat is crashing on startup due to invalid GCP credentials JSON configuration. The process is actively exiting with \"failed to initialize gcp config: invalid credentials JSON\" as recently as 24 seconds before this review. GCP CIS security posture scanning (cloudbeat/cis_gcp) is non-functional across affected agentless deployments. The issue is chronic (stationary signal) with no sign of self-recovery. Verify recent changes to the GCP credentials/assume_role/profile configuration for the affected agentless agent policies and re-provision valid credentials.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the GCP credentials configuration for affected agent policies: kubectl get secret -n <project-namespace> -l k8s.elastic.co/agent-policy-id=<policy-id> -o yaml — look for missing or malformed credentials/assume_role/profile fields.",
      "Re-provision valid GCP service account credentials via the Fleet UI: navigate to Fleet → Agent Policies → <affected policy> → GCP integration → update credentials JSON with a valid service account key.",
      "Restart affected cloudbeat pods after credentials are corrected: kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace> — verify pod reaches Running state and logs no longer show 'invalid credentials JSON'."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "5629d47f-5f07-4c05-835c-a6ae06740c79",
    "timestamp": "2026-07-15T00:24:46.927Z",
    "created_at": "2026-07-15T00:24:46.927Z",
    "discovery_id": "disc-opslead-20260715-connectors-config-validation",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-degraded-sta-f9294da9",
    "status": "promoted",
    "title": "Agentless connectors — configuration validation: required fields missing",
    "summary": "Agentless connectors are actively failing connector runs due to missing required configuration fields (Authentication Token, Days of message history) and an invalid API token, producing ConfigurableFieldValueError on every run. Confluence connector users are directly affected via the exposed connectors → Confluence dependency — sync tasks cannot complete. Errors have been continuous since 2026-07-13T22:30Z (~40h) with no recovery; the most recent failure row is seconds old. Concurrently, the elastic-agent data directory symlink is missing, causing repeated cleanup/reschedule loops that further destabilize the agentless runtime. Page on-call immediately to audit and fix connector policy required fields and restore the elastic-agent data directory symlink.",
    "criticality": 78,
    "confidence": 0.82,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured",
      "Connectors Field Validation Error (ConfigurableFieldValueError)",
      "Elastic Agent Data Directory Symlink Missing"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Audit and fix the affected connector policy in Kibana (Stack Management → Connectors): populate the required 'Authentication Token' and 'Days of message history to fetch' fields for the Confluence connector, then re-run the connector to verify the ConfigurableFieldValueError clears.",
      "Restore the elastic-agent data directory symlink on the agentless host: `sudo ln -s /opt/elastic-agent/<version> /opt/elastic-agent/data/elastic-agent-<hash>/run` (adjust path to match the installed version), then restart the agent with `sudo systemctl restart elastic-agent` to stop the cleanup/reschedule loop.",
      "Rotate or reissue the invalid API token for the affected connector integration: navigate to Kibana → Stack Management → Connectors → [affected connector] → Edit, replace the API token, save, and confirm the next scheduled run completes without credential errors."
    ],
    "dependency_edges": [
      {
        "source": "connectors",
        "target": "confluence",
        "protocol": "https",
        "exposure": "exposed"
      }
    ],
    "root_cause": "Agentless connectors are failing because connector policies are missing required configuration fields (Authentication Token, Days of message history) and at least one integration token is invalid, triggering ConfigurableFieldValueError on every connector run; concurrently, the elastic-agent data directory symlink is missing, causing the agentless runtime cleanup to loop and reschedule components."
  },
  {
    "event_id": "90fe7df0-b667-44ef-93ed-af11f8d993e5",
    "timestamp": "2026-07-15T00:16:30.276Z",
    "created_at": "2026-07-15T00:16:30.276Z",
    "discovery_id": "disc-opslead-20260715-connectors-notion-api-error",
    "discovery_slug": "logging-gcp-us-central1-logs-agentl__connectors-notion-api-response-error-7f075af5",
    "status": "acknowledged",
    "title": "Connectors — Notion API: API response/connection errors",
    "summary": "Notion connector: APIResponseError failures are continuously occurring in agentless connector logs, with the most recent error indicating an invalid API token. Affects Notion content sync and indexing for connector users — no user-facing services are exposed. Errors have persisted since onset at 2026-07-14T18:30Z and are still active as of 2026-07-15T00:14Z. Rotate or reissue the Notion API integration token and update the connector configuration in Kibana to restore sync operations.",
    "criticality": 55,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate or regenerate the Notion API integration token: in the Notion workspace settings, navigate to Connections → find the Elastic connector integration → revoke and reissue the token, then update it in Kibana under Stack Management → Connectors → Notion connector → Edit configuration.",
      "Verify the connector can reach the Notion API after token update by triggering a manual sync: in Kibana navigate to Enterprise Search → Content → Connectors → Notion → Sync → Full sync, and confirm no APIResponseError in the connector logs.",
      "If the token is valid but the error persists, check the Notion integration's OAuth scopes and workspace permissions: ensure the integration has 'Read content' capability enabled in the Notion workspace settings under Connections → Develop or manage integrations."
    ],
    "dependency_edges": [],
    "root_cause": "Notion connector is failing because the Notion API integration token is invalid or revoked, causing APIResponseError on all connector sync operations."
  },
  {
    "event_id": "26d78a8f-49a0-4052-ac6b-46cbde2f764b",
    "timestamp": "2026-07-15T00:16:04.013Z",
    "created_at": "2026-07-15T00:16:04.013Z",
    "discovery_id": "disc-opslead-20260715-okta-dev-org-deactivated",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-e40c02a6",
    "status": "acknowledged",
    "title": "Okta integration — developer org: deactivated (E0000260)",
    "summary": "Okta integration: API requests are continuously failing with E0000260 (developer org deactivated) in agentless logs. Affects Okta data ingestion for the deactivated developer org — no user-facing services are exposed. Errors have persisted since onset at 2026-07-14T18:30Z and are still active as of 2026-07-15T00:14Z with no sign of recovery. Reactivate or replace the Okta developer org, or update the integration credentials/org configuration to restore data ingestion.",
    "criticality": 55,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Reactivate the Okta Developer Org via the Okta Admin Console (admin.okta.com → Settings → Account → Reactivate), or provision a replacement org and update the integration credentials in Kibana under Stack Management → Integrations → Okta.",
      "If the org deactivation is intentional, remove or disable the Okta integration in Kibana to stop recurring E0000260 errors: navigate to Fleet → Agent Policies → locate the Okta policy → disable or delete the integration.",
      "Verify the agentless pod for the Okta integration has recovered after credential update: kubectl get pods -n <project-namespace> -l k8s.elastic.co/agent-policy-id=<okta-policy-id> and confirm component.state transitions to HEALTHY in the agentless logs stream."
    ],
    "dependency_edges": [],
    "root_cause": "Okta integration is failing because the Okta Developer Org is deactivated, and Okta API requests are being rejected with E0000260."
  },
  {
    "event_id": "0e5e2240-c57e-41a6-bde5-3a70cc804e13",
    "timestamp": "2026-07-14T23:47:14.090Z",
    "created_at": "2026-07-14T23:47:14.090Z",
    "discovery_id": "disc-2026-07-14-agentless-failed-awscreds",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-46fbb3e3",
    "status": "acknowledged",
    "title": "Agentless — embedded collectors: components entering FAILED state",
    "summary": "Agentless embedded collector components are repeatedly transitioning to FAILED state due to a misconfigured AWS OTel collector. Affected collectors (Cloudbeat cis_gcp and AWS OTel) are cycling HEALTHY→FAILED as supervised processes exit with code 1. Impact is confined to internal agentless-managed collectors — no user-facing services are exposed. Failures have been continuous since 2026-07-14T23:20:00Z with no sign of recovery as of 23:45:36Z. Fix the AWS OTel awscredentialsprovider configuration immediately to stop the restart loop.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the AWS OTel collector credentials configuration: in the agentless integration policy, set at least one of `credentials`, `assume_role`, or `profile` under the awscredentialsprovider block, or remove the explicit auth option to fall back to the default AWS SDK credential chain. Apply via Kibana Fleet UI: navigate to the affected integration policy → AWS OTel collector settings → update credentials configuration → save and deploy.",
      "Verify supervised component restarts stop after the config fix: run `kubectl logs -n <agentless-namespace> <agentless-pod> --since=5m | grep -E 'FAILED|exit code'` to confirm no new FAILED transitions appear.",
      "If the credential fix cannot be applied immediately, disable the AWS OTel collector component in the integration policy to stop the restart loop and prevent log noise, then re-enable once credentials are configured correctly."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless embedded AWS OTel collector is failing because the awscredentialsprovider configuration is missing all of credentials/assume_role/profile, causing the process to exit with code 1 and the supervised unit/component to transition to FAILED state in a continuous restart loop."
  },
  {
    "event_id": "68d4e7fb-ef91-422c-bfc2-5806977f8a07",
    "timestamp": "2026-07-14T23:18:43.374Z",
    "created_at": "2026-07-14T23:18:43.374Z",
    "discovery_id": "03dbbeae-326d-5be6-b13d-991d459bd685-806b3a39-e22c-4d16-81bd-8d3fbe9a28c8",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-read-errors-e857428b",
    "status": "acknowledged",
    "title": "Logging pipeline — libbeat output: output read errors",
    "summary": "Logging pipeline: libbeat output read errors are occurring in the agentless logging pipeline (GCP us-central1). The libbeat output read path is blocked or failing, which may cause delayed or missing log delivery from agentless integrations. The failure is ongoing — confirmed active as of 23:16Z, persisting since onset at 18:30Z (~5 hours). Inspect the libbeat output destination connectivity and restart the affected agentless pod if the output is confirmed blocked.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Read Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the libbeat output destination health: identify the affected agentless pod with `kubectl get pods -n <project-namespace> | grep agentless` and inspect output connectivity with `kubectl logs <pod> -n <project-namespace> | grep -i 'output\\|read error\\|connection'` to determine if the Elasticsearch output endpoint is reachable.",
      "Inspect libbeat monitoring metrics for the affected agent: use `kubectl exec -it <pod> -n <project-namespace> -- curl -s http://localhost:5066/stats | jq '.libbeat.output'` to get current output read error counts and identify the magnitude of the backpressure.",
      "If output is confirmed blocked, restart the affected agentless pod to clear the output read error state: `kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace>`."
    ],
    "dependency_edges": [],
    "root_cause": "Libbeat output is erroring because its output read path is blocked or failing, producing non-zero output read errors (confirmed by libbeat output read error metric events in the agentless logging stream)."
  },
  {
    "event_id": "710e5c7e-d862-48da-9f72-ab3175d4db97",
    "timestamp": "2026-07-14T23:18:19.715Z",
    "created_at": "2026-07-14T23:18:19.715Z",
    "discovery_id": "ea3cf78b-a4f2-534a-bb78-18493f20c901-806b3a39-e22c-4d16-81bd-8d3fbe9a28c8",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-notion-api-response-error-34848638",
    "status": "acknowledged",
    "title": "Connectors — Notion connector: API response errors",
    "summary": "Connectors: the Notion connector (connectors-py) is failing to connect to the Notion API, causing all Notion connector syncs to fail. Users running Notion connector syncs will see failed connector runs with no data ingested. The failure is ongoing — confirmed active as of 23:16Z, persisting since onset at 18:30Z (~5 hours). Verify Notion API reachability and connector credentials; restart the affected agentless pod if credentials are confirmed valid.",
    "criticality": 50,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify Notion API reachability from the agentless pod: identify the affected pod with `kubectl get pods -n <project-namespace> | grep agentless` and exec into it with `kubectl exec -it <pod> -n <project-namespace> -- curl -I https://api.notion.com` to confirm network egress to Notion is functional.",
      "Check and rotate the Notion integration API token: in Kibana Fleet, navigate to the Notion connector configuration and re-enter a valid Notion integration token. Confirm the token has not expired or been revoked in the Notion workspace settings.",
      "If Notion API is reachable and credentials are valid, restart the affected agentless connector pod to clear any transient connection state: `kubectl rollout restart deployment/<agentless-deployment-name> -n <project-namespace>`."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors (connectors-py) is erroring because it cannot connect to the Notion API, producing Notion API response errors (confirmed by connectors log message \"Error while connecting to Notion.\" during the alert window)."
  },
  {
    "event_id": "643e7073-576b-4d85-bdc9-93c4e7b0941d",
    "timestamp": "2026-07-14T23:17:54.657Z",
    "created_at": "2026-07-14T23:17:54.657Z",
    "discovery_id": "34b2bc19-42a4-5964-bc46-55191291dc2c-806b3a39-e22c-4d16-81bd-8d3fbe9a28c8",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-95748bea",
    "status": "acknowledged",
    "title": "Okta — developer org: deactivation error (E0000260)",
    "summary": "Okta integration: requests are failing with error E0000260 (developer org deactivated) in the agentless logging pipeline (GCP us-central1). Users relying on this Okta developer org for auth or integration flows are affected. The failure is ongoing — confirmed active as of 23:16Z, with the signal persisting since onset at 18:30Z (~5 hours). Validate the Okta developer org status and confirm the org/tenant used by the integration is active and not deactivated.",
    "criticality": 55,
    "confidence": 0.63,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Okta developer org status: log in to the Okta admin console for the affected org and verify the org is active (not deactivated or suspended). Navigate to Settings > Account to confirm org status.",
      "Rotate or re-authorize the Okta integration credentials: in the Elastic agentless integration config, re-enter the Okta API token and confirm the token belongs to an active org. Use `kubectl get pods -n <project-namespace> | grep agentless` to identify the affected pod, then `kubectl logs <pod> -n <project-namespace> | grep E0000260` to confirm the error scope.",
      "If the developer org is confirmed deactivated, update the integration to point to an active Okta org: edit the integration policy in Kibana Fleet (Settings > Integrations > Okta) and replace the org URL and API token with credentials from an active org."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "063dc07f-af13-47a2-965c-0655f764501f",
    "timestamp": "2026-07-14T23:12:55.341Z",
    "created_at": "2026-07-14T23:12:55.341Z",
    "discovery_id": "agentless-api-secrets-dip-20260714",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__app-secrets-or-config-object-creation-77c7bf44",
    "status": "acknowledged",
    "title": "Agentless API — secrets/config creation: event dip",
    "summary": "Agentless API: dip in app secrets and config object creation events since ~2026-07-14T22:00Z. The agentless-api stream is alive (20,094 events since onset) but no \"Creating app secrets\" or \"Creating app config object\" log entries have been produced since the dip began. A dip change type indicates the service went silent on this specific provisioning activity. New agentless deployments requiring secrets or config provisioning may be stalled or silently failing. No exposed dependency edges are mapped. Investigate agentless-api pod logs for provisioning errors and verify deployment health.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "App Secrets or Config Object Creation"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless-api pod logs for provisioning errors: kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --since=2h | grep -i 'secret\\|config\\|error\\|fail' to identify why creation events stopped.",
      "Verify agentless-api deployment health and replica count: kubectl get deployment agentless-api -n agentless-api -o wide and kubectl rollout status deployment/agentless-api -n agentless-api.",
      "If a recent rollout is suspected, check deployment history and roll back if needed: kubectl rollout history deployment/agentless-api -n agentless-api and kubectl rollout undo deployment/agentless-api -n agentless-api if the latest revision correlates with the 22:00Z onset."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "9b4645cf-bef4-4334-b9fa-bb7d5e28afb1",
    "timestamp": "2026-07-14T23:12:25.157Z",
    "created_at": "2026-07-14T23:12:25.157Z",
    "discovery_id": "connectors-ssh-step-20260714",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-c8170ad0",
    "status": "acknowledged",
    "title": "Connectors — SSH: connection failures",
    "summary": "Connectors SSH connection failure step-change detected since ~2026-07-14T21:30Z. Agentless connector pods are emitting evaluation failure messages matching the SSH connection error filter, but the specific SSH error signature (handshake/auth/timeout/connection refused) could not be confirmed due to a schema mismatch on the body.text field — the stream uses the message field instead. The step-change signal is statistically strong (p_value 4.1e-10) and persists to the current time (most recent matching row at 23:10:07Z). No dependency edges or exposed services are mapped. SSH-based connector sync jobs may be silently failing for affected integrations. Investigate connector pod logs directly for SSH error details and verify the error.message field schema in this stream.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check connector pod logs directly: kubectl logs -n <project-namespace> -l component.type=connectors-py --since=2h | grep -i 'ssh\\|connect\\|failed' to identify the specific SSH error and affected connector IDs.",
      "Verify SSH target reachability from the connector pod: kubectl exec -n <project-namespace> <connector-pod> -- nc -zv <ssh-host> 22 to confirm network path is open.",
      "If SSH credentials are the cause, rotate and re-apply the connector SSH key via the Kibana Connectors UI: navigate to Stack Management → Connectors, locate the affected SSH connector, and update credentials."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "e7ed5f48-d963-4913-b6cb-f117c8738a91",
    "timestamp": "2026-07-14T22:43:34.900Z",
    "created_at": "2026-07-14T22:43:34.900Z",
    "discovery_id": "27ea47cb-0703-46b9-b677-5bbe34e97f86",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-c2671cbb",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — startup: seccomp policy duplicate-registration panic",
    "summary": "Agentless Heartbeat/Synthetics (logging-gcp-us-central1) is crashing on every spawned component startup due to a duplicate seccomp policy registration panic. Agentless synthetics checks in the GCP us-central1 region are affected; no exposed downstream services identified. The panic is stationary and ongoing — most recent occurrence confirmed at 2026-07-14T22:42:43Z, ~1.5 hours after initial onset at 21:00:07Z. Triage the seccomp policy initialization path in the heartbeat agentless component to prevent duplicate registration on spawn.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Agentless Unit Spawn Fatal Error",
      "Go Panic in Agentless Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the last deployment to the agentless heartbeat component in GCP us-central1 and roll it back: `kubectl rollout undo deployment/heartbeat-agentless -n elastic-agent --context=gcp-us-central1`",
      "If rollback is not immediately available, cordon the affected agentless node to stop new spawns: `kubectl cordon <node-name> --context=gcp-us-central1` and drain existing pods: `kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --context=gcp-us-central1`",
      "Pin the heartbeat image to the last known-good tag in the deployment manifest and re-apply: `kubectl set image deployment/heartbeat-agentless heartbeat=<last-good-image-tag> -n elastic-agent --context=gcp-us-central1`"
    ],
    "dependency_edges": [],
    "root_cause": "Heartbeat/Synthetics agentless component is failing because the seccomp policy registration in `heartbeat/security/seccomp.go:MustRegisterPolicy` is called twice during component initialization (`InitializeModule` → `mustConfigureSeccompPolicy`), causing a panic that terminates every spawned component and closes its stats unix socket."
  },
  {
    "event_id": "0d17247b-b31d-49d1-8e54-ce87303a650b",
    "timestamp": "2026-07-14T21:57:53.147Z",
    "created_at": "2026-07-14T21:57:53.147Z",
    "discovery_id": "3f81c6e4-f338-554b-806d-73fbf7439a89-de04636b-4c84-4f61-b95e-2d39c90ac7a0",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-ea03446e",
    "status": "acknowledged",
    "title": "Agentless API — O365 DLP ingestion: AF10001 permission error on subscription start",
    "summary": "O365 DLP ingestion: subscription start requests are failing with AF10001 permission errors, blocking O365 audit data collection for DLP.All. Affects agentless O365 integration pipelines; no user-facing services are directly exposed. Failure onset ~2026-07-14T20:00Z, confirmed still active at 21:54Z (1m 26s before review). Restore the missing O365 ActivityFeed API permission and admin consent on the Azure AD app registration.",
    "criticality": 40,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and restore the O365 application registration permissions: in Azure AD, navigate to the app registration used by the agentless O365 integration, confirm 'ActivityFeed.Read' (or equivalent) API permission is granted and admin-consented, then re-run `kubectl rollout restart deployment/<agentless-o365-deployment> -n <namespace>` to trigger a fresh subscription start.",
      "If the permission grant is blocked pending approval, temporarily disable the O365 DLP integration policy in Fleet to stop repeated 401 errors: `curl -X PUT <fleet-url>/api/fleet/agent_policies/<policy-id> -H 'kbn-xsrf: true' -d '{\"is_managed\": false}'` and re-enable once permissions are restored.",
      "Check for recent Azure AD permission revocations or tenant policy changes that may have removed the ActivityFeed consent: review the Azure AD audit log for the app registration in the last 24h via `az monitor activity-log list --resource-group <rg> --start-time 2026-07-14T20:00:00Z`."
    ],
    "dependency_edges": [],
    "root_cause": "O365 audit subscription start is failing because the permission set in the request is missing the expected permission, causing the O365 /activity/feed/subscriptions/start call to return 401 Unauthorized with AF10001."
  },
  {
    "event_id": "df3dfc24-e90f-4ebf-8e35-4f10768f2881",
    "timestamp": "2026-07-14T21:47:50.891Z",
    "created_at": "2026-07-14T21:47:50.891Z",
    "discovery_id": "uiam-svc-errors-20260714",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-a30a0836",
    "status": "acknowledged",
    "title": "UIAM — runtime: entropy source stuck error",
    "summary": "UIAM is logging persistent errors with \"entropy source stuck\" starting at 20:25Z, still active at 21:38Z (73+ minutes). This indicates the service's RNG/entropy pool is exhausted or blocked, which can impair cryptographic operations including token generation and session management. No exposed dependency edges are present; user-facing auth impact is possible but not confirmed. Validate entropy availability on UIAM pods and consider restarting to nodes with healthy entropy sources.",
    "criticality": 20,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "kubectl exec -n <uiam-namespace> -it <uiam-pod> -- cat /proc/sys/kernel/random/entropy_avail to check current entropy pool level on the affected pod",
      "kubectl get pods -n <uiam-namespace> -l app=uiam -o wide to identify which nodes are running UIAM and check for entropy starvation across the fleet",
      "kubectl rollout restart deployment/<uiam-deployment> -n <uiam-namespace> to cycle pods to nodes with healthy entropy sources if entropy_avail is critically low (< 256)"
    ],
    "dependency_edges": [],
    "root_cause": "UIAM is erroring because its entropy source is stuck, preventing normal operation where secure randomness is required (confirmed by error log line at onset; condition persists 73+ minutes later)."
  },
  {
    "event_id": "ee67feac-3e24-4182-87f6-f6aee1b11df7",
    "timestamp": "2026-07-14T21:47:18.130Z",
    "created_at": "2026-07-14T21:47:18.130Z",
    "discovery_id": "es-controller-warn-20260714",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-3c44204d",
    "status": "acknowledged",
    "title": "Elasticsearch controller — control plane: errors/warnings detected",
    "summary": "Elasticsearch controller is emitting error/warning-level logs that are still active as of 21:46Z. The error message content is not retrievable due to a field mapping gap (body.text absent), so the specific failure mechanism cannot be confirmed. No exposed dependency edges; blast radius is limited to internal cluster automation. Investigate the elasticsearch-controller pod logs directly to identify the error signature and determine whether cluster management operations are impaired.",
    "criticality": 15,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "kubectl logs -n <elasticsearch-controller-namespace> -l app=elasticsearch-controller --tail=100 --since=30m to retrieve the actual error message and identify the failure mechanism",
      "kubectl get events -n <elasticsearch-controller-namespace> --sort-by=.lastTimestamp | tail -20 to check for recent Kubernetes-level controller events",
      "kubectl describe pod -n <elasticsearch-controller-namespace> -l app=elasticsearch-controller to check pod health and restart counts"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "78ca9206-0a3a-47dd-9277-4a3da9ee4eb2",
    "timestamp": "2026-07-14T21:41:11.428Z",
    "created_at": "2026-07-14T21:41:11.428Z",
    "discovery_id": "disc-aws-otel-missing-creds-20260714t2000",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-cd4f4c25",
    "status": "acknowledged",
    "title": "Agentless AWS OTel collector — awscredentialsprovider: missing credentials configuration",
    "summary": "AWS CloudWatch OTel collector (agentless): all AWS-targeted collector paths (SQS, EC2, ECS, ELB, Lambda, RDS) are failing to start because no credentials, assume_role, or profile are configured in awscredentialsprovider. Affects agentless AWS CloudWatch data collection across multiple integration targets; no user-facing services are exposed. Failure is active and in a persistent crash-restart loop as of 21:40Z. Update the AWS integration policy to supply valid credentials, an IAM assume_role ARN, or a named profile so the collector can initialize.",
    "criticality": 45,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In the Elastic Fleet UI, navigate to the affected AWS integration policy and add valid AWS credentials (access key + secret), an IAM role ARN under assume_role, or a named profile — then save and redeploy the policy to restart the agentless collector.",
      "If using IAM role assumption, verify the agentless pod's service account has sts:AssumeRole permission for the target role: `kubectl describe serviceaccount -n <agentless-namespace> <sa-name>` and confirm the role trust policy allows the pod identity.",
      "If credentials were recently rotated or the integration was newly provisioned without credentials, re-enter the AWS Access Key ID and Secret Access Key in the integration settings and trigger a policy re-apply via `elastic-agent inspect` or Fleet UI force-redeploy."
    ],
    "dependency_edges": [],
    "root_cause": "AWS CloudWatch input OTel collector is failing because awscredentialsprovider has no credentials, assume_role, or profile configured, causing startup validation failure across all AWS-targeted collector paths (SQS, EC2, ECS, ELB, Lambda, RDS)."
  },
  {
    "event_id": "0da10228-eed6-49c5-90c7-c15ce85bfce9",
    "timestamp": "2026-07-14T21:19:28.692Z",
    "created_at": "2026-07-14T21:19:28.692Z",
    "discovery_id": "disc-agentless-api-20260714T211105Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__agentless-deployment-deletion-591f10c7",
    "status": "acknowledged",
    "title": "Agentless API — provisioning: namespace collision prevents deployment creation",
    "summary": "Agentless API is returning \"Namespace already exists\" errors during serverless deployment provisioning, blocking new deployment creation via the Kibana → Agentless API path. Users attempting to create serverless security projects through Kibana are affected. The namespace collision error was last confirmed at 21:11Z with deletion activity still present at 21:13Z; the provisioner appears stuck with leaked or duplicate namespace state. The signal is stationary (p_value=0) indicating a persistent, ongoing condition rather than a transient spike. Immediate action: inspect the Kubernetes namespace state in the agentless provisioner for orphaned or duplicate namespaces and clear any stuck deployment records.",
    "criticality": 45,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Agentless Deployment Deletion",
      "Namespace Already Exists During Provisioning"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Run `kubectl get namespaces -A | grep agentless` on each GCP cluster (prd-gcpusc1-cp-app-1 through cp-app-5, cp-internal-app-1) to identify orphaned or duplicate namespaces, then delete stale ones with `kubectl delete namespace <name>`.",
      "Check the agentless-api provisioner logs for the specific deployment ID causing the collision: `kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --since=2h | grep 'Namespace already exists'` and cross-reference with the deployment records in the API database.",
      "If a specific stuck deployment record is identified, force-delete it via the Agentless API admin endpoint or directly from the backing store to unblock the provisioner path."
    ],
    "dependency_edges": [
      {
        "source": "kibana",
        "target": "agentless-api",
        "protocol": "https",
        "exposure": "exposed"
      }
    ],
    "root_cause": "Agentless API provisioning is failing because the Kubernetes namespace for a requested deployment already exists, causing a name-collision error during deployment creation — likely due to a leaked or incompletely cleaned-up namespace from a prior failed or deleted deployment."
  },
  {
    "event_id": "537890fc-b115-47bc-a713-c78f691b5f58",
    "timestamp": "2026-07-14T20:56:42.297Z",
    "created_at": "2026-07-14T20:56:42.297Z",
    "discovery_id": "7a28c589-400e-4f5a-825a-4a373425e779",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-c892202d",
    "status": "acknowledged",
    "title": "UIAM — service runtime: entropy source stuck errors",
    "summary": "UIAM is emitting 'entropy source stuck' errors, indicating the service cannot generate random numbers required for auth/identity operations. All users and services depending on UIAM for authentication may be affected. Onset at ~20:50Z with a trend_change (p≈0.0005); most recent error confirmed at 20:53Z — failure is active and not recovering. Immediate action: check UIAM host/pod entropy availability and restart the service or provision a software entropy source.",
    "criticality": 60,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM host/pod entropy availability: run `kubectl exec -n <uiam-namespace> <uiam-pod> -- cat /proc/sys/kernel/random/entropy_avail` to confirm entropy pool depletion.",
      "If entropy is depleted, install or enable a software entropy source on the UIAM host: `kubectl exec -n <uiam-namespace> <uiam-pod> -- apt-get install -y haveged && systemctl start haveged` (or equivalent for the container runtime).",
      "If the entropy device is blocked or misconfigured, restart the UIAM service to force re-initialization: `kubectl rollout restart deployment/uiam -n <uiam-namespace>` and monitor error rate via `kubectl logs -n <uiam-namespace> -l app=uiam --since=5m`."
    ],
    "dependency_edges": [],
    "root_cause": "UIAM is erroring because its entropy source is stuck, preventing required random number generation."
  },
  {
    "event_id": "4f2f72d0-5a2c-4819-b1f8-b90a1622195f",
    "timestamp": "2026-07-14T20:30:14.436Z",
    "created_at": "2026-07-14T20:30:14.436Z",
    "discovery_id": "065acb06-bacd-478a-9206-cbe15e115f45",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-7114763a",
    "status": "acknowledged",
    "title": "Cloudbeat agentless logging — credentials config: invalid credentials JSON/configuration error",
    "summary": "Cloudbeat agentless logging: invalid GCP credentials JSON is causing the cloudbeat process to exit on startup. The affected agentless log collector cannot initialize its GCP configuration and is failing to start. Confirmed active at review time (20:27Z); stationary detection indicates this has been a persistent condition. Schedule a fix: validate and replace the malformed or missing GCP credentials JSON secret for the affected cloudbeat deployment.",
    "criticality": 30,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected cloudbeat agentless deployment: run `kubectl get pods -n <agentless-namespace> | grep cloudbeat` on the affected GKE cluster (prd-gcpusc1-cp-*) and check pod logs with `kubectl logs <pod-name> -n <namespace> | grep 'invalid credentials'`.",
      "Validate the GCP credentials JSON secret mounted in the affected pod: run `kubectl get secret <credentials-secret-name> -n <namespace> -o jsonpath='{.data.credentials}' | base64 -d | python3 -m json.tool` to verify the JSON is well-formed and contains required fields.",
      "If the credentials JSON is malformed or missing, update the secret with a valid service account key: `kubectl create secret generic <credentials-secret-name> --from-file=credentials.json=<valid-key-file> -n <namespace> --dry-run=client -o yaml | kubectl apply -f -`, then restart the affected pod with `kubectl rollout restart deployment/<agentless-deployment-name> -n <namespace>`."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "305602a3-56eb-4de7-801c-9cd9b95646c7",
    "timestamp": "2026-07-14T20:29:46.812Z",
    "created_at": "2026-07-14T20:29:46.812Z",
    "discovery_id": "9d834d77-0160-4c1f-9444-8a59d536427b",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__namespace-already-exists-during-provisio-1452b36b",
    "status": "acknowledged",
    "title": "Agentless provisioning API — namespace creation: namespace already exists",
    "summary": "Agentless provisioning API: namespace conflict errors are occurring during provisioning workflows. Provisioning attempts that create a new Kubernetes namespace are failing when the namespace already exists. Confirmed active as of 20:26Z; trend_change detection indicates a growing rate of occurrence. Schedule a fix: identify and remove stale conflicting namespaces or add idempotent namespace creation logic to the provisioning handler.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Namespace Already Exists During Provisioning"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the conflicting namespace: run `kubectl get namespaces | grep <agentless-project-prefix>` on the affected GKE cluster (prd-gcpusc1-cp-*) to list existing namespaces and find the duplicate.",
      "If the namespace is stale (no active workloads), delete it: `kubectl delete namespace <conflicting-namespace>` to unblock provisioning retries.",
      "If the namespace is in use, update the provisioning logic to use `kubectl apply` with idempotent namespace creation (add `--dry-run=client` check first) or add a pre-flight existence check in the agentless-api provisioning handler."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "ff3ef35c-fbc6-49d0-8771-cb5da4b31a7e",
    "timestamp": "2026-07-14T20:17:42.083Z",
    "created_at": "2026-07-14T20:17:42.083Z",
    "discovery_id": "agentless-seccomp-2026-07-14T20:10:59Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-c995cb39",
    "status": "acknowledged",
    "title": "Agentless runtime — component startup: seccomp policy already registered panic",
    "summary": "Agentless-managed Heartbeat/Synthetics and CEL components are crash-looping on startup in logging-gcp-us-central1-logs-agentless-log-default. Every spawn attempt panics with \"a seccomp policy is already registered\" during `heartbeat/security.InitializeModule()`, causing the stats endpoint socket to close and the unit to exit fatally — the agent then retries on a ~5s backoff, repeating indefinitely. Failure has been continuous since at least 2026-07-14T19:00Z and was confirmed still active at 20:16:28Z. Synthetic monitoring checks cannot execute while this crash loop persists. Immediate action: identify and roll back the beats library commit (v7.0.0-alpha2.0.20260710190233-00068f79631b) that introduced the duplicate seccomp registration in the Heartbeat receiver factory path.",
    "criticality": 45,
    "confidence": 0.82,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Go Panic in Agentless Component",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the beats library to the last known-good version before 2026-07-10: update the elastic-agent go.mod to pin `github.com/elastic/beats/v7` to the commit prior to `00068f79631b`, then run `go mod tidy && make build` and redeploy the agentless collector image.",
      "If rollback is not immediately available, disable the Heartbeat/Synthetics receiver in the agentless OTel collector config to stop the crash loop: `kubectl edit configmap agentless-collector-config -n agentless` and remove or comment out the `heartbeat` receiver block, then `kubectl rollout restart deployment/agentless-collector -n agentless`.",
      "Verify recovery by tailing the agentless log stream: `kubectl logs -f -l app=agentless-collector -n agentless | grep -E '(Spawned|panic|seccomp)'` — absence of panic lines for 2+ minutes confirms the crash loop has stopped."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed Heartbeat/Synthetics components are crashing on every startup because `heartbeat/security.InitializeModule()` calls `seccomp.MustRegisterPolicy()` a second time after it was already registered during `libbeat/cmd/instance.NewBeat()`, triggering a Go panic and causing the spawned unit to exit fatally."
  },
  {
    "event_id": "d3910e0c-0a2c-456c-9713-643251458ba5",
    "timestamp": "2026-07-14T19:42:14.370Z",
    "created_at": "2026-07-14T19:42:14.370Z",
    "discovery_id": "disc-libbeat-output-latency-read-errors-20260714t1830",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-read-errors-346d2953",
    "status": "acknowledged",
    "title": "Agentless logging pipeline — output to Elasticsearch: read errors and high write latency",
    "summary": "Agentless logging pipeline: libbeat output to Elasticsearch is degraded with non-zero read errors and write latency p99 exceeding 5s. The internal log→Elasticsearch path is experiencing backpressure or connectivity issues. Both signals began ~2026-07-14T18:30Z and are confirmed still active as of 19:40Z. Check Elasticsearch cluster health and network connectivity from the agentless log component.",
    "criticality": 45,
    "confidence": 0.63,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Read Errors",
      "Libbeat Output Write Latency Spike"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Elasticsearch cluster health: `curl -u elastic:<password> https://<es-host>/_cluster/health?pretty` — look for red/yellow status, high JVM heap, or rejected indexing requests.",
      "Inspect the agentless pod's network connectivity to Elasticsearch: `kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v https://<es-host>/_cluster/health` to rule out TLS or DNS issues.",
      "If ES is healthy, check libbeat queue depth and consider restarting the affected agentless pod to clear backpressure: `kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>`"
    ],
    "dependency_edges": [
      {
        "source": "log",
        "target": "elasticsearch",
        "protocol": "https",
        "exposure": "internal"
      }
    ]
  },
  {
    "event_id": "ad315914-8ab1-48c5-854e-dcc7b41e8c59",
    "timestamp": "2026-07-14T19:41:41.015Z",
    "created_at": "2026-07-14T19:41:41.015Z",
    "discovery_id": "disc-cel-unsupported-protocol-scheme-20260714t1830",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsup-d35c3bdb",
    "status": "acknowledged",
    "title": "Agentless CEL — input URL: unsupported protocol scheme",
    "summary": "Agentless CEL integration: one or more CEL/HTTPJSON inputs are failing to fetch from their configured endpoints due to a missing or invalid protocol scheme in the integration URL. Affected integrations have stopped collecting data. The failure began ~2026-07-14T18:30Z and is confirmed still active as of 19:40Z. Locate and correct the misconfigured integration URL(s) in Fleet to restore collection.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In Fleet UI, navigate to the affected CEL or HTTPJSON integration policy and correct the input URL to include a valid scheme (e.g., https://). Save and redeploy the policy to restart the input.",
      "Run `kubectl logs -n <agentless-namespace> <agentless-pod> | grep 'unsupported protocol scheme'` to identify which pod and integration ID is affected, then target that specific policy for correction.",
      "After correcting the URL, verify recovery by checking that new documents appear in the stream: `FROM $.logging-gcp-us-central1-logs-agentless-log-default | WHERE @timestamp >= now-5m | STATS COUNT(*)`"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "7ece1fdd-c45a-49b2-b92e-7acdb6e0d816",
    "timestamp": "2026-07-14T19:34:19.260Z",
    "created_at": "2026-07-14T19:34:19.260Z",
    "discovery_id": "disc-connectors-seccomp-panic-20260714T1930",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-log-default__connectors-ssh-connection-failure-20260714t1930",
    "status": "acknowledged",
    "title": "Connectors — SSH: runtime panic causing connection failures",
    "summary": "Connectors SSH runtime is crash-looping due to a seccomp policy double-registration panic in the heartbeat receiver. Users running SSH-based connectors cannot establish connections. Onset confirmed at 2026-07-14T19:31Z; panic rows still appearing as of 19:33Z with no sign of recovery. Investigate the connector runtime deployment for a duplicate seccomp policy registration — likely triggered by a recent build or restart of the agentless connector process.",
    "criticality": 60,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the agentless connector deployment to the previous build: kubectl rollout undo deployment/agentless-connector -n <connector-namespace>",
      "If rollback is not immediately available, cordon the affected agentless node and reschedule connector pods: kubectl cordon <node> && kubectl delete pod -l app=agentless-connector -n <connector-namespace>",
      "Check for duplicate seccomp policy registration in the heartbeat security module: kubectl logs -l app=agentless-connector -n <connector-namespace> --since=10m | grep -i seccomp"
    ],
    "dependency_edges": [],
    "root_cause": "Connectors SSH is failing because the agentless connector runtime (heartbeat/libbeat seccomp module) panics on startup with 'a seccomp policy is already registered', crashing the process before SSH connectivity can be established."
  },
  {
    "event_id": "601785fa-582c-4b70-bb5e-0268ffee41d6",
    "timestamp": "2026-07-14T19:13:16.986Z",
    "created_at": "2026-07-14T19:13:16.986Z",
    "discovery_id": "disc-e6bd56b2-cf91",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__seccomp-policy-conflict-in-heartbeat-syn-28be6911",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — seccomp: policy already registered panic",
    "summary": "Agentless synthetics and CEL components are crashing on startup with a seccomp policy double-registration panic. Multiple units (synthetics/http, synthetics/tcp, cel-es-default-output-internal) are failing to start because the agentless metrics Unix socket closes and the heartbeat receiver then panics when attempting to register a seccomp policy that is already registered. Failures confirmed active as of 19:12:20Z across the agentless_hello_world workload; no exposed user-facing dependency edges. Assign to the agentless/heartbeat team to investigate duplicate seccomp initialization in the OTel collector startup path.",
    "criticality": 40,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restart the affected agentless pods to clear the stuck seccomp state: kubectl rollout restart deployment -n agentless -l k8s.elastic.co/agentless-integration-name=agentless_hello_world",
      "Check for duplicate heartbeat receiver initialization in the OTel collector startup sequence: kubectl logs -n agentless -l component.id=cel-es-default-output-internal --since=30m | grep -E 'seccomp|MustRegisterPolicy'",
      "Pin the agentless_hello_world integration to a known-good version or roll back the most recent heartbeat package update: kubectl set image deployment/<agentless-deployment> heartbeat=<previous-image-tag> -n agentless"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless heartbeat/CEL receiver components are crashing because the agentless metrics Unix socket closes before the OTel collector finishes initializing, causing the heartbeat receiver to call MustRegisterPolicy a second time on restart — panicking because a seccomp policy is already registered from the first initialization attempt."
  },
  {
    "event_id": "fab2f587-f8c8-4239-b455-61db33ec99c2",
    "timestamp": "2026-07-14T19:07:57.826Z",
    "created_at": "2026-07-14T19:07:57.826Z",
    "discovery_id": "1c875a9c-5a92-4c39-a026-61ee4ca41398",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated--e0000260-7d6130e8",
    "status": "acknowledged",
    "title": "Okta integration — auth: developer org deactivated (E0000260)",
    "summary": "Okta integration is failing with E0000260 (Developer Org Deactivated), blocking all Okta API authentication for the affected connector. Affects Okta connector/auth flows (internal ingestion). Errors confirmed active as recently as 19:05Z with a sustained step_change signal since ~18:50Z — no recovery. This incident may also be the root cause of the concurrent OAuth 403 failures. Re-activate or migrate the Okta org and update integration credentials immediately.",
    "criticality": 55,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Re-activate the Okta Developer Org via the Okta Admin Console: log in to developer.okta.com as an org admin and check the org status under Settings > Account; contact Okta support if the org cannot be self-reactivated.",
      "If re-activation is not possible, migrate the integration to a non-developer Okta org: update the integration credentials (API token and base URL) in the connector configuration to point to a production Okta org.",
      "Update the Okta integration API token after org re-activation: `kubectl edit secret okta-integration-credentials -n agentless` and replace the token value, then restart the connector pod with `kubectl rollout restart deployment/okta-connector -n agentless`."
    ],
    "dependency_edges": [],
    "root_cause": "Okta integration is failing because the Okta Developer Org backing this integration is deactivated (E0000260), so Okta rejects API requests and authentication cannot proceed."
  },
  {
    "event_id": "049904a4-6547-4c39-a854-0535fb61b202",
    "timestamp": "2026-07-14T19:07:30.280Z",
    "created_at": "2026-07-14T19:07:30.280Z",
    "discovery_id": "70e6691d-8430-4aed-b009-51b0b3ea80f0",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbidden-0038af5c",
    "status": "acknowledged",
    "title": "Integration OAuth — token endpoint: 403 forbidden",
    "summary": "Integration OAuth token fetch is returning 403 Forbidden, blocking OAuth-dependent integrations from refreshing tokens. Affects internal auth paths; no confirmed user-facing exposed services. Errors confirmed active as recently as 19:05Z with a trend_change signal (growing failure rate since ~18:50Z). Possible causal link to the concurrent Okta Developer Org deactivation (E0000260) — investigate that incident first. Identify the specific OAuth provider/tenant returning 403 and verify client credentials and access policies.",
    "criticality": 50,
    "confidence": 0.48,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify which OAuth provider/tenant is returning 403 by inspecting full error.message fields: `kubectl logs -n agentless -l component=agentless --since=1h | grep -E 'oauth2.*403|403.*oauth2'` to extract provider URLs and client IDs.",
      "Verify OAuth client credentials and scopes have not expired or been revoked for the affected integration: check the integration's OAuth app configuration in the provider's admin console (e.g. Google Cloud Console, Azure AD, or Okta) for credential expiry or policy changes.",
      "If the Okta Developer Org deactivation (E0000260) is the root cause of these 403s, prioritize resolving that incident first — re-activating or migrating the Okta org may clear these OAuth failures."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "d5d6b529-fac5-4e18-aaff-31f2adee5d06",
    "timestamp": "2026-07-14T19:06:59.685Z",
    "created_at": "2026-07-14T19:06:59.685Z",
    "discovery_id": "disc-76cc20f4-20260714T190057Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-112b91e9",
    "status": "acknowledged",
    "title": "elasticsearch-controller — autoscaler reconcile: warnings/errors emitted",
    "summary": "elasticsearch-controller is emitting errors and warnings during ElasticsearchAutoscaler reconciliation. Affects the Elasticsearch autoscaling control plane; tier scaling decisions may be delayed or impaired across serverless projects. Errors confirmed active as recently as 19:01Z with no recovery signal. Review controller logs for NoLimitedTier condition details and inspect affected ElasticsearchAutoscaler resources.",
    "criticality": 25,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check elasticsearch-controller logs for the specific autoscaler condition: `kubectl logs -n elasticsearch-autoscaler -l app=elasticsearch-controller --since=1h | grep -E 'error|warning|NoLimitedTier|Limited'` to identify affected ElasticsearchAutoscaler resources.",
      "Inspect ElasticsearchAutoscaler resources for Limited/NoLimitedTier conditions: `kubectl get elasticsearchautoscaler -A -o json | jq '.items[] | select(.status.conditions[]?.reason==\"NoLimitedTier\") | .metadata.name'`.",
      "If a specific autoscaler is stuck, force a reconcile by annotating it: `kubectl annotate elasticsearchautoscaler <name> -n <ns> reconcile-trigger=$(date +%s) --overwrite`."
    ],
    "dependency_edges": [],
    "root_cause": "elasticsearch-controller is erroring because ElasticsearchAutoscaler reconciliation is hitting a Limited condition (condition.reason=NoLimitedTier) during tier scaling decisions."
  },
  {
    "event_id": "9a50e105-2ffd-4a43-839b-392678067844",
    "timestamp": "2026-07-14T19:06:30.806Z",
    "created_at": "2026-07-14T19:06:30.806Z",
    "discovery_id": "disc-agentless-api-20260714T190057Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__agentless-deployment-deletion-3ed7e950",
    "status": "acknowledged",
    "title": "agentless-api — provisioning workflow: namespace collision triggers cleanup deletion",
    "summary": "agentless-api is experiencing repeated Kubernetes namespace collisions during provisioning, triggering agentless deployment deletion as cleanup. Affects users creating agentless deployments — provisioning may fail or be delayed due to retries and cleanup cycles. Errors confirmed active as recently as 19:03Z (deletion) and 19:01Z (namespace collision), with no recovery signal. Investigate namespace lifecycle idempotency and concurrency controls; check for stuck or orphaned namespaces blocking re-provisioning.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Namespace Already Exists During Provisioning",
      "Agentless Deployment Deletion"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check for orphaned or stuck Kubernetes namespaces in the agentless-api provisioning clusters: `kubectl get namespaces -A | grep project-` and identify any in Terminating state blocking re-use.",
      "Review agentless-api provisioning concurrency controls and idempotency guards: `kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --since=1h | grep -E 'Namespace already exists|Deleting agentless'` to assess frequency and affected deployment IDs.",
      "If a specific namespace is stuck Terminating, force-finalize it: `kubectl patch namespace <stuck-ns> -p '{\"metadata\":{\"finalizers\":[]}}' --type=merge` to unblock provisioning retries."
    ],
    "dependency_edges": [],
    "root_cause": "agentless-api provisioning is failing because a target Kubernetes namespace already exists from a prior or concurrent provisioning attempt, causing the workflow to abort and trigger deployment cleanup/deletion."
  },
  {
    "event_id": "882e294a-6dae-4fbb-a466-c24ca0e19ff4",
    "timestamp": "2026-07-14T18:50:09.666Z",
    "created_at": "2026-07-14T18:50:09.666Z",
    "discovery_id": "abf5d921-ed06-4d34-919b-6d57ac7091cc",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__component-state-transitioned-to-failed-component-6f9c87d1",
    "status": "acknowledged",
    "title": "Agentless runtime — cloudbeat/cis_gcp: component enters FAILED (exit code 1)",
    "summary": "Cloudbeat CSPM (cloudbeat/cis_gcp) is repeatedly entering FAILED state on the agentless runtime in GCP us-central1. The supervised process exits with code 1, causing both unit.state and component.state to transition to FAILED. Impact is limited to internal agentless CSPM scanning — no user-facing services are exposed. Failure onset ~17:00Z 2026-07-14; confirmed still active at 18:49Z (most recent FAILED event). A co-occurring CEL retryable HTTP failure signal is present but inconclusive as a root cause. Assign to the cloud-security-posture team to investigate the cloudbeat/cis_gcp process exit reason and restore scanning.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check cloudbeat/cis_gcp process exit logs for the specific error: `kubectl logs -n <project-namespace> <agentless-pod> -c agentless --since=2h | grep -E 'cis_gcp|exit|FAILED|error'` — identify whether the exit is due to a credential/auth failure, config error, or runtime panic.",
      "If a credential or GCP service account issue is suspected, rotate or re-issue the GCP workload identity credentials for the affected agentless deployment: `kubectl rollout restart deployment agentless-<policy-id> -n <project-namespace>`",
      "If the issue persists after restart, check the CEL retryable HTTP failure for upstream API connectivity: verify GCP API reachability from the agentless pod and confirm the integration config is valid in Fleet/Kibana for the cloudbeat/cis_gcp policy."
    ],
    "dependency_edges": [
      {
        "source": "cloudbeat",
        "target": "agentless",
        "protocol": "internal",
        "exposure": "internal"
      },
      {
        "source": "cloudbeat",
        "target": "elasticsearch",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "Cloudbeat CSPM (cloudbeat/cis_gcp) is failing because the supervised process is exiting with code 1, causing unit.state and component.state to transition to FAILED under the agentless runtime."
  },
  {
    "event_id": "244290e3-27b4-4100-9235-561687ebd4b0",
    "timestamp": "2026-07-14T18:45:16.343Z",
    "created_at": "2026-07-14T18:45:16.343Z",
    "discovery_id": "abf5d921-ed06-4d34-919b-6d57ac7091cc",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-1e823b91",
    "status": "promoted",
    "title": "Agentless synthetics runtime — Heartbeat startup: seccomp policy already registered panic",
    "summary": "Agentless synthetics runtime: every Heartbeat-based synthetics unit (synthetics/http, synthetics/tcp) crashes immediately on spawn with a fatal Go panic — \"seccomp policy is already registered\" — preventing all agentless-managed synthetic monitors from running. Affects all synthetics inputs under agentless_hello_world and any agentless-managed synthetics deployment sharing this runtime. The crash loop has been continuous since onset at ~2026-07-14T17:00:04Z and is confirmed still active at 2026-07-14T18:44:13Z with no sign of recovery. Immediate action: roll back or patch the Heartbeat binary to the last known-good version to stop the seccomp double-registration crash loop.",
    "criticality": 80,
    "confidence": 0.82,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the Heartbeat binary to the previous release: on the agentless runtime host, run `elastic-agent upgrade --version <last-known-good>` or redeploy the agentless container image pinned to the prior Heartbeat version tag to stop the crash loop immediately.",
      "If rollback is not immediately available, disable the affected agentless synthetics inputs to stop the crash loop: `elastic-agent inspect` to identify the unit IDs, then remove or disable the synthetics/http and synthetics/tcp input configurations via Fleet UI or `elastic-agent enroll` with updated policy.",
      "After stabilizing, audit the Heartbeat seccomp initialization path in `heartbeat/security/seccomp.go:MustRegisterPolicy` and `heartbeat/include/list.go:InitializeModule` to identify the duplicate registration call introduced in commit `00068f79631b` (2026-07-10 build)."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed Heartbeat/Synthetics unit spawn is failing because Heartbeat seccomp policy initialization is executed twice, triggering 'panic: a seccomp policy is already registered' and terminating the process during startup."
  },
  {
    "event_id": "752b886f-ba68-4b0a-9e98-65753a609db5",
    "timestamp": "2026-07-14T17:13:16.826Z",
    "created_at": "2026-07-14T17:13:16.826Z",
    "discovery_id": "disc-es-controller-warnings-2026-07-14T17:02:43Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-62cb41d0",
    "status": "acknowledged",
    "title": "elasticsearch-controller — reconciliation: errors/warnings",
    "summary": "elasticsearch-controller: error and warning logs are being emitted during Kubernetes reconciliation of ElasticsearchAutoscaler resources. Affects the Kubernetes control-plane reconciliation loop; no user-facing services exposed. Signal confirmed present as of 17:01 UTC but specific error content could not be retrieved. Inspect controller logs directly to identify the reconciliation error signature.",
    "criticality": 20,
    "confidence": 0.3,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect elasticsearch-controller logs directly for the specific reconciliation error: kubectl logs -n elastic-system -l app=elasticsearch-controller --tail=200 | grep -E 'error|warn|Error|Warning'",
      "Check ElasticsearchAutoscaler resource status for reconciliation failures: kubectl get elasticsearchautoscaler -A -o wide && kubectl describe elasticsearchautoscaler -A | grep -A5 'Conditions'",
      "Review recent changes to ElasticsearchAutoscaler resources or controller deployments: kubectl rollout history deployment/elasticsearch-controller -n elastic-system"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "1a8ae930-d205-4121-aad6-408f2947574a",
    "timestamp": "2026-07-14T17:12:50.873Z",
    "created_at": "2026-07-14T17:12:50.873Z",
    "discovery_id": "disc-cloudbeat-invalid-creds-2026-07-14T17:02:43Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__gcp-invalid-credentials-json-in-cloudbea-c90052b8",
    "status": "acknowledged",
    "title": "Cloudbeat cis_gcp — GCP auth: invalid credentials JSON",
    "summary": "Cloudbeat cis_gcp: the launcher is exiting fatally because the GCP credentials JSON is invalid, halting all GCP security posture (CSPM) scanning. Affects the cloudbeat→gcp internal dependency; no user-facing services exposed. Failure confirmed active as of 17:11 UTC with repeated launcher exits. Validate and re-provision the GCP service account credentials JSON for the affected Cloudbeat integration.",
    "criticality": 35,
    "confidence": 0.78,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Validate the GCP service account credentials JSON currently configured for Cloudbeat cis_gcp: kubectl get secret -n <cloudbeat-namespace> <gcp-credentials-secret> -o jsonpath='{.data.credentials}' | base64 -d | jq .",
      "Re-provision the GCP credentials secret with a valid service account JSON key: kubectl create secret generic <gcp-credentials-secret> --from-file=credentials=<valid-key.json> -n <cloudbeat-namespace> --dry-run=client -o yaml | kubectl apply -f -",
      "Restart the affected Cloudbeat CSPM pod after credentials are corrected: kubectl rollout restart deployment/<cloudbeat-cis-gcp-deployment> -n <cloudbeat-namespace>"
    ],
    "dependency_edges": [
      {
        "source": "cloudbeat",
        "target": "gcp",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "Cloudbeat cis_gcp is failing to start because the GCP credentials JSON supplied to the launcher is invalid or malformed, preventing GCP config initialization and halting all CSPM posture scanning."
  },
  {
    "event_id": "1210a832-5065-4ce6-b6dd-a9066ea41cf5",
    "timestamp": "2026-07-14T17:12:24.173Z",
    "created_at": "2026-07-14T17:12:24.173Z",
    "discovery_id": "disc-agentless-unit-spawn-2026-07-14T17:02:43Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-79650fa6",
    "status": "acknowledged",
    "title": "Agentless logging pipeline — unit spawn: fatal errors",
    "summary": "Agentless platform: synthetics/heartbeat units are crashing on startup with a seccomp policy double-registration panic, causing a persistent crash-restart loop. Affects agentless-managed synthetics/tcp and heartbeat components in logging-gcp-us-central1-logs-agentless-log-default. Failure confirmed active as of 17:11 UTC; no exposed user-facing services. Investigate recent heartbeat/synthetics component deployments for seccomp policy registration conflicts.",
    "criticality": 35,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check for duplicate seccomp policy registration in heartbeat/synthetics: kubectl logs -n <agentless-namespace> -l component=synthetics --tail=100 | grep -i seccomp",
      "Roll back the most recent heartbeat/synthetics component image if a deployment occurred within the last hour: kubectl rollout undo deployment/<synthetics-deployment> -n <agentless-namespace>",
      "Restart affected agentless pods to clear the crash-loop: kubectl delete pod -n <agentless-namespace> -l unit.type=input,component.type=synthetics/tcp"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "483ae264-ae32-4cb2-bc61-b437237b5c35",
    "timestamp": "2026-07-14T16:24:33.264Z",
    "created_at": "2026-07-14T16:24:33.264Z",
    "discovery_id": "disc-agentless-20260714-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__agentless-deployment-deletion-5661e24c",
    "status": "acknowledged",
    "title": "Agentless API — provisioning: namespace collision / cleanup deletion",
    "summary": "Agentless API provisioning is encountering repeated \"Namespace already exists\" errors, with the most recent occurrence at 16:22:30Z (seconds before this review). Deployment deletions are also occurring in the same window (last seen 16:13:22Z). Users attempting to create new agentless environments may experience provisioning failures. The issue is ongoing and stable — no exposed downstream services, no confirmed full outage. Immediate action: inspect for stuck or duplicate agentless environment records and verify the agentless-cleaner job is completing namespace teardown successfully.",
    "criticality": 35,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Agentless Deployment Deletion",
      "Namespace Already Exists During Provisioning"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check for stuck agentless environment records: kubectl get namespaces -A | grep agentless — look for namespaces in Terminating state or duplicates not cleaned up by the agentless-cleaner job.",
      "Inspect the agentless-cleaner job logs for failures: kubectl logs -n agentless-api -l job-name=agentless-cleaner --tail=100 — verify namespace teardown is completing successfully.",
      "If a namespace is stuck in Terminating, force-delete it: kubectl delete namespace <stuck-namespace> --grace-period=0 --force — then re-trigger provisioning for the affected deployment."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless API provisioning is failing because a Kubernetes namespace for the target deployment already exists, causing the provisioning workflow to abort and trigger cleanup/deletion of the conflicting deployment."
  },
  {
    "event_id": "e2bc9fde-abe4-4a84-8503-49f06232f36d",
    "timestamp": "2026-07-14T15:50:12.665Z",
    "created_at": "2026-07-14T15:50:12.665Z",
    "discovery_id": "opslead-20260714-154604Z-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__agentless-deployment-deletion-afc62dc3",
    "status": "acknowledged",
    "title": "Agentless logging — GCP Cloudbeat: invalid credentials causing process exit",
    "summary": "Cloudbeat on the GCP agentless logging pipeline is exiting at startup due to an invalid credentials JSON configuration error, halting GCP security posture data collection. Agentless deployment deletion events are also actively occurring (most recent at 15:48Z). No exposed user-facing dependency edges are present, but GCP cloud security posture scanning is non-functional. Onset confirmed active as of 15:49Z; no sign of recovery. Verify whether the credential configuration was changed intentionally and whether the deployment deletions are planned maintenance.",
    "criticality": 45,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default",
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat",
      "Libbeat Output Write Latency Spike",
      "Agentless Deployment Deletion"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect and repair the GCP credentials JSON for the agentless Cloudbeat deployment: kubectl get secret -n agentless -l app=cloudbeat -o yaml to identify the misconfigured credential secret, then kubectl edit secret <secret-name> -n agentless to correct the JSON.",
      "Check whether the agentless deployment deletions are intentional: kubectl get events -n agentless --sort-by=.lastTimestamp | grep -i delet to confirm if deletions are operator-initiated or automated.",
      "If credential fix is not immediately available, pause the agentless Cloudbeat deployment to stop crash-loop restarts: kubectl scale deployment cloudbeat-gcp -n agentless --replicas=0 until credentials are corrected."
    ],
    "dependency_edges": [],
    "root_cause": "Cloudbeat is exiting at startup because the GCP credentials JSON configuration is invalid or malformed, preventing the beater from initializing."
  },
  {
    "event_id": "6cfce9a0-a949-4f84-a99c-0cad1c7b13a0",
    "timestamp": "2026-07-14T15:45:36.694Z",
    "created_at": "2026-07-14T15:45:36.694Z",
    "discovery_id": "a37ed476-2cbc-4431-acab-17d0caa40f79",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-otelsupervision-config-panic-and-failed-state",
    "status": "acknowledged",
    "title": "Agentless runtime — components: seccomp panic, FAILED transitions, and AWS credentials misconfiguration",
    "summary": "Agentless runtime (GCP us-central1): three concurrent component failures have been active since ~14:30Z (~75 min) with no sign of recovery. Heartbeat/Synthetics crashes on every spawn with a seccomp policy double-registration panic; cloudbeat/cis_gcp cycles STOPPING→FAILED (exit code 1) continuously; AWS OTel collector crash-loops across 6+ AWS service integrations (RDS, SQS, ECS, Lambda, EC2, ELB) due to missing awscredentialsprovider credentials/assume_role/profile config. All failures are internal-only (no exposed dependency edges). Immediate actions: patch the agentless seccomp double-registration bug or roll back the offending heartbeat build, and supply valid AWS credentials/assume_role/profile for the awscredentialsprovider extensions to stop the collector crash loop.",
    "criticality": 55,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the heartbeat/synthetics component to the previous stable build to stop the seccomp panic crash loop: `elastic-agent upgrade --version <previous-stable>` or redeploy the agentless policy with the prior heartbeat image tag via the Fleet UI (Stack Management → Fleet → Agent Policies → agentless policy → edit heartbeat integration version).",
      "Provide valid AWS credentials for the awscredentialsprovider extensions: edit the AWS integration policy in Fleet to supply either static credentials, an assume_role ARN, or a named profile for each AWS service integration (RDS, SQS, ECS, Lambda, EC2, ELB) — navigate to Fleet → Integrations → AWS → edit each affected integration and populate the credentials section.",
      "Restart the affected agentless elastic-agent unit after applying the credential fix to clear the crash-loop backoff: `systemctl restart elastic-agent` on the agentless host, or trigger a policy re-enrollment via Fleet UI to force a clean component restart."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless runtime components are failing because two configuration/runtime faults are present: (1) Heartbeat/Synthetics panics on seccomp policy double-registration ('a seccomp policy is already registered') — a code-level bug in the heartbeat build (v7.0.0-alpha2.0.20260709214207-768b58b5d81c) where MustRegisterPolicy is called twice; (2) AWS OTel collector extensions (awscredentialsprovider) are misconfigured with no credentials, assume_role, or profile set, causing startup validation failure and crash-loop across all AWS service integrations."
  },
  {
    "event_id": "b4546911-136a-458a-89ca-c86828f7680e",
    "timestamp": "2026-07-14T15:12:12.829Z",
    "created_at": "2026-07-14T15:12:12.829Z",
    "discovery_id": "disc-otel-recovery-loop-2026-07-14T15:01:39Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__otel-collector-recovery-restart-loop-awscredentialsprovider",
    "status": "acknowledged",
    "title": "Agentless OTel Collector — supervision: recovery restart loop",
    "summary": "Agentless OTel collector is stuck in a continuous recovery restart loop (1433 retries as of 15:09Z, up from 828 at onset 15:01Z — worsening). The collector fails to start due to misconfigured awscredentialsprovider extensions: AWS integrations (CloudWatch ELB/RDS/Lambda/SQS/EC2/ECS) have no credentials, assume_role, or profile configured. Affected agentless stack: project-c6ba572bea254e10acfb055bb67ba44c. AWS CloudWatch data collection for this stack is completely stopped. Fix the AWS credentials configuration in the affected connector's integration policy in Kibana.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Persistent Recovery Restart Loop"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the AWS credentials configuration for the affected agentless connector: update the connector's AWS integration policy in Kibana to provide valid credentials, assume_role ARN, or profile for all awscredentialsprovider extensions (otelcol-aws-elb, otelcol-aws-rds, otelcol-aws-lambda, otelcol-aws-sqs, otelcol-aws-ec2, otelcol-aws-ecs).",
      "Identify the affected agentless pod and inspect its current config: kubectl get pod -l k8s.elastic.co/agent-policy-id=c32b71cb-824a-4d87-be52-4c297b66ced7 -n project-c6ba572bea254e10acfb055bb67ba44c -o yaml | grep -A5 awscredentialsprovider",
      "After fixing credentials, restart the affected agentless deployment to clear the restart loop: kubectl rollout restart deployment agentless-c32b71cb-824a-4d87-be52-4c297b66ced7 -n project-c6ba572bea254e10acfb055bb67ba44c"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed OTel collector is failing because its awscredentialsprovider extensions are misconfigured — none of credentials, assume_role, or profile are set — causing startup failure and a continuous supervisor recovery restart loop."
  },
  {
    "event_id": "8d891c4d-115e-44fb-b954-335f80a95769",
    "timestamp": "2026-07-14T15:11:34.229Z",
    "created_at": "2026-07-14T15:11:34.229Z",
    "discovery_id": "disc-connectors-py-api-retry-404-2026-07-14T15:01:39Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-py-client-refresh-retry-404",
    "status": "acknowledged",
    "title": "Connectors — python client: API 404 retry loop",
    "summary": "Connectors-py client is stuck in a persistent retry loop on the 'refresh' API call, receiving HTTP 404 responses. This is likely a downstream symptom of the missing .elastic-connectors-sync-jobs index. All connector sync/refresh operations for affected agentless instances are blocked. Errors confirmed active as recently as 15:09Z (onset 15:01Z), stationary pattern. Restore the missing .elastic-connectors-sync-jobs index first — this should resolve the retry loop.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Python Client API Retry Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Resolve the upstream missing index first (restore .elastic-connectors-sync-jobs) — this will likely clear the 404 retry loop automatically.",
      "If the retry loop persists after index restoration, restart affected connector pods: kubectl rollout restart deployment -l component.type=connectors-py -n <project-namespace>",
      "Monitor connectors-py logs for retry count reduction: kubectl logs -l component.type=connectors-py -n <project-namespace> | grep 'Client method.*retry'"
    ],
    "dependency_edges": [],
    "root_cause": "connectors-py is failing because its refresh API call returns HTTP 404, causing the client to enter a retry loop — likely because the .elastic-connectors-sync-jobs index is missing (see related discovery)."
  },
  {
    "event_id": "4491808c-3d2d-475b-be05-97c9ef85f12d",
    "timestamp": "2026-07-14T15:11:05.171Z",
    "created_at": "2026-07-14T15:11:05.171Z",
    "discovery_id": "disc-connectors-index-not-found-2026-07-14T15:01:39Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-sync-jobs-index-not-found",
    "status": "acknowledged",
    "title": "Connectors — sync jobs storage: index not found",
    "summary": "Connectors service is failing to access the .elastic-connectors-sync-jobs system index, returning index_not_found_exception (HTTP 404). All connector sync job creation, status tracking, and cleanup operations are blocked for affected agentless connector instances. Errors confirmed active as recently as 15:09Z (onset 15:01Z), stationary pattern with no sign of recovery. Restore or recreate the .elastic-connectors-sync-jobs index immediately and verify connectors can read/write it.",
    "criticality": 55,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Index Not Found"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Recreate the missing system index: POST /_connector/_sync_job (or use the Kibana Connectors UI to trigger index bootstrap) — verify with GET /.elastic-connectors-sync-jobs to confirm the index exists and is green.",
      "If the index was accidentally deleted, restore from snapshot: POST /_snapshot/<repository>/<snapshot>/_restore with indices: \".elastic-connectors-sync-jobs\".",
      "Restart affected connector pods to clear the error state after index restoration: kubectl rollout restart deployment -l component.type=connectors-py -n <project-namespace>"
    ],
    "dependency_edges": [],
    "root_cause": "Connectors are failing because Elasticsearch returns index_not_found_exception for the required .elastic-connectors-sync-jobs system index."
  },
  {
    "event_id": "a4cb8c09-d7a1-486c-b957-9f8b86a1c636",
    "timestamp": "2026-07-14T14:56:57.897Z",
    "created_at": "2026-07-14T14:56:57.897Z",
    "discovery_id": "otel-invalid-config-2026-07-14T14:48Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__fleet-config-update-received-by-componen-e0ee7eda",
    "status": "acknowledged",
    "title": "Agentless OTel Collector — AWS CloudWatch inputs: invalid awscredentialsprovider configuration causes exit loop",
    "summary": "Agentless OTel collector: invalid awscredentialsprovider configuration is causing repeated collector startup failures and exit loops. Affects AWS CloudWatch agentless inputs (RDS, ECS, EC2, Lambda, SQS, ELB) — internal pipeline only, no user-facing services impacted. Onset ~13:30Z; still failing as of 14:53Z with no recovery. Fix the AWS credentials/assume_role/profile settings in the agentless policy (ID: 99fe7836-56d0-478c-87db-987766320e4b) via Fleet UI.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Invalid Configuration Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the agentless policy credentials: in Fleet UI, navigate to the affected agentless policy (policy ID visible in the error: 99fe7836-56d0-478c-87db-987766320e4b) and update the AWS CloudWatch input auth settings — set credentials, assume_role ARN, or profile for each awscredentialsprovider extension (aws-rds, aws-ecs, aws-ec2, aws-lambda, aws-sqs, aws-elb).",
      "If assume_role is the intended auth method, verify the IAM role ARN is correctly set: check the agentless policy YAML with kubectl get configmap -n project-<id> -o yaml | grep -A5 awscredentialsprovider and confirm assume_role.arn is populated.",
      "After updating the policy, force a config reload: kubectl rollout restart deployment/agentless-<policy-id> -n project-<namespace> to trigger the OTel collector to pick up the corrected credentials configuration."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed OpenTelemetry collector is failing because the awscredentialsprovider extension is misconfigured with no credentials, assume_role, or profile set for AWS CloudWatch inputs (RDS, ECS, EC2, Lambda, SQS, ELB), causing collector startup validation failure and repeated exits."
  },
  {
    "event_id": "1f813783-d8f9-449d-88d7-d151e92c61c5",
    "timestamp": "2026-07-14T14:54:58.813Z",
    "created_at": "2026-07-14T14:54:58.813Z",
    "discovery_id": "proxy-5xx-2026-07-14T14:48Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-59e53278",
    "status": "acknowledged",
    "title": "Proxy — HTTP responses: elevated 5xx server errors",
    "summary": "Proxy: HTTP 5xx responses are actively occurring and confirmed still firing as of 14:53Z. No exposed downstream dependency edges are mapped, so blast radius is unconfirmed, but callers through the proxy may be experiencing failures. Onset ~13:30Z; errors have persisted for over 80 minutes with no sign of recovery. Inspect proxy upstream dependency health and error logs to identify the 5xx mechanism and affected routes.",
    "criticality": 55,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy upstream health: kubectl logs -n ingress-proxy -l app=ingress-proxy --tail=200 | grep -E '5[0-9]{2}|error|upstream' to identify which backend is returning errors.",
      "Inspect proxy metrics for upstream connection failures: kubectl exec -n ingress-proxy <proxy-pod> -- curl -s localhost:9901/stats | grep -E 'upstream_cx_connect_fail|upstream_rq_5xx' to pinpoint the failing upstream.",
      "If a specific upstream is identified as unhealthy, cordon it: kubectl cordon <node> or scale down the affected deployment with kubectl scale deployment/<name> -n <namespace> --replicas=0 to stop routing traffic to it."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "599d3542-c96b-4144-ac70-82268907af5f",
    "timestamp": "2026-07-14T14:42:05.611Z",
    "created_at": "2026-07-14T14:42:05.611Z",
    "discovery_id": "otel-manager-invalid-config-2026-07-14T14:34Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__elastic-agent-rpc-context-canceled-error-9b9f00b6",
    "status": "acknowledged",
    "title": "Agentless OTel Collector — AWS CloudWatch inputs: awscredentialsprovider misconfigured causes restart loop",
    "summary": "Agentless OTel collector (otel_manager) in the logging-gcp-us-central1 pipeline is stuck in a continuous restart loop due to invalid awscredentialsprovider configuration — at least one of credentials, assume_role, or profile must be set. AWS CloudWatch inputs (e.g., aws-ec2, aws-sqs) are not collecting data. Affects only the internal agentless pipeline; no user-facing services are exposed. Failure has been ongoing since ~13:30Z (~70 min), stationary pattern with no sign of self-recovery (706+ retries confirmed at 14:41Z). Fix the AWS credentials provider configuration in the agentless integration policy to stop the restart loop.",
    "criticality": 45,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Accumulated High Recovery Retry Count",
      "OTel Collector Exited with Error (otel_manager)",
      "Elastic Agent RPC Context Canceled Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the awscredentialsprovider configuration in the agentless integration policy: navigate to Fleet → Integrations → [affected AWS integration] → Edit and supply at least one of: static credentials (access_key_id/secret_access_key), assume_role ARN, or a named profile — then save and re-deploy the policy.",
      "If the integration policy cannot be immediately edited, disable the affected AWS CloudWatch inputs (aws-ec2, aws-sqs) in the integration policy to stop the restart loop and prevent further retry accumulation until credentials are available.",
      "Verify the fix took effect by checking otel_manager logs: kubectl logs -n <agentless-namespace> <otel-manager-pod> | grep -E 'total retries|exited with error' — retries should stop appearing within 2 minutes of policy re-deployment."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed OpenTelemetry collector is failing because the awscredentialsprovider extension is misconfigured with no credentials, assume_role, or profile set, causing the collector to exit on startup and continuously restart via recovery retries."
  },
  {
    "event_id": "e8e5911d-a81b-4022-9fa6-5d1cff296a62",
    "timestamp": "2026-07-14T13:38:39.297Z",
    "created_at": "2026-07-14T13:38:39.297Z",
    "discovery_id": "61ffc2f5-f1dc-4f91-b554-3dfed3e4efaf",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure",
    "status": "acknowledged",
    "title": "Connectors — SSH connectivity: connection failure alert",
    "summary": "Connectors SSH connection failure (errno 22 — invalid argument) is ongoing in the agentless log ingestion stream. Affects internal connector sync path only; no user-facing journeys blocked. Stationary pattern since ~11:30Z, still active at 13:32Z. Schedule investigation to identify which connector/target host has an invalid SSH configuration and correct or disable it.",
    "criticality": 30,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect connector logs for the specific connector ID and target host: kubectl logs -n <agentless-namespace> -l component.type=connectors-py --since=1h | grep -i 'connect call failed'",
      "Identify the misconfigured SSH connector in Kibana (Stack Management > Connectors) and verify the target host address, port, and credentials are valid.",
      "If the connector is no longer needed, disable or delete it via: curl -X DELETE '<kibana-url>/api/actions/connector/<connector-id>' -H 'kbn-xsrf: true'"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "6d14eaf1-37d1-44a2-b5b4-8a1a844e848b",
    "timestamp": "2026-07-14T13:12:58.984Z",
    "created_at": "2026-07-14T13:12:58.984Z",
    "discovery_id": "4817ad17-34d6-4752-b501-da13b9672e4a",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__cel-input-retryable-http-request-failure-bdbd2f3f",
    "status": "acknowledged",
    "title": "Agentless provisioning/ingestion — setup: provisioning collisions and O365 DLP permission errors",
    "summary": "Agentless ingestion pipeline is degraded: provisioning attempts are hitting namespace collisions and the O365 DLP connector is failing subscription start with HTTP 401 (AF10001 — missing permissions), causing the CEL component to transition HEALTHY→DEGRADED. Affects agentless O365 audit log ingestion; no exposed user-facing services confirmed. Errors have been continuous since ~2026-07-14T11:30Z and are still active as of 13:11Z. Immediate actions: fix O365 DLP subscription permissions and investigate namespace cleanup for provisioning idempotency.",
    "criticality": 40,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default",
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Namespace Already Exists During Provisioning",
      "O365 DLP Subscription Permission Error (AF10001)",
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix O365 DLP subscription permissions: in the Microsoft 365 compliance portal, navigate to the registered app's API permissions and grant the `ActivityFeed.Read` (or equivalent DLP subscription) permission, then re-run `POST /activity/feed/subscriptions/start?contentType=DLP.All` to confirm the AF10001 error clears.",
      "Resolve namespace collision: run `kubectl get namespace <agentless-namespace>` to confirm the existing namespace, then either delete it with `kubectl delete namespace <agentless-namespace>` (if stale) or update the provisioning config to use an idempotent upsert path so repeated provisioning calls do not fail on pre-existing namespaces.",
      "Restart the degraded CEL agentless agent after permissions are fixed: `kubectl rollout restart deployment/<agentless-cel-deployment> -n <agentless-namespace>` and monitor logs with `kubectl logs -f deployment/<agentless-cel-deployment> -n <agentless-namespace>` to confirm the component returns to HEALTHY state."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "4966aa99-4567-4545-8638-4aca8a243915",
    "timestamp": "2026-07-14T13:04:31.172Z",
    "created_at": "2026-07-14T13:04:31.172Z",
    "discovery_id": "disc-34b2bc19-okta-e0000260-20260714",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-514101a4",
    "status": "acknowledged",
    "title": "Okta agentless ingestion — Okta API: developer org deactivated (E0000260)",
    "summary": "Okta agentless ingestion: the httpjson collector for Okta audit logs is DEGRADED because the Okta developer org (dev-90678350.okta.com) is deactivated and returns 403 Forbidden (E0000260). Affects security/audit log visibility for Okta events only — no user-facing services impacted. Failure confirmed active as of 2026-07-14T12:43Z, persisting since start of day. Schedule remediation: reactivate the Okta developer org or update connector credentials to an active org.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Reactivate the Okta developer org via the Okta Admin Console (admin.okta.com) or contact Okta support to restore the deactivated org: `okta-admin org:activate --org-url https://dev-90678350.okta.com`",
      "Update the Okta connector credentials in the agentless integration config to point to an active Okta org: `kubectl edit secret okta-connector-credentials -n <agentless-namespace>` and replace the org URL and API token",
      "If the developer org cannot be reactivated, disable the Okta httpjson integration in Fleet to stop retry noise: `fleet-server integration disable --id httpjson-okta --namespace agentless`"
    ],
    "dependency_edges": [],
    "root_cause": "Okta audit-log ingestion is failing because the Okta developer org endpoint returns 403 Forbidden (E0000260) and the oauth2 token fetch cannot complete after 6 retries."
  },
  {
    "event_id": "1d458fc3-18ac-4106-9ad3-423b26fdfd93",
    "timestamp": "2026-07-14T12:50:08.825Z",
    "created_at": "2026-07-14T12:50:08.825Z",
    "discovery_id": "disc-uiam-auth-proxy-20260714T1241Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-f18835ef",
    "status": "acknowledged",
    "title": "UIAM — authentication endpoint: proxy 4xx responses",
    "summary": "UIAM: authentication requests via the ingress proxy are returning 4xx responses on the /uiam/api/v1/authentication/_authenticate path. Affects internal Java clients (Apache HttpAsyncClient) calling the UIAM service; no exposed end-user dependency edges confirmed. Failure is stationary and ongoing since 11:00Z with the most recent error confirmed at 12:45Z. Investigate UIAM pod health and access logs to identify the specific 4xx type and failing auth mechanism.",
    "criticality": 40,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM pod health and recent deployment events across all observed clusters (prd-gcpusc1-cp-app-1/2/3/5): `kubectl -n uiam-regional get pods -o wide` and `kubectl -n uiam-regional describe deployment uiam`.",
      "Inspect UIAM access logs for the specific 4xx status codes and error messages to identify whether this is a 401 (credential/token expiry), 403 (permission), or 404 (routing): `kubectl -n uiam-regional logs -l app=uiam --tail=200 | grep -E '4[0-9]{2}'`.",
      "If a recent deployment is suspected, roll back the UIAM deployment: `kubectl -n uiam-regional rollout undo deployment/uiam` and monitor error rate."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "92f184ea-2aa7-4036-920e-e08df59b9acd",
    "timestamp": "2026-07-14T12:49:30.635Z",
    "created_at": "2026-07-14T12:49:30.635Z",
    "discovery_id": "disc-oauth-tokenfetch-403-20260714T1241Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-64ce9d49",
    "status": "acknowledged",
    "title": "Integration OAuth — token endpoint: 403 Forbidden",
    "summary": "Integration OAuth (Okta agentless): token fetch requests are returning 403 Forbidden due to a deactivated Okta developer org (E0000260). Affects the Okta HTTPJSON agentless integration; all system log collection from that Okta tenant is halted. Failure is stationary and ongoing since 11:00Z with the most recent error confirmed at 12:48Z. An Okta org admin must reactivate the developer org or reconfigure the integration against an active tenant.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration OAuth Token Fetch 403 Forbidden"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Reactivate the Okta developer org at dev-90678350.okta.com via the Okta Admin Console, or reconfigure the integration to point to an active Okta tenant: navigate to Fleet → Integrations → Okta → edit the affected policy and update the Okta tenant URL and OAuth credentials.",
      "If the dev org cannot be reactivated, remove or disable the affected Okta integration policy in Fleet to stop recurring error noise: `kubectl -n agentless delete agentlesspolicy <okta-policy-name>` or disable via Fleet UI.",
      "Rotate/verify the OAuth client credentials for the Okta integration in Fleet policy settings to ensure they are valid for the target tenant once reactivated."
    ],
    "dependency_edges": [],
    "root_cause": "The Okta agentless integration is failing to fetch OAuth tokens because the configured Okta developer org (dev-90678350.okta.com) has been deactivated (E0000260), causing all token requests to return 403 Forbidden and halting data collection."
  },
  {
    "event_id": "e83c6f8e-fc81-4661-909c-a0ca738b6704",
    "timestamp": "2026-07-14T12:33:19.078Z",
    "created_at": "2026-07-14T12:33:19.078Z",
    "discovery_id": "discovery-agentless-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__component-state-transition-to-failed-mes-648ea8ad",
    "status": "acknowledged",
    "title": "Agentless collector — ingestion pipeline: httpjson/cloudbeat component failures",
    "summary": "Agentless log collector: HTTPJSON registry cleanup failures (404 not_found on agentless-state indices) and cloudbeat/cis_gcp component FAILED transitions are actively occurring. Affects agentless CSPM/cloudbeat and HTTPJSON connector ingestion for multiple projects in GCP us-central1. Failures confirmed ongoing as of 12:32Z with no sign of recovery. Review agentless-state index health and cloudbeat component restart loops; no user-facing services are directly exposed.",
    "criticality": 35,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Input HTTP Request Processing Error",
      "Component State Transition to FAILED (Message-Based)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless-state index health and confirm 404 not_found errors are not caused by a missing or deleted index: `kubectl exec -n <agentless-namespace> <filebeat-pod> -- curl -s http://localhost:9200/agentless-state-httpjson-*/_stats | jq '.indices | keys'`",
      "Restart the failing cloudbeat/cis_gcp agentless pods to clear the FAILED component state: `kubectl rollout restart deployment -n <project-namespace> agentless-<policy-id>`",
      "If agentless-state indices are missing, recreate them or clear the registry to allow clean startup: `kubectl exec -n <agentless-namespace> <filebeat-pod> -- rm -rf /var/lib/filebeat/registry/filebeat`"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless cloudbeat/httpjson collector is failing because the collector process exits (code 1) and its state registry cleanup hits Elasticsearch 404 not_found errors on agentless-state indices, preventing stable input processing."
  },
  {
    "event_id": "7ec9f7a0-5db4-4b91-abb8-61c7708bbd3a",
    "timestamp": "2026-07-14T12:19:43.096Z",
    "created_at": "2026-07-14T12:19:43.096Z",
    "discovery_id": "9e86bc40-8b78-4b7f-8cf9-cf4ba041281e",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__namespace-already-exists-during-provisio-f0b4b25b",
    "status": "acknowledged",
    "title": "Agentless API — provisioning: namespace already exists error",
    "summary": "Agentless API provisioning is failing with \"Namespace already exists\" errors, blocking namespace creation steps in provisioning workflows. The error is ongoing — confirmed active as recently as 12:17Z (onset 10:30Z, ~1h 47m duration). No exposed dependency edges; impact is scoped to provisioning workflows requiring new namespace creation. Immediate action: identify and resolve the namespace name conflict — either use a unique namespace name or clean up the pre-existing namespace if it is stale.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Namespace Already Exists During Provisioning"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check for conflicting namespace: kubectl get namespace <target-namespace> -o yaml — confirm whether the namespace is stale or in use, then delete if safe: kubectl delete namespace <target-namespace>",
      "If the namespace is legitimately in use, update the provisioning configuration to use a unique namespace name: edit the agentless-api deployment config or the provisioning request payload to specify a non-conflicting namespace",
      "Review recent provisioning requests in the agentless-api logs to identify which specific namespace(s) are conflicting: kubectl logs -n agentless-api -l app=agentless-api --since=2h | grep 'Namespace already exists'"
    ],
    "dependency_edges": [],
    "root_cause": "Provisioning is failing because the target namespace already exists, causing the create-namespace step to error and block the provisioning workflow until the namespace name conflict is resolved."
  },
  {
    "event_id": "0d8463fc-9b84-416d-8128-8a5bc37bfd0b",
    "timestamp": "2026-07-14T10:58:34.919Z",
    "created_at": "2026-07-14T10:58:34.919Z",
    "discovery_id": "agentless-multi-config-and-auth-2026-07-14T09-30Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-components-degraded-missing-c-2a9bb3c1",
    "status": "acknowledged",
    "title": "Agentless integrations — configuration/auth: degraded state, missing required fields, 401 Unauthorized",
    "summary": "Agentless connector pipeline is in a degraded state affecting Confluence connector sync jobs and an upstream integration API auth path. Connector sync is blocked by missing required configuration fields (Confluence Server password and URL) and HTTP 401 Unauthorized errors on integration API calls. Onset confirmed at 2026-07-14T09:30Z; all three failure signals remain active as of 10:52Z with no recovery observed. Dependency path is internal (connectors → Confluence, HTTPS). Immediate actions: supply missing Confluence connector credentials and rotate/correct the upstream API credentials causing 401 errors.",
    "criticality": 45,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered DEGRADED State",
      "Connectors Missing Required Configuration Fields",
      "Integration API 401 Unauthorized Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Supply missing Confluence connector required fields: navigate to Stack Management → Connectors, open the Confluence connector, and fill in the Confluence Server password and Confluence URL label fields, then save and re-run the sync job.",
      "Rotate or correct the upstream API credentials causing 401 Unauthorized: identify the integration API key/token in use (check the agentless integration config in Fleet → Integrations), revoke the stale credential, issue a new one, and update the integration configuration.",
      "Verify connector sync recovery after credential fix: run `GET /api/actions/connector/<connector_id>/_execute` via Kibana Dev Tools or check Fleet → Integrations for the Confluence integration status to confirm sync jobs resume without errors."
    ],
    "dependency_edges": [
      {
        "source": "connectors",
        "target": "confluence",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "Agentless integrations are degrading because connector configurations are missing required fields and an integration API is returning 401 Unauthorized, blocking connector validation/sync and halting data collection until the integration configuration and credentials are corrected."
  },
  {
    "event_id": "8e7df3f1-1be3-4d2d-8387-4aa48d3972a3",
    "timestamp": "2026-07-14T10:50:42.940Z",
    "created_at": "2026-07-14T10:50:42.940Z",
    "discovery_id": "cel-url-unsupported-protocol-2026-07-14",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsup-b7df9ddb",
    "status": "acknowledged",
    "title": "Agentless CEL — input config: unsupported protocol scheme errors",
    "summary": "Agentless CEL integration is failing to collect data because the configured input URL has an unsupported or missing protocol scheme (\\\"unsupported protocol scheme\\\" error). The CEL workload (likely Cisco Duo) cannot form HTTP requests, blocking all data ingestion for that integration instance. Errors confirmed active as of 2026-07-14T10:48Z with no sign of recovery. Operator action required: correct the integration URL to include a valid scheme (e.g., https://).",
    "criticality": 45,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Correct the integration URL in Fleet: navigate to Fleet → Integrations → find the affected CEL integration (likely Cisco Duo or similar) → Edit policy, update the URL field to include a valid scheme (e.g., https://api.duosecurity.com), then save and redeploy.",
      "Verify the integration resumes data collection after the URL fix by checking for new events: FROM $.logging-gcp-us-central1-logs-agentless-log-default | WHERE error.message : \"unsupported protocol scheme\" | SORT @timestamp DESC | LIMIT 5 — should return no new rows after the fix.",
      "If the integration was recently added or modified, review the policy template configuration for the URL field to ensure it was not accidentally cleared or set to a relative path."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless CEL input is failing because the integration's configured URL has an unsupported or missing protocol scheme (e.g., \\\"ef\\\" instead of \\\"https://\\\"), preventing HTTP requests from being formed and blocking all data collection."
  },
  {
    "event_id": "adb7d332-f27f-49a5-991d-e046e3a23096",
    "timestamp": "2026-07-14T10:50:13.896Z",
    "created_at": "2026-07-14T10:50:13.896Z",
    "discovery_id": "connectors-notion-api-token-invalid-2026-07-14",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-notion-api-response-error-05d7797f",
    "status": "acknowledged",
    "title": "Connectors Notion — API auth: invalid token errors",
    "summary": "Notion connector is failing to sync documents because the configured Notion API token is invalid (APIResponseError). The connectors-py agentless workload running notion package v1.1.0 cannot authenticate to the Notion API, blocking all sync operations for that connector instance. Errors confirmed active as of 2026-07-14T10:48Z with no sign of recovery. Operator action required: rotate the Notion API token and update the connector configuration.",
    "criticality": 45,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate or replace the Notion API token: in the Notion workspace, go to Settings → Integrations → find the integration, regenerate the token, then update the connector configuration in Fleet → Integrations → Elastic Connectors → Edit policy with the new token.",
      "Verify the connector resumes syncing after token update by triggering a manual sync: in Kibana, navigate to Search → Content → Connectors → select the Notion connector → Run sync.",
      "If the token cannot be regenerated, check that the Notion integration has the required page/database access permissions in the Notion workspace under Settings → Connections."
    ],
    "dependency_edges": [],
    "root_cause": "Notion connector is failing because its configured Notion API token is invalid, causing APIResponseError responses from Notion during the connector ping operation and blocking all document synchronization."
  },
  {
    "event_id": "18976c0d-bca6-4855-8dc4-ecfbcb4c3ae3",
    "timestamp": "2026-07-14T10:49:49.452Z",
    "created_at": "2026-07-14T10:49:49.452Z",
    "discovery_id": "okta-dev-org-deactivated-e0000260-2026-07-14",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-fd7648dc",
    "status": "acknowledged",
    "title": "Okta — org status: developer org deactivated errors",
    "summary": "Okta integration is failing to collect system logs because the configured Okta Developer Org (dev-90678350.okta.com) has been deactivated (E0000260). The HTTPJSON agentless workload running okta package v3.10.1 is blocked from fetching OAuth tokens, halting all log ingestion from that tenant. Errors confirmed active as of 2026-07-14T10:48Z with no sign of recovery. Operator action required: reactivate the Okta Developer Org or reconfigure the integration to point to an active Okta tenant.",
    "criticality": 45,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Reactivate the Okta Developer Org at https://developer.okta.com/login — log in as the org admin and follow the reactivation flow, or upgrade to a paid Okta plan to prevent future deactivation.",
      "If the developer org cannot be reactivated, reconfigure the Okta integration in Fleet to point to an active Okta tenant: navigate to Fleet → Integrations → Okta → Edit policy, update the Okta domain and OAuth credentials, then save and redeploy.",
      "Verify the integration resumes ingestion after reconfiguration by checking for new events in the logging-gcp-us-central1-logs-agentless-log-default stream: FROM $.logging-gcp-us-central1-logs-agentless-log-default | WHERE kubernetes.labels.k8s_elastic_co/agentless-integration-name == \"okta\" | SORT @timestamp DESC | LIMIT 5."
    ],
    "dependency_edges": [],
    "root_cause": "Okta integration is failing because the configured Okta Developer Org (dev-90678350.okta.com) is deactivated, causing OAuth2 token fetch to return 403 Forbidden with error code E0000260 and blocking all system log collection."
  },
  {
    "event_id": "17a91a41-7e9b-4b4d-bc50-61b0e3bc6c6a",
    "timestamp": "2026-07-14T10:36:23.730Z",
    "created_at": "2026-07-14T10:36:23.730Z",
    "discovery_id": "b3d493c7-f608-5fe7-981a-cea0ca9c06a0-connectors-2026-07-14T08:44:55Z",
    "discovery_slug": "connectors--elasticsearch-dependency--refresh-404-and-index-missing",
    "status": "acknowledged",
    "title": "Connectors — Elasticsearch dependency: refresh API 404 / sync-jobs index missing",
    "summary": "Connectors service is failing Elasticsearch refresh API calls with 404 index_not_found_exception for .elastic-connectors-sync-jobs. Agentless Elastic Connectors workloads are affected via the internal connectors→Elasticsearch dependency. Failure is actively ongoing — most recent error confirmed at 2026-07-14T10:34:00Z, with stationary pattern indicating chronic persistence since at least March 2026. No exposed user-facing path; blast radius is internal connectors sync jobs only. Verify .elastic-connectors-sync-jobs index existence and trigger index initialization via connectors service restart.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Refresh API 404 Errors",
      "Connectors Python Client API Retry Error",
      "DNS Resolution Failures in Integration Error Messages"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify whether the .elastic-connectors-sync-jobs index exists in the Elasticsearch cluster for the agentless connectors deployment: kubectl exec -n <connectors-namespace> deploy/connectors -- curl -sk -u elastic:$ES_PASSWORD https://<es-host>:9200/.elastic-connectors-sync-jobs/_stats | jq '.indices | keys'",
      "If the index is missing, trigger index initialization by restarting the connectors service to force index bootstrap: kubectl rollout restart deployment/connectors -n <connectors-namespace>",
      "If restart does not recreate the index, manually create it using the connectors index template: kubectl exec -n <connectors-namespace> deploy/connectors -- curl -sk -X PUT -u elastic:$ES_PASSWORD https://<es-host>:9200/.elastic-connectors-sync-jobs -H 'Content-Type: application/json' -d '{\"settings\":{\"number_of_shards\":1}}'"
    ],
    "dependency_edges": [
      {
        "source": "connectors",
        "target": "elasticsearch",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "connectors is erroring because the required Elasticsearch index .elastic-connectors-sync-jobs is missing, causing indices.refresh calls to return 404 index_not_found_exception."
  },
  {
    "event_id": "aca5b133-7dbe-41c6-b338-2c9bc229fe01",
    "timestamp": "2026-07-14T10:30:24.955Z",
    "created_at": "2026-07-14T10:30:24.955Z",
    "discovery_id": "13f89d6a-3d82-43d9-8de4-22fe9cbc1b79",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-e0a2b557",
    "status": "acknowledged",
    "title": "Agentless logging pipeline — integrations: O365 DLP permission failure (AF10001)",
    "summary": "Agentless logging pipeline: O365 DLP subscription is failing with AF10001 permission error, causing the cel-es-default-output-internal component to transition HEALTHY→DEGRADED. Confirmed active at 10:22 — the O365 app registration is missing the required DLP subscription permission. O365 DLP audit data ingestion is halted; no user-facing services are directly exposed. CEL retryable HTTP failure not confirmed. Fix the Azure AD app registration permissions and restart the connector.",
    "criticality": 35,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)",
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Update the O365 application registration permissions in Azure AD to include the required DLP subscription permission: navigate to Azure Portal > App Registrations > [agentless connector app] > API Permissions and add 'ActivityFeed.Read' with admin consent, then restart the affected connector: `kubectl rollout restart deployment/<o365-connector-deployment> -n <connector-namespace>`.",
      "Verify the O365 connector credentials and tenant configuration in Kibana (Stack Management > Connectors > O365 DLP) — confirm the client ID and secret are current and the app has the correct permissions granted.",
      "Monitor recovery by checking the component state: `kubectl logs -n <connector-namespace> -l component=cel-es-default-output-internal --since=10m | grep -E 'HEALTHY|DEGRADED|AF10001'` to confirm the component transitions back to HEALTHY after permission fix."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "8d7a0e48-1d4b-43ec-a1da-45091bea4815",
    "timestamp": "2026-07-14T10:29:07.977Z",
    "created_at": "2026-07-14T10:29:07.977Z",
    "discovery_id": "c0d57b86-ea36-4cc9-a3eb-b18d78d54b89",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-98dd15cb",
    "status": "acknowledged",
    "title": "Connectors — SSH connectivity: alert anomaly (dip)",
    "summary": "Agentless logging pipeline: Connectors SSH connection failures are ongoing (error.message: Connect call failed, errno 22). Affects internal connector sync jobs — no exposed user-facing dependency path identified. Signal detected as a dip (alert volume drop) then confirmed still active at review time; SSH errors persist at 10:24. No recovery observed. Investigate which connector and target host is failing and correct the endpoint configuration.",
    "criticality": 40,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check connector configuration for SSH-dependent connectors (e.g., Confluence Server): run `kubectl get pods -n <connector-namespace> -l component.type=connectors-py` and inspect logs with `kubectl logs <pod> | grep 'Connect call failed'` to identify which connector and target host is failing.",
      "Verify the target SSH/TCP endpoint is reachable from the connector pod: `kubectl exec -n <connector-namespace> <pod> -- nc -zv <target-host> <port>` to confirm network connectivity.",
      "If the target host is unreachable, update the connector configuration in Kibana (Stack Management > Connectors) to correct the endpoint URL or credentials, then trigger a manual sync to verify recovery."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "ae7038b2-fcc5-4888-ba17-71a39c6566d3",
    "timestamp": "2026-07-14T10:12:00.188Z",
    "created_at": "2026-07-14T10:12:00.188Z",
    "discovery_id": "",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__o365-dlp-subscription-permission-error-a-e11ffba0",
    "status": "acknowledged",
    "title": "O365 audit ingestion — DLP subscription start: permission error AF10001",
    "summary": "Agentless O365 audit ingestion is failing to start the DLP.All subscription with 401 Unauthorized AF10001 errors. The CEL O365 component is in DEGRADED state as of 10:04:15Z. Affected tenants cannot collect DLP audit events via the agentless pipeline. Failure has been continuous since 08:01Z with no sign of recovery. Validate and re-grant the Microsoft 365 app permission for DLP.All subscription start in the Azure portal.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In the Microsoft 365 admin portal, navigate to the registered app used by the agentless O365 integration and verify that the ActivityFeed.Read (or equivalent DLP.All) API permission is granted and admin-consented: https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps",
      "Re-run the O365 DLP subscription start manually via the Microsoft Graph Explorer or curl to confirm the permission gap: POST https://manage.office.com/api/v1.0/{tenant_id}/activity/feed/subscriptions/start?contentType=DLP.All",
      "If permissions were recently revoked or the app registration was rotated, update the Fleet integration policy in Kibana with the corrected credentials and re-save to trigger a reconnect."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless O365 audit ingestion is failing because the Microsoft 365 app registration used for the DLP.All subscription start is missing the required ActivityFeed permission, causing 401 Unauthorized AF10001 responses on every subscription attempt."
  },
  {
    "event_id": "2d58aaa1-e996-4086-9460-3966c26b4e1b",
    "timestamp": "2026-07-14T10:09:56.188Z",
    "created_at": "2026-07-14T10:09:56.188Z",
    "discovery_id": "e45d6a8f-584f-470a-8a9e-66c8064b2572",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-retryable-http-request-failure-88eb0e0e",
    "status": "acknowledged",
    "title": "CEL input — retryable HTTP: request failed",
    "summary": "Agentless CEL input is experiencing ongoing retryable HTTP request failures. The failure is stationary (chronic/ambient pattern) and was confirmed active as recently as 10:08:47Z — within seconds of this review. No exposed dependency edges or downstream services identified; blast radius is limited to CEL-based agentless ingestion pipelines. Inspect the downstream HTTP target URL and capture richer error details (status code, endpoint) from agentless pod logs to identify the failing upstream service.",
    "criticality": 30,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect agentless pod logs for the CEL input component to capture the full error including HTTP status code and target URL: kubectl logs -n <project-namespace> <agentless-pod> -c agentless | grep -i 'retryablehttp\\|request failed' | tail -50",
      "Check the upstream HTTP target service health and connectivity from the agentless pod: kubectl exec -n <project-namespace> <agentless-pod> -- curl -v <target-url>",
      "If the target endpoint is a third-party API, verify API credentials and rate limits are valid for the affected CEL integration policy in Fleet UI under Agent Policies."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "cc7b0a07-765d-4c14-899f-bda5dc1803c4",
    "timestamp": "2026-07-14T08:41:49.495Z",
    "created_at": "2026-07-14T08:41:49.495Z",
    "discovery_id": "d856b178-a0c7-448f-9154-599b3b956219",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-field-validation-error-config-17c91868",
    "status": "acknowledged",
    "title": "Logging agentless pipeline — ingestion components: configuration/state errors",
    "summary": "Agentless logging pipeline (logging-gcp-us-central1): three concurrent ingestion errors confirmed still active as of 08:40Z. (1) Connector field validation failures — Confluence Server password and URL fields are empty, blocking connector runs. (2) Elastic Agent versioned home symlink unresolvable, causing cleanup to skip orphan directory removal. (3) HTTPJSON retryable HTTP request failures on outbound requests. All errors are internal to the agentless pipeline with no exposed downstream services. Onset ~06:00Z; all three failure modes persist continuously. Immediate action: audit connector configurations for missing Confluence credentials and verify the Elastic Agent data directory symlink in logging-gcp-us-central1.",
    "criticality": 40,
    "confidence": 0.72,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Retryable HTTP Request Failures",
      "Elastic Agent Data Directory Symlink Missing",
      "Connectors Field Validation Error (ConfigurableFieldValueError)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Audit connector configuration for the Confluence integration: run `GET /api/connector/<connector_id>` against the Kibana API to identify which connector is missing 'Confluence Server password' and 'Confluence URL label', then update via `PUT /api/connector/<connector_id>` with the correct credential values.",
      "Verify the Elastic Agent versioned home symlink in the agentless pod: exec into the affected pod with `kubectl exec -n logging-gcp-us-central1 <agentless-pod> -- ls -la /opt/Elastic/Agent/data/` and recreate the missing symlink with `ln -s /opt/Elastic/Agent/data/elastic-agent-<version> /opt/Elastic/Agent/data/elastic-agent` if absent.",
      "Investigate the HTTPJSON upstream endpoint: check the integration's target URL and credentials via `kubectl get secret -n logging-gcp-us-central1 <httpjson-secret> -o yaml`, then validate reachability with `curl -v <endpoint-url>` from within the pod."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "4131fbde-10a1-4c87-b391-fbbef025405a",
    "timestamp": "2026-07-14T08:20:53.121Z",
    "created_at": "2026-07-14T08:20:53.121Z",
    "discovery_id": "bd85567e-4e21-449e-8562-36d1b8b1ee9d",
    "discovery_slug": "logging-gcp-us-central1-logs-all__proxy-http-5xx-server-errors-c6a489f2",
    "status": "acknowledged",
    "title": "Proxy — ingress: HTTP 5xx responses",
    "summary": "Proxy: HTTP 5xx server errors are actively being returned by the ingress proxy, with the most recent error confirmed at 08:19 UTC. Blast radius is unknown — no upstream service or dependency mapping is available from current evidence. Errors have been present since at least 06:00 UTC with no sign of recovery. Investigate proxy error logs to identify the failing upstream route before escalating.",
    "criticality": 35,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy access logs for the failing route: kubectl logs -n <proxy-namespace> -l app=proxy --since=30m | grep ' 5[0-9][0-9] ' to identify which upstream endpoint is returning errors.",
      "If a specific upstream is identified, check its health: kubectl get pods -n <upstream-namespace> and kubectl describe pod <pod-name> to look for crash loops or OOM events.",
      "If the upstream is a managed service, check its status page or run curl -I <upstream-health-endpoint> to confirm reachability before escalating."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "e46d3992-a432-4c76-bdc7-6148309370b9",
    "timestamp": "2026-07-14T08:03:00.354Z",
    "created_at": "2026-07-14T08:03:00.354Z",
    "discovery_id": "disc-uiam-proxy-20260714T0751Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-2e67ad4b",
    "status": "acknowledged",
    "title": "UIAM — proxy authentication: 4xx failures",
    "summary": "UIAM proxy authentication is returning 4xx errors as of 07:51Z. The failure affects requests to authenticate endpoints routed through the proxy layer; the specific error mechanism is not visible in this stream projection (message field absent). No exposed downstream services identified. Stream is confirmed live with high volume; current-state re-verification was blocked by a field type ambiguity error, leaving active vs. recovered status uncertain. Immediate action: inspect proxy access logs and upstream IdP connectivity for the UIAM authenticate path to determine whether failures are ongoing.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM proxy pod logs directly: kubectl logs -n <uiam-namespace> -l app=uiam-proxy --since=30m | grep -E '4[0-9]{2}' to identify the specific error code and path",
      "Verify upstream IdP connectivity from the proxy: kubectl exec -n <uiam-namespace> <proxy-pod> -- curl -v <idp-authenticate-endpoint> to confirm reachability",
      "If a recent deployment is suspected, roll back the proxy: kubectl rollout undo deployment/<uiam-proxy-deployment> -n <uiam-namespace>"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "f0531947-9237-4b1d-b9c8-ffe2562228cf",
    "timestamp": "2026-07-14T07:35:41.812Z",
    "created_at": "2026-07-14T07:35:41.812Z",
    "discovery_id": "agentless-failed-2026-07-14T07:07:30Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__aws-otel-collector-missing-credentials-c-94a24002",
    "status": "acknowledged",
    "title": "Agentless — collector/components: FAILED state transitions and AWS credentials config error",
    "summary": "Agentless runtime: multiple OTel collector components are in a continuous FAILED restart loop due to missing AWS credentials configuration. Affected integrations include cloudbeat/cis_gcp and 6 AWS CloudWatch input OTel collectors (elb, lambda, ecs, rds, ec2, sqs) for agentless policy 7ebb099c. Onset ~05:30Z; confirmed still active at 07:31Z (2h duration). No user-facing services are blocked (no exposed dependency edges), but all affected AWS CloudWatch integrations are not collecting data. Fix the awscredentialsprovider configuration in the Fleet integration policy for 7ebb099c to include at least one of: credentials, assume_role, or profile.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)",
      "AWS OTel Collector Missing Credentials Configuration"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Fix the AWS credentials configuration for the affected agentless policy (7ebb099c-35bd-4389-9f11-5a4a3cb9fb0f): in the Fleet/Kibana integration policy editor, navigate to the AWS CloudWatch input OTel integration and add at least one of: static credentials, assume_role ARN, or named profile under the awscredentialsprovider auth section.",
      "If the policy was recently modified or created without credentials, roll back to the last known-good policy version via Fleet: navigate to Fleet > Agent Policies > policy 7ebb099c > Settings > Revert to previous version.",
      "Verify component recovery after credentials fix: kubectl logs -n project-<namespace> -l k8s.elastic.co/agentless-stack-id=<stack-id> --since=10m | grep -E '(HEALTHY|FAILED|awscredentialsprovider)' to confirm the OTel collectors transition back to HEALTHY state."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless-managed OpenTelemetry collector components are failing because awscredentialsprovider is misconfigured with no credentials/assume_role/profile, causing the collector to exit and driving FAILED state transitions for affected integrations."
  },
  {
    "event_id": "09200a77-a111-46aa-ac19-a292a13ac7b9",
    "timestamp": "2026-07-14T07:32:52.110Z",
    "created_at": "2026-07-14T07:32:52.110Z",
    "discovery_id": "agentless-api-security-20260714-0720z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__app-secrets-or-config-object-creation-6e952a59",
    "status": "acknowledged",
    "title": "Agentless API — deployments API: unexpected method + secrets/config creation activity",
    "summary": "Agentless API is receiving non-GET HTTP method traffic (POST/DELETE) on the /api/v1/serverless/deployments endpoint and executing app config/secrets creation workflows. The Kibana→agentless-api mTLS path (exposure: exposed) is the originating caller. Activity has been continuous since ~06:00Z and is confirmed active as of 07:31Z. The root cause is consistent with normal Kibana-initiated serverless deployment management; however, the volume and method distribution warrant validation that no unauthorized principals are calling this endpoint. Validate that all non-GET callers on /api/v1/serverless/deployments are expected Kibana mTLS clients and that app config/secrets creation actions are scoped to authorized deployment workflows.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "App Secrets or Config Object Creation",
      "Unexpected HTTP Method on Deployments Endpoint"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Audit the agentless-api access logs for all non-GET callers on /api/v1/serverless/deployments: kubectl logs -n agentless-api -l app=agentless-api --since=2h | grep -E '\"method\":\"(POST|DELETE|PUT|PATCH)\"' to enumerate caller TLS subjects and confirm all are expected Kibana mTLS clients.",
      "If unexpected callers are found, revoke their mTLS certificates immediately via the Kibana CA management interface and rotate the agentless-api mTLS trust store: kubectl rollout restart deployment/agentless-api -n agentless-api.",
      "Review app config and secrets creation audit trail for the past 2 hours to confirm all created objects correspond to known authorized deployment IDs: cross-reference agentless.name values in logs against the active deployment inventory in the agentless-api database."
    ],
    "dependency_edges": [
      {
        "source": "kibana",
        "target": "agentless-api",
        "protocol": "https",
        "exposure": "exposed"
      }
    ]
  },
  {
    "event_id": "74090af9-a028-4fa8-b4ab-556dbe865002",
    "timestamp": "2026-07-14T07:04:55.309Z",
    "created_at": "2026-07-14T07:04:55.309Z",
    "discovery_id": "747c6fa1-be99-4d84-b29e-8353bffeb2f0",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-unit-spawn-fatal-error-5682fee4",
    "status": "acknowledged",
    "title": "Agentless Heartbeat/Synthetics — unit spawn: fatal panic due to seccomp policy conflict",
    "summary": "Agentless Heartbeat/Synthetics units on logging-gcp-us-central1 are crash-looping on startup with a fatal Go panic (seccomp policy already registered). All synthetic monitoring tasks using these units cannot run. The failure has been continuous since 2026-07-14T05:30Z and is confirmed still active as of 07:03Z. Immediate action: pin or roll back the Beats v7 alpha build (v7.0.0-alpha2.0.20260709214207-768b58b5d81c) to resolve the double-registration of the seccomp policy in the Heartbeat initialization path.",
    "criticality": 55,
    "confidence": 0.7,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Unit Spawn Fatal Error",
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the Beats v7 alpha build on the affected agentless pods: kubectl set image deployment/<agentless-deployment> heartbeat=docker.elastic.co/beats/heartbeat:<previous-stable-tag> -n <namespace>",
      "If rollback is not immediately available, cordon the affected node to stop new synthetics unit spawns: kubectl cordon <node-name> && kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data",
      "Once a fix build is available, patch the seccomp double-registration by ensuring heartbeat/security.InitializeModule() guards against re-registration: check heartbeat/security/seccomp.go and libbeat/common/seccomp/seccomp.go for missing once.Do() or registration-guard logic before deploying."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless Heartbeat/Synthetics component is crashing because the seccomp policy is being registered twice during initialization (panic: \"a seccomp policy is already registered\"), causing spawned units to exit fatally. The stack trace points to `heartbeat/security.mustConfigureSeccompPolicy` calling `libbeat/common/seccomp.MustRegisterPolicy` after it was already registered, introduced in Beats build v7.0.0-alpha2.0.20260709214207-768b58b5d81c."
  },
  {
    "event_id": "3d5848bd-830e-4049-8a4f-ad58ceef21f8",
    "timestamp": "2026-07-14T06:51:47.404Z",
    "created_at": "2026-07-14T06:51:47.404Z",
    "discovery_id": "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6-a32d2d7b-85c8-41b6-93ac-c49efe835261",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-service-type-not-configured-4c80faf4",
    "status": "acknowledged",
    "title": "Connectors — configuration validation: service type not configured",
    "summary": "Connectors service configuration validation is failing for agentless connector workloads due to a missing service type in the integration policy. Affected users are those attempting to run connector syncs under the impacted policy. Errors confirmed active as recently as 06:49Z (ongoing since ~05:00Z); connector syncs are blocked for the affected integration. Verify the connector policy configuration in Kibana Fleet and add the required service type to restore sync functionality.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the misconfigured connector policy: `kubectl exec -n <project-namespace> <agentless-pod> -- grep -r 'service_type' /agentless/data/` or inspect the connector configuration in Kibana under Stack Management → Connectors.",
      "Update the connector integration policy to include the required `service_type` field via the Kibana Fleet UI: navigate to Fleet → Agent Policies → select the affected policy → edit the connector integration and set the service type.",
      "If the connector was created without a service type, delete and recreate it with the correct configuration: use the Kibana Connectors UI or the Connectors API `PUT /api/connector/<id>` with the `service_type` field populated."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors service is erroring because the connector integration policy is missing required service type configuration, causing the connectors runtime to reject startup/config validation."
  },
  {
    "event_id": "5b113645-98b1-45c0-b2c1-58c64175ba5a",
    "timestamp": "2026-07-14T06:24:12.789Z",
    "created_at": "2026-07-14T06:24:12.789Z",
    "discovery_id": "ab4aa994-3bb1-4375-b1b3-aa400b926b3f",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-state-registry-cleanup-failure-d7e81043",
    "status": "acknowledged",
    "title": "CEL state registry — cleanup job: registry entry removal failing",
    "summary": "CEL state registry cleanup is logging persistent errors on agentless integrations (ti_abusech.url, google_workspace.chat) because the Elasticsearch state store delete returns 404 not_found and the cleanup code treats this as a failure rather than an idempotent success. Errors confirmed active as of 06:21Z and persisting since ~05:00Z. No data collection is blocked — this is a code-level defect in error handling. Schedule a fix to treat 404 on store/remove as success; suppress the alert rule if noise is impacting on-call quality.",
    "criticality": 35,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL State Registry Cleanup Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "File a bug against the CEL state registry cleanup code path to treat 404/not_found on store/remove as a success (idempotent delete) rather than an error, preventing spurious failure logs.",
      "Run: kubectl logs -n agentless -l component.type=cel --since=1h | grep 'Failed to remove all entries' to assess the frequency and scope of affected integrations before scheduling the fix.",
      "If the noise is causing alert fatigue, temporarily suppress the 'CEL State Registry Cleanup Failure' rule in Kibana → Stack Management → Rules until the code fix is deployed."
    ],
    "dependency_edges": [],
    "root_cause": "CEL state registry cleanup is failing because the state store delete/remove operation returns 404 not_found and is treated as an error, preventing registry entry cleanup from completing cleanly — the entry is already absent but the code does not handle idempotent deletes gracefully."
  },
  {
    "event_id": "845e01b2-c3b8-493c-bd53-d3a80e8177f9",
    "timestamp": "2026-07-14T06:23:42.358Z",
    "created_at": "2026-07-14T06:23:42.358Z",
    "discovery_id": "e3ad0f6b-b76f-4b7f-8cb4-8e0f8d256df1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-api-401-unauthorized-errors-98ed6a9b",
    "status": "acknowledged",
    "title": "Integration API — auth: 401 Unauthorized errors",
    "summary": "O365 CEL integration is DEGRADED because the configured Azure AD application is missing the required Office 365 Management API permission for DLP.All content type (error AF10001), causing all DLP audit subscription start requests to return 401 Unauthorized. O365 DLP audit log collection is silently halted for the affected integration. Failure confirmed active as of 06:19Z and persisting since ~05:00Z. Immediate action: add the missing ActivityFeed.Read permission to the Azure AD app registration and grant admin consent.",
    "criticality": 45,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Integration API 401 Unauthorized Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In Azure Portal → App Registrations, locate the O365 integration app and add the Office 365 Management APIs permission for 'ActivityFeed.Read' (DLP.All content type), then grant admin consent.",
      "In Kibana → Integrations → O365, verify the integration policy's application credentials match the updated app registration and trigger a policy re-push via Fleet.",
      "Run: kubectl get pods -n agentless -l k8s.elastic.co/agentless-integration-name=o365 -o wide to identify the affected CEL workload pod and confirm it transitions back to HEALTHY after permission grant."
    ],
    "dependency_edges": [],
    "root_cause": "Integration API requests are failing because the configured Azure AD application's permission set is missing the expected Office 365 Management API permission (AF10001), causing the O365 DLP subscription start to return 401 Unauthorized and the CEL component to enter DEGRADED state."
  },
  {
    "event_id": "a2720589-ac7b-405f-bf19-07cd5c082eab",
    "timestamp": "2026-07-14T06:23:10.262Z",
    "created_at": "2026-07-14T06:23:10.262Z",
    "discovery_id": "a4011945-4f7e-4a9e-b33c-7c91f629701b",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-missing-required-configuratio-034c3f11",
    "status": "acknowledged",
    "title": "Connectors — configuration validation: required fields missing",
    "summary": "Elastic Connectors (Azure Blob Storage, Slack) are failing field validation because required configuration fields are empty — Azure storage credentials and Slack authentication token/history window are not set. Affected connector instances cannot run any sync jobs until configuration is completed. Failures confirmed active as of 06:21Z and persisting since ~05:00Z with no sign of recovery. Schedule configuration remediation: identify all connector instances with empty required fields in Kibana and complete their setup.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Missing Required Configuration Fields"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "In Kibana → Integrations → Elastic Connectors, locate all connector instances showing 'Field validation errors' and complete their required configuration fields (account credentials for Azure Blob Storage, authentication token and history window for Slack).",
      "Run: kubectl get pods -n agentless -l k8s.elastic.co/agentless-integration-name=elastic_connectors -o wide to identify affected connector pods and their policy templates.",
      "If connectors were provisioned without intent, delete the incomplete connector policies via Kibana Fleet → Agent Policies to stop recurring validation error noise."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors are failing validation because required configuration fields (Azure Blob Storage account credentials and Slack authentication token/history window) are empty in the connector configuration, preventing any sync jobs from running."
  },
  {
    "event_id": "188e1df3-55ea-45af-b5f1-1d3c23a26bf1",
    "timestamp": "2026-07-14T05:51:51.301Z",
    "created_at": "2026-07-14T05:51:51.301Z",
    "discovery_id": "89a472cd-ce9e-4cca-bc11-0353383dd1e9",
    "discovery_slug": "agentless__agentless-unit-spawn-fatal-error-cbffd6de",
    "status": "acknowledged",
    "title": "Agentless Runtime — Heartbeat/Synthetics: seccomp policy double-registration crash",
    "summary": "Agentless runtime components in logging-gcp-us-central1 are crash-looping due to a Go panic triggered by a seccomp policy double-registration in the embedded Heartbeat/Synthetics component. Affected integrations include Cloudbeat CSPM GCP (cis_gcp), which is cycling through STOPPING→FAILED states. The failure is backend-only with no exposed user-facing dependency edges. Signal is stationary (p_value=0) with three confirmed evidence entries; onset confirmed at 2026-07-14T04:30:04Z and still active as of 05:46Z. Immediate action: identify and roll back the agent/component version that introduced the duplicate seccomp policy registration.",
    "criticality": 60,
    "confidence": 0.75,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component",
      "Agentless Component Entered FAILED State"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the agentless agent version in logging-gcp-us-central1 to the last known-good release: `elastic-agent upgrade <version> --fleet-url <url> --enrollment-token <token>` or via Fleet UI → Agent → Upgrade to previous version.",
      "If rollback is not immediately available, disable the Heartbeat/Synthetics integration on the affected agentless policy to stop the crash loop: `curl -X PUT <kibana>/api/fleet/agent_policies/<policy_id> -H 'kbn-xsrf: true' -d '{\"monitoring_enabled\":[]}'` or Fleet UI → Agent Policy → disable Synthetics inputs.",
      "File an urgent bug against the Heartbeat/Synthetics seccomp registration path and pin the affected agentless deployment to the stable version until a fix is released: `kubectl set image deployment/elastic-agent elastic-agent=docker.elastic.co/beats/elastic-agent:<stable-tag> -n <namespace>`."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless runtime is failing because the embedded Heartbeat/Synthetics component double-registers its seccomp policy on startup, triggering a Go panic (\"seccomp policy is already registered\") that terminates the process and drives agent-managed units (cloudbeat/cis_gcp-cspm) into FAILED state."
  },
  {
    "event_id": "fa1fa1b6-6d1f-4f59-9d4a-52e6bd4a8f02",
    "timestamp": "2026-07-14T05:44:38.856Z",
    "created_at": "2026-07-14T05:44:38.856Z",
    "discovery_id": "disc-uiam-proxy-20260714T0535Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-3ac0ca2d",
    "status": "acknowledged",
    "title": "UIAM — authentication endpoint: HTTP >=400 responses via proxy",
    "summary": "UIAM authentication service is returning HTTP >=400 errors on the _authenticate endpoint as seen through the ingress proxy (build 2447a0a8b20a). Affects callers routing authentication requests via proxy to /uiam/api/v1/authentication/_authenticate across up to 5 GKE clusters (prd-gcpusc1-cp-app-1 through -5). Signal is non-stationary (gradual drift, not a sudden outage) with failures confirmed continuously from 04:00 UTC through 05:42 UTC. Action: inspect proxy logs to classify the HTTP error codes (401 vs 403), check UIAM pod health across all clusters, and determine whether a recent deployment (uiam-0.1.0-git-d40ce2da37be) is the trigger.",
    "criticality": 55,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect recent UIAM proxy error responses to classify failure type: `kubectl logs -n uiam-regional -l app=uiam --since=30m | grep -E '(4[0-9]{2}|_authenticate)' | tail -50` to determine whether failures are 401 (credential/token) or 403 (authorization) and identify affected callers.",
      "Check UIAM pod health across all clusters: `kubectl get pods -n uiam-regional -o wide --context prd-gcpusc1-cp-app-1` (repeat for clusters 2, 3, 5) to confirm all replicas are Running and not in CrashLoopBackOff.",
      "If a recent deployment is suspected (current version uiam-0.1.0-git-d40ce2da37be), roll back via Helm: `helm rollback uiam -n uiam-regional` to restore the previous known-good version."
    ],
    "dependency_edges": [],
    "root_cause": "Ingress proxy requests to UIAM authentication endpoint are returning HTTP >=400 responses because UIAM authentication attempts are being rejected at the proxy/UIAM boundary (HTTP error responses on _authenticate)."
  },
  {
    "event_id": "1dcee8d9-465f-49b8-93eb-feeaf5dbd7ff",
    "timestamp": "2026-07-14T05:43:54.893Z",
    "created_at": "2026-07-14T05:43:54.893Z",
    "discovery_id": "disc-notion-connector-20260714T0535Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-notion-api-response-error-f05aed82",
    "status": "acknowledged",
    "title": "Connectors — Notion integration: API response errors",
    "summary": "Notion connector (connectors-py v1.1.0) is failing to connect to the Notion API due to an invalid API token, returning APIResponseError on every ping/sync attempt. Affects only the internal Notion data ingestion pipeline — no user-facing services are exposed. Failure has been continuous since at least 04:00 UTC with the most recent error confirmed at 05:41 UTC. Action: regenerate the Notion integration API token in the Notion workspace and update the connector policy in Fleet.",
    "criticality": 50,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Notion API Response Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Regenerate the Notion integration token: in the Notion workspace settings, navigate to Integrations, locate the Elastic connector integration, and generate a new API token; then update the connector configuration in Fleet UI under the Notion connector policy.",
      "Restart the affected connectors-py pod after updating credentials: `kubectl rollout restart deployment -n agentless -l k8s.elastic.co/agentless-integration-policy-template=notion` to force the connector to pick up the new token.",
      "Verify connectivity to the Notion API from the connector pod: `kubectl exec -n agentless <connectors-py-pod> -- curl -I https://api.notion.com/v1/users/me -H 'Authorization: Bearer <new-token>'` to confirm the token is valid before restarting."
    ],
    "dependency_edges": [],
    "root_cause": "Notion connector (connectors-py) is failing because the configured Notion API token is invalid (APIResponseError: API token is invalid), preventing all document synchronization."
  },
  {
    "event_id": "37dfd6fd-fca8-4fe5-ad12-ed090ae0ad1c",
    "timestamp": "2026-07-14T05:27:57.914Z",
    "created_at": "2026-07-14T05:27:57.914Z",
    "discovery_id": "c2736228-3190-441c-a3c1-3f19350a9d80",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__libbeat-output-read-errors-26dcc44e",
    "status": "acknowledged",
    "title": "Agentless log pipeline — libbeat output: read errors metric > 0",
    "summary": "Agentless log pipeline libbeat output read errors are ongoing in the logging-gcp-us-central1 environment. The non-zero read-error metric is confirmed active with the most recent event at 05:25 UTC. Impact is internal-only — no exposed dependency edges and no user-facing services are affected. The stationary change type indicates chronic background errors rather than a new failure. Correlate with downstream Elasticsearch output connectivity errors to determine if log forwarding gaps are occurring. Schedule a review of the libbeat output configuration and Elasticsearch cluster health.",
    "criticality": 25,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Read Errors"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check Elasticsearch output connectivity from the agentless beat: kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -sk <elasticsearch-output-url>/_cluster/health to verify the output cluster is reachable and healthy.",
      "Inspect libbeat output metrics for the specific beat instance: kubectl logs -n <agentless-namespace> <agentless-pod> | grep -E 'output.read.errors|output.events' to identify the error rate and whether events are being dropped or retried.",
      "If read errors correlate with Elasticsearch output throttling or connection resets, consider adjusting the libbeat output bulk_max_size or timeout settings in the agent policy: kubectl edit configmap <agentless-configmap> -n <agentless-namespace> and update the output.elasticsearch section."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "553477df-276f-42d5-8774-3ecc7a9b90ff",
    "timestamp": "2026-07-14T05:26:48.432Z",
    "created_at": "2026-07-14T05:26:48.432Z",
    "discovery_id": "e29a53a4-7c96-44f1-acd0-4d17778a564d",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsupported-protocol-scheme-d0a4d7c3",
    "status": "acknowledged",
    "title": "Agentless CEL input — URL parsing: unsupported protocol scheme",
    "summary": "Agentless CEL input pipeline is producing ongoing \"unsupported protocol scheme\" errors in the logging-gcp-us-central1 environment. Impact is internal-only — no exposed dependency edges and no user-facing services are affected. The error pattern is stationary (chronic, not a new spike), with the most recent matching event confirmed at 05:25 UTC. The misconfigured URL/protocol target has not been identified from log projections alone. Monitor for escalation; schedule a review of CEL input URL configurations in the agentless environment.",
    "criticality": 25,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the misconfigured CEL input by running: kubectl exec -n <agentless-namespace> <agentless-pod> -- grep -r 'unsupported protocol scheme' /agentless/data/ to locate the offending URL configuration, then correct the protocol scheme (e.g. change 'ftp://' or bare hostname to 'https://') in the affected integration policy via Fleet UI or API.",
      "Review all CEL input configurations in the agentless environment: kubectl get configmaps -n <agentless-namespace> -o yaml | grep -A5 'input_url' to enumerate configured URLs and validate each uses a supported scheme (https/http).",
      "If the error is tied to a specific integration policy, disable or reconfigure it via: curl -X PUT <kibana-url>/api/fleet/package_policies/<policy-id> with the corrected URL, then verify the CEL component transitions to HEALTHY state in the agentless pod logs."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "ee06d154-55b7-4c49-a53d-5a6976605b0b",
    "timestamp": "2026-07-14T05:13:34.640Z",
    "created_at": "2026-07-14T05:13:34.640Z",
    "discovery_id": "d561dde5-01fa-4bd5-9c42-e57518c0c32d",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__cel-input-malformed-or-missing-url-unsup-f71b2b03",
    "status": "acknowledged",
    "title": "Logging pipeline — mixed rules: low-volume stationary alert noise",
    "summary": "Agentless logging pipeline: proxy authentication failures and CEL input URL errors are both confirmed active and ongoing as of 05:11Z. Proxy 4xx auth failures on the _authenticate path and CEL 'unsupported protocol scheme' errors have been continuously occurring since at least 03:30Z (~1h 40m). Blast radius is internal — no exposed dependency edges, affecting agentless integration data collection only. Libbeat latency alert is unverifiable (no matching metric field). Investigate CEL input URL misconfiguration and proxy auth credential validity; check for recent agent policy changes around 03:30Z.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all",
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy",
      "CEL Input Malformed or Missing URL (Unsupported Protocol Scheme)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check and correct the CEL input URL configuration for affected agentless integrations: inspect the CEL input config in Fleet (Stack Management → Integrations → affected integration) and verify the input URL field is populated with a valid http:// or https:// scheme.",
      "Investigate proxy authentication failures for UIAM: run `kubectl logs -n <proxy-namespace> <proxy-pod> --since=1h | grep '_authenticate'` to identify which tenants or services are generating 4xx auth failures and whether credentials have expired or been misconfigured.",
      "Review recent agentless agent policy changes or deployments that may have introduced a malformed URL: check Fleet agent policy revision history for the affected agentless stacks and roll back any recent config changes if correlated with onset at ~03:30Z."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "0ea9f6c1-99be-48fb-8893-72cd0fc742fd",
    "timestamp": "2026-07-14T04:59:27.633Z",
    "created_at": "2026-07-14T04:59:27.633Z",
    "discovery_id": "ef2f104a-cafe-46a6-a945-043901667350",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__app-secrets-or-config-object-creation-c2227eee",
    "status": "acknowledged",
    "title": "agentless-api — deployments API: unexpected non-GET requests",
    "summary": "agentless-api is receiving ongoing non-GET (POST/DELETE) requests to /api/v1/serverless/deployments from Kibana, with provisioning-adjacent activity (cursor saves) also active. All dependency edges are internal; no user-facing exposure. No error rows confirmed — messages are informational. The pattern has been continuous since at least 03:30Z and was last seen at 04:54Z. SSH connector failure was not confirmed. Action: validate whether the non-GET caller (Kibana) is performing expected deployment mutations or anomalous provisioning activity.",
    "criticality": 35,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default",
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "App Secrets or Config Object Creation",
      "Unexpected HTTP Method on Deployments Endpoint",
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect agentless-api access logs for the non-GET caller identity: kubectl logs -n agentless-api -l app.kubernetes.io/name=agentless-api --since=2h | grep -E '(POST|DELETE).*deployments' to confirm whether Kibana is the sole caller and whether the operations are expected provisioning flows.",
      "If unexpected callers are found, restrict agentless-api deployments endpoint to GET-only via ingress policy: kubectl edit networkpolicy -n agentless-api to add an HTTP method allowlist, or update the agentless-api Helm values to enforce method restrictions.",
      "Verify SSH connector health for the connectors service: kubectl logs -n <connectors-namespace> -l service=connectors --since=2h | grep -i ssh to confirm whether SSH failures are occurring silently outside the queried window."
    ],
    "dependency_edges": [
      {
        "source": "kibana",
        "target": "agentless-api",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "connectors",
        "target": "confluence",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "connectors",
        "target": "elasticsearch",
        "protocol": "https",
        "exposure": "internal"
      }
    ]
  },
  {
    "event_id": "7c77cd7a-21f3-427b-8596-83a97f42657c",
    "timestamp": "2026-07-14T04:22:10.910Z",
    "created_at": "2026-07-14T04:22:10.910Z",
    "discovery_id": "connectors-retry-404-20260714T0409Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-python-client-api-retry-error-19e42df2",
    "status": "acknowledged",
    "title": "Connectors — Elasticsearch client: retrying refresh due to 404",
    "summary": "Connectors: connectors-py is continuously retrying Elasticsearch API refresh calls that return HTTP 404, indicating required connector indices are missing or inaccessible. Internal connector ingestion pipeline is degraded; no user-facing services are directly exposed. Onset ~03:00Z, confirmed still active at 04:18Z (~1h18m). Verify connector indices exist and restart connectors service if missing.",
    "criticality": 35,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Python Client API Retry Error"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify the required connector indices exist in Elasticsearch: check for .elastic-connectors and .elastic-connectors-sync-jobs indices via kubectl exec -n <agentless-namespace> <connectors-pod> -- curl -s http://localhost:9200/.elastic-connectors/_stats | jq '.indices | keys'",
      "If indices are missing, trigger index creation by restarting the connectors service: kubectl rollout restart deployment/<connectors-deployment> -n <agentless-namespace>",
      "Check connectors-py service logs for the full error context and whether the 404 is on a specific index: kubectl logs -n <agentless-namespace> <connectors-pod> --since=2h | grep -E '404|NotFoundError|index_not_found'"
    ],
    "dependency_edges": [
      {
        "source": "connectors",
        "target": "elasticsearch",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "connectors",
        "target": "confluence",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "Connectors sync/job execution is failing because connectors-py is retrying Elasticsearch API refresh operations that return HTTP 404, indicating required connector indices/endpoints are missing."
  },
  {
    "event_id": "c63a6840-503d-4b44-a8fd-d3f98160ebe5",
    "timestamp": "2026-07-14T04:19:40.373Z",
    "created_at": "2026-07-14T04:19:40.373Z",
    "discovery_id": "otel-stats-endpoint-closed-conn-20260714T0409Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__otel-stats-endpoint-closed-network-conne-058581bb",
    "status": "acknowledged",
    "title": "Agentless OTel collector — stats endpoint: closed network connection",
    "summary": "Agentless OTel collector: the stats endpoint Unix socket is repeatedly closing, indicating a collector process crash/restart cycle. Internal agentless observability pipeline is degraded; no user-facing services are exposed. Onset ~03:00Z, confirmed still active at 04:18Z. Monitor for escalation to sustained outage; inspect otel_manager/collector logs for crash root cause.",
    "criticality": 40,
    "confidence": 0.63,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Stats Endpoint Closed Network Connection"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect otel_manager and collector container logs for crash reason: kubectl logs -n <agentless-namespace> <agentless-pod> -c agentless --since=1h | grep -E 'otel|stats endpoint|panic|fatal'",
      "If a crash loop is confirmed, restart the affected agentless pod: kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>",
      "Check for OOM kills or resource exhaustion on the node: kubectl describe pod <agentless-pod> -n <agentless-namespace> | grep -A5 'OOMKilled\\|Reason\\|Exit Code'"
    ],
    "dependency_edges": [
      {
        "source": "elastic-agent (otel_manager)",
        "target": "otel collector stats endpoint",
        "protocol": "unix",
        "exposure": "internal"
      }
    ],
    "root_cause": "Agentless OTel collector is failing because its stats endpoint Unix socket is being closed by process exit/termination, causing accept() to fail with 'use of closed network connection' and indicating a crash/restart cycle."
  },
  {
    "event_id": "3a9a4597-bc74-4d22-a916-84c7442cc888",
    "timestamp": "2026-07-14T03:47:09.314Z",
    "created_at": "2026-07-14T03:47:09.314Z",
    "discovery_id": "connectors__connectors-field-validation-error-configu-8966f9c8-8966f9c8-c039-409e-b134-d446c7c099db",
    "discovery_slug": "connectors__connectors-field-validation-error-configu-8966f9c8",
    "status": "acknowledged",
    "title": "Connectors — connector configuration: field validation errors",
    "summary": "Connectors: connector sync jobs are failing due to connector configuration validation errors (ConfigurableFieldValueError). Required fields for the Confluence connector are empty, preventing sync jobs from starting. Connector-based ingestion cannot start for the affected connector(s) until required configuration fields are populated. Confirmed active at 03:43Z (onset 17:30 UTC, ~10.2h duration, no recovery). Populate the missing connector configuration fields in Kibana to unblock sync jobs.",
    "criticality": 55,
    "confidence": 0.68,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Field Validation Error (ConfigurableFieldValueError)"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the affected connector(s) and populate the missing required fields in Kibana: navigate to Stack Management → Connectors → [affected connector] and complete the configuration (Confluence Server password, Confluence URL label)",
      "If the connector was intentionally left unconfigured, disable it to stop recurring validation errors: kubectl exec -n <agentless-namespace> <connectors-pod> -- connectors disable --connector-id <id>",
      "Review all connectors with incomplete configuration: kubectl logs -n <agentless-namespace> -l component=connectors-py --since=1h | grep ConfigurableFieldValueError | sort -u"
    ],
    "dependency_edges": [],
    "root_cause": "Connectors is failing because required connector configuration fields are missing/empty (Confluence Server password, Confluence URL label), triggering ConfigurableFieldValueError validation failures that prevent connector sync jobs from starting."
  },
  {
    "event_id": "6bb602b2-bd8e-4045-aa13-1e2d7ebaf8a2",
    "timestamp": "2026-07-14T03:44:47.167Z",
    "created_at": "2026-07-14T03:44:47.167Z",
    "discovery_id": "96f59ef7-b3aa-496c-af0e-9e00bf30e752",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-missing-required-configuratio-b4faa200",
    "status": "acknowledged",
    "title": "Agentless integrations — connector runner: HTTP request processing error",
    "summary": "Agentless integrations/connectors: HTTP request processing errors are occurring in the agentless-log stream (logging-gcp-us-central1). Connector execution and Integration API interactions are affected. Two rules returned confirming rows at onset (03:36Z); a Fleet config-update rule shows stationary/background activity. No exposed dependency edges — impact is limited to connector-based ingestion pipelines. Onset 03:36 UTC, still active. Inspect the Integration API and connector runner for failing endpoints or auth/config issues.",
    "criticality": 48,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Missing Required Configuration Fields",
      "Integration API 401 Unauthorized Errors",
      "Fleet Config Update Received by Component"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect agentless connector runner logs for the specific failing endpoint: kubectl logs -n <agentless-namespace> -l component=connector-runner --since=30m | grep 'Error while processing http request'",
      "Check Integration API auth configuration for agentless connectors: kubectl get secret -n <agentless-namespace> connector-api-credentials -o yaml and verify token validity",
      "If 401 errors are confirmed, rotate the Integration API credentials: kubectl rollout restart deployment/connector-runner -n <agentless-namespace> after updating the secret"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "556f480d-9b5a-454d-9ff2-c7544b03a626",
    "timestamp": "2026-07-14T03:32:43.484Z",
    "created_at": "2026-07-14T03:32:43.484Z",
    "discovery_id": "symlink-missing-degraded-20260714T0325Z",
    "discovery_slug": "agentless__agent-data-symlink-missing-degraded",
    "status": "acknowledged",
    "title": "Agentless runtime — filesystem/home symlink: component management degraded",
    "summary": "Agentless elastic-agent: component management is degraded due to missing versioned-home/data symlink resolution during cleanup. The agent is actively cycling through degraded cleanup states (rescheduling every 10 minutes). Integrations on this agentless environment may collect data unreliably. Both rules confirmed active as of 03:31Z. Inspect agentless pod filesystem/symlink integrity and restore a clean runtime via restart or re-initialization.",
    "criticality": 55,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Elastic Agent Data Directory Symlink Missing",
      "Agentless Component Entered DEGRADED State"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Restart the affected agentless pod to trigger re-initialization of the filesystem and symlink: `kubectl rollout restart deployment/<agentless-pod-name> -n <namespace>` — check pod name via `kubectl get pods -n <namespace> -l app=agentless`.",
      "If restart does not resolve the symlink, inspect the pod filesystem directly: `kubectl exec -it <pod-name> -n <namespace> -- ls -la /opt/Elastic/Agent/data/` to verify symlink presence and target.",
      "If the symlink target directory is missing, re-provision the agentless environment via Fleet: navigate to Fleet > Agent Policies > [affected policy] > Unenroll and re-enroll the agentless agent to force a clean filesystem initialization."
    ],
    "dependency_edges": [
      {
        "source": "elastic-agent",
        "target": "agentless-managed components",
        "protocol": "internal",
        "exposure": "internal"
      }
    ],
    "root_cause": "Agentless elastic-agent is degraded because it cannot resolve the live versioned home/data symlink (readlink: no such file) during cleanup, indicating a corrupted or incomplete pod filesystem that disrupts component lifecycle management."
  },
  {
    "event_id": "c7bd058e-eb0c-412e-a8dc-a687f79bc268",
    "timestamp": "2026-07-14T03:32:11.158Z",
    "created_at": "2026-07-14T03:32:11.158Z",
    "discovery_id": "cel-registry-cleanup-20260714T0325Z",
    "discovery_slug": "cel__state-registry-cleanup-failure",
    "status": "acknowledged",
    "title": "CEL — state registry store: cleanup failures",
    "summary": "CEL inputs: state registry cleanup is actively failing while removing entries from the Elasticsearch-backed agentless-state store (404 Not Found). Affected CEL integrations may ingest data unreliably (duplicates or missed events) while registry entries cannot be cleaned. Confirmed active as of 03:30Z. Validate agentless-state index integrity and the CEL registry cleanup path to Elasticsearch.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL State Registry Cleanup Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the agentless-state index for the affected CEL integration: `curl -s -u elastic:<password> 'https://<es-host>:9200/agentless-state-cel-*/_cat/indices?v'` — look for missing or red indices.",
      "If the agentless-state index is missing, recreate it or trigger a re-initialization of the affected CEL integration via Fleet: navigate to Fleet > Integrations > [affected integration] > Re-enroll or restart the agentless policy.",
      "If the index exists but is corrupt, delete and recreate: `curl -s -u elastic:<password> -X DELETE 'https://<es-host>:9200/agentless-state-cel-<integration-id>'` then restart the CEL input to reinitialize state."
    ],
    "dependency_edges": [
      {
        "source": "cel",
        "target": "elasticsearch",
        "protocol": "https",
        "exposure": "internal"
      }
    ],
    "root_cause": "CEL registry cleanup is failing because the Elasticsearch-backed agentless-state registry store returns 404 Not Found during remove operations, indicating the state store index was deleted or never initialized for the affected integration."
  },
  {
    "event_id": "5d733d31-b281-440d-9a8d-d7529662cde5",
    "timestamp": "2026-07-14T03:03:03.368Z",
    "created_at": "2026-07-14T03:03:03.368Z",
    "discovery_id": "uiam-proxy-auth-stationary-20260714T0242Z",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-authentication-failures-via-proxy-89eb369a",
    "status": "acknowledged",
    "title": "UIAM — proxy authentication: suspected failures (unconfirmed)",
    "summary": "UIAM proxy authentication: failures with HTTP 4xx/5xx responses are actively occurring on the proxy service as of 02:58 UTC. The detection signal has an invalid p_value (sentinel 0), but independent query verification confirms ongoing auth failures on the _authenticate path. No exposed dependency edges identified; blast radius is bounded to users authenticating via the proxy path. Schedule investigation to identify the scope of affected users and the root cause of auth rejections.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check UIAM proxy authentication error rate: kubectl logs -n ingress-proxy -l app=ingress-proxy --tail=200 | grep -i 'authenticate\\|401\\|403\\|500' to identify the volume and pattern of auth failures.",
      "Verify UIAM service health and token validation endpoint availability: curl -sk https://<uiam-internal-endpoint>/health and check for elevated latency or error responses.",
      "If auth failures are isolated to a specific organization or project, check the project's identity provider configuration in Kibana (Security → Identity Providers) and rotate the affected credentials."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "eed5894c-3269-4a6b-a64e-7301242c2485",
    "timestamp": "2026-07-14T03:02:34.611Z",
    "created_at": "2026-07-14T03:02:34.611Z",
    "discovery_id": "connectors-ssh-connection-failure-dip-20260714T0242Z",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__connectors-ssh-connection-failure-f2bc8bd1",
    "status": "acknowledged",
    "title": "Connectors — SSH: connection failures flagged",
    "summary": "Connectors: an SSH connection failure alert fired with a credible signal (dip, p_value 0.000165). One error row was found but the message is generic — no SSH-specific connection refusal signature confirmed. Agentless connector SSH operations may be intermittently failing. Impact is bounded to connector-initiated SSH tasks; no exposed user-facing dependency edges. Schedule investigation to identify the affected connector and verify SSH credentials.",
    "criticality": 35,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors SSH Connection Failure"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check connector SSH configuration and credentials: review the connector configuration in Kibana (Stack Management → Connectors) for any SSH connectors showing errors, and verify SSH key/password credentials are valid.",
      "Inspect agentless pod logs for the affected connector: kubectl logs -n <project-namespace> -l k8s.elastic.co/agentless-integration-name=connectors --tail=100 | grep -i 'ssh\\|connect\\|error'",
      "If SSH connector errors are isolated to a single project, rotate the SSH credentials for that connector via the Kibana Connectors UI and trigger a test connection."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "69c80a8a-96ef-49d2-a33d-ed057c0c4cf6",
    "timestamp": "2026-07-14T02:30:39.952Z",
    "created_at": "2026-07-14T02:30:39.952Z",
    "discovery_id": "769d1498-c9a9-409e-aa47-ab52a7272004",
    "discovery_slug": "logging-gcp-us-central1-logs-all__elasticsearch-controller-errors-and-warn-4ab3da84",
    "status": "acknowledged",
    "title": "Elasticsearch controller — controller logs: warnings/errors detected",
    "summary": "Elasticsearch controller: error/warning logs detected and still active as of ~02:01 UTC. Affects controller operations in GCP us-central1; no exposed user-facing services identified. Low volume (1 alert), onset ~01:39 UTC, errors present ~27 minutes later — not recovering. Failure mechanism unknown due to schema gap in log projection. Inspect controller pod logs directly to identify the failing operation.",
    "criticality": 15,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Elasticsearch Controller Errors and Warnings"
    ],
    "cause_ki_ids": [],
    "recommendations": [
      "Check elasticsearch-controller pod logs directly: kubectl logs -n <namespace> -l app=elasticsearch-controller --since=30m | grep -E 'error|warning' to identify the failing mechanism",
      "If errors are recurring, describe the controller pod to check for recent events: kubectl describe pod -n <namespace> -l app=elasticsearch-controller",
      "If errors indicate a reconciliation loop failure, check the ECK operator status: kubectl get elasticsearch --all-namespaces and review any clusters in degraded state"
    ],
    "dependency_edges": []
  },
  {
    "event_id": "agentless__otel-collector-exited-with-error-otel--49d734d5-9a02de9b-4b2f-46af-9f66-459483b724f7",
    "timestamp": "2026-07-14T01:16:57+00:00",
    "created_at": "2026-07-13T23:57:34+00:00",
    "discovery_id": "agentless__otel-collector-exited-with-error-otel--49d734d5-e93ab932-b7f0-404b-a96a-982ca9bf3c8a",
    "discovery_slug": "agentless__otel-collector-exited-with-error-otel--49d734d5",
    "status": "acknowledged",
    "title": "Agentless — OTel collector management: recovery restart loop",
    "summary": "Agentless OTel collector: the managed collector is crash-looping in otel_manager recovery, causing repeated exits and RPC session cancellations. Agentless telemetry collection is unreliable while the restart loop persists; no downstream services are exposed. Inspect the OTel collector configuration for an invalid AWS credentials provider extension block and correct or remove it to break the restart loop.",
    "criticality": 55,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the OTel collector configuration deployed by otel_manager for the awscredentialsprovider extension and remove or correct the invalid block (no credentials, assume_role, or profile set): kubectl exec -n <agentless-namespace> <elastic-agent-pod> -- cat /etc/otelcol/config.yaml | grep -A10 awscredentialsprovider",
      "Restart the elastic-agent pod to force otel_manager to reload a corrected configuration and break the restart loop: kubectl rollout restart deployment/<elastic-agent-deployment> -n <agentless-namespace>",
      "If the AWS credentials provider is not required for this deployment, disable or remove the extension from the OTel collector config and redeploy: kubectl edit configmap <otelcol-config-configmap> -n <agentless-namespace>"
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "elastic-agent (otel_manager)",
        "target": "otel-collector"
      }
    ],
    "root_cause": "Agentless OTel collection is failing because the managed OTel collector is crash-looping in otel_manager recovery due to an invalid awscredentialsprovider configuration (no credentials, assume role, or profile set), which repeatedly forces collector exits and disrupts agent RPC sessions."
  },
  {
    "event_id": "agentless__fleet-config-update-received-by-componen-e0ee7eda-2a588117-9c48-40eb-9691-2ee94856e7ac",
    "timestamp": "2026-07-14T01:03:14+00:00",
    "created_at": "2026-07-14T01:03:14+00:00",
    "discovery_id": "agentless__fleet-config-update-received-by-componen-e0ee7eda-e0ee7eda-3f80-4c2f-aaef-8882ccc7f391",
    "discovery_slug": "agentless__fleet-config-update-received-by-componen-e0ee7eda",
    "status": "acknowledged",
    "title": "Agentless — OTel collector: invalid configuration restart loop",
    "summary": "Agentless platform: the managed OTel collector is crash-looping due to missing AWS credentials configuration across multiple AWS CloudWatch input targets (RDS, SQS, ECS, ELB, EC2, Lambda), blocking telemetry collection for all affected agentless AWS integrations. The collector has accumulated 1,513 recovery restarts as of 00:59 UTC with no sign of recovery. Review the AWS integration policy for the affected agentless workload and supply valid credentials, an assume-role ARN, or a named profile for each awscredentialsprovider extension.",
    "criticality": 55,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "For each failing AWS CloudWatch input integration (RDS, SQS, ECS, ELB, EC2, Lambda), open the integration policy in Fleet and supply at least one of: AWS access key/secret, an IAM assume-role ARN, or a named profile — then save and redeploy the policy to trigger a collector restart with valid configuration: navigate to Fleet → Integrations → affected policy → edit each AWS CloudWatch input and populate the credentials section.",
      "If IAM role-based auth is intended, verify the agentless workload's pod/node IAM role has the required CloudWatch and STS permissions and remove the explicit awscredentialsprovider extension config to fall back to the default SDK credential chain — apply via `kubectl edit configmap <otel-collector-config> -n <agentless-namespace>` and restart the affected agentless pod.",
      "If the integrations are misconfigured by the end user (incomplete setup), disable or delete the affected AWS integrations in Fleet to stop the crash loop immediately — `elastic-agent unenroll` or remove via Fleet UI — then re-add them with complete credential configuration."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless OTel collector is crash-looping because the AWS credentials provider extension is configured without required auth settings (credentials, assume role, or profile), causing startup validation failure and repeated otel_manager recovery restarts."
  },
  {
    "event_id": "agentless__agentless-component-entered-degraded-state-e8a33615-9cfa6538-9713-4283-9734-57192b2ab59f",
    "timestamp": "2026-07-14T00:53:19+00:00",
    "created_at": "2026-07-13T16:51:21+00:00",
    "discovery_id": "agentless__agentless-component-entered-degraded-state-e8a33615-f4d8b43b-d6d5-4089-a85d-aea23707abb9",
    "discovery_slug": "agentless__agentless-component-entered-degraded-state-e8a33615",
    "status": "acknowledged",
    "title": "Agentless runtime — component health: entered DEGRADED state",
    "summary": "Agentless runtime: at least one agentless-managed component is operating in a DEGRADED state, reducing or interrupting data collection for the affected integration. The source log index is currently unreachable (telemetry gap), so current state cannot be confirmed — treat as ongoing until re-verified. Check agentless component pod health via kubectl get pods -n <agentless-namespace> and restart any pods stuck in a degraded state.",
    "criticality": 48,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless component pod health: kubectl get pods -n <agentless-namespace> and kubectl describe pod <degraded-pod> to identify the degraded component and its failure reason; restart if stuck: kubectl rollout restart deployment/<component> -n <agentless-namespace>.",
      "Restore or confirm access to the logging-gcp-us-central1-logs-agentless-log-default data stream so current-state re-verification can confirm whether the DEGRADED state has cleared.",
      "Review Fleet UI > Agents for the affected agentless agent to check its reported health status and whether any policy or integration configuration change preceded the DEGRADED state onset at 23:30 UTC."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless runtime is degraded because an agentless-managed component is repeatedly reporting DEGRADED state during its periodic health/cleanup cycle (1 ES|QL-confirmed DEGRADED-state signature since onset)."
  },
  {
    "event_id": "agentless__integration-api-401-unauthorized-errors-f4d8b43b-9cfa6538-9713-4283-9734-57192b2ab59f",
    "timestamp": "2026-07-14T00:53:18+00:00",
    "created_at": "2026-07-14T00:53:18+00:00",
    "discovery_id": "agentless__integration-api-401-unauthorized-errors-f4d8b43b-f4d8b43b-d6d5-4089-a85d-aea23707abb9",
    "discovery_slug": "agentless__integration-api-401-unauthorized-errors-f4d8b43b",
    "status": "acknowledged",
    "title": "Agentless integrations — upstream API auth: 401 unauthorized",
    "summary": "Agentless integrations: at least one external integration API call is being rejected with HTTP 401 Unauthorized, blocking data collection for the affected integration. The source log index is currently unreachable (telemetry gap), so current state cannot be confirmed — treat as ongoing until the index is restored and re-verified. Verify and rotate the affected integration's API credentials in Fleet > Integrations, then restore index access to re-confirm resolution.",
    "criticality": 45,
    "confidence": 0.4,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify the agentless integration's API credentials are valid and not expired: open Fleet > Integrations, locate the affected integration, and rotate or re-enter the API key/token for the upstream service.",
      "Restore or confirm access to the logging-gcp-us-central1-logs-agentless-log-default data stream — check ILM rollover status, index lifecycle policy, and data stream routing to resolve the index-absent condition blocking re-verification.",
      "If credentials are confirmed valid, check the upstream API provider's status page and review agentless pod logs via kubectl logs -n <agentless-namespace> -l component=agentless for recent 401 error context to identify the specific integration and API endpoint."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless integration collection is failing because upstream integration API credentials are being rejected (HTTP 401 Unauthorized in structured error fields), blocking authenticated API calls until credentials are corrected or rotated (1 ES|QL-confirmed 401/Unauthorized signature since onset)."
  },
  {
    "event_id": "connectors__connectors-elasticsearch-index-not-foun-2032fddb-fe2ea5af-72ce-429a-93c9-40c40e002838",
    "timestamp": "2026-07-14T00:33:57+00:00",
    "created_at": "2026-07-14T00:33:57+00:00",
    "discovery_id": "connectors__connectors-elasticsearch-index-not-foun-2032fddb-2032fddb-a6c6-49f8-8829-9cf6a5016099",
    "discovery_slug": "connectors__connectors-elasticsearch-index-not-foun-2032fddb",
    "status": "acknowledged",
    "title": "Connectors — Elasticsearch backing indices: missing index",
    "summary": "Connectors: connector sync and job operations are failing due to missing Elasticsearch connector system indices, producing index-not-found and refresh 404 errors. Connector-backed ingestion jobs cannot complete while the indices are absent. Re-verification was not possible (source index inaccessible — telemetry gap); signal is credible based on 2 corroborating log matches but current state is unconfirmed. Verify connector system indices exist in Elasticsearch and trigger re-initialization if missing.",
    "criticality": 55,
    "confidence": 0.52,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify connector system indices exist: run GET /_cat/indices/.elastic-connectors* in Kibana Dev Tools — if absent, restart the connectors service to allow auto-bootstrap: kubectl rollout restart deployment/<connectors-deployment> -n <connectors-namespace>",
      "If indices remain missing after restart, trigger explicit re-initialization via the connectors API: POST /api/connector/_sync_jobs — this directly addresses the index-not-found root cause and is reversible.",
      "If index creation continues to fail, check Elasticsearch cluster health and available disk space: GET /_cluster/health and GET /_cat/allocation?v — a full disk or red cluster state will block index creation regardless of service restarts."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "connectors",
        "target": "elasticsearch"
      }
    ],
    "root_cause": "Connectors service is erroring because required connector system indices are missing in Elasticsearch, causing index-not-found and refresh 404 errors."
  },
  {
    "event_id": "agentless__agentless-unit-spawn-fatal-error-2032fddb-fe2ea5af-72ce-429a-93c9-40c40e002838",
    "timestamp": "2026-07-14T00:33:56+00:00",
    "created_at": "2026-07-14T00:33:56+00:00",
    "discovery_id": "agentless__agentless-unit-spawn-fatal-error-2032fddb-2032fddb-a6c6-49f8-8829-9cf6a5016099",
    "discovery_slug": "agentless__agentless-unit-spawn-fatal-error-2032fddb",
    "status": "acknowledged",
    "title": "Agentless — synthetics unit startup: fatal spawn",
    "summary": "Agentless: a synthetics unit is failing to start and exits fatally during spawn, preventing that unit from performing its work. The agentless-to-synthetics dependency is internal and not externally exposed. Re-verification was not possible (source index inaccessible — telemetry gap); signal is credible based on 1 prior log match but current state is unconfirmed. Check agentless pod logs for seccomp or startup crash signatures and restart the affected synthetics unit.",
    "criticality": 45,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check agentless pod logs for the affected synthetics unit to identify the specific error before acting: kubectl logs -n <agentless-namespace> <agentless-pod> --container synthetics | grep -iE 'fatal|spawn|seccomp'",
      "Restart the affected synthetics unit by cycling the agentless pod — this is reversible and targets only the failing unit: kubectl rollout restart deployment/<agentless-deployment> -n <agentless-namespace>",
      "If restart does not resolve the issue, review the seccomp policy configuration for the agentless runtime container and compare against the expected policy profile; update the pod security context if a policy conflict is confirmed: kubectl edit deployment/<agentless-deployment> -n <agentless-namespace>"
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "synthetics"
      }
    ],
    "root_cause": "Agentless runtime is failing to start a synthetics unit because a startup crash (seccomp policy registration conflict) terminates the unit and the stats endpoint unix socket stops accepting connections."
  },
  {
    "event_id": "connectors__connectors-python-client-api-retry-error-4d6de0b6-71ab20b4-306f-40c1-9ad1-6ba7ef8100bd",
    "timestamp": "2026-07-14T00:11:18+00:00",
    "created_at": "2026-07-14T00:11:14+00:00",
    "discovery_id": "connectors__connectors-python-client-api-retry-error-4d6de0b6-4d6de0b6-4bc8-4727-81fe-44dcc1e8f93b",
    "discovery_slug": "connectors__connectors-python-client-api-retry-error-4d6de0b6",
    "status": "acknowledged",
    "title": "Connectors — backend API operations: client retry errors",
    "summary": "Connectors: connectors-py is retrying Elasticsearch API calls due to backend errors, which can delay or block connector sync operations for affected users. Index is currently inaccessible for re-verification — confirm connector sync health via the Kibana Connectors UI and check Elasticsearch availability for the affected connector's target index.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the Kibana Connectors UI (Stack Management → Connectors) for connectors showing error or degraded sync status and review the last sync error message to identify the specific failing endpoint.",
      "Verify Elasticsearch cluster health and confirm the target index for the affected connector exists and is accessible: `curl -s -u elastic:<pass> https://<es-host>/_cluster/health?pretty` and `GET /<target-index>/_stats`.",
      "If the target index is missing or the connector is misconfigured, recreate or reconfigure the connector via the Kibana Connectors UI and trigger a manual sync to confirm recovery."
    ],
    "dependency_edges": [],
    "root_cause": "Connectors sync/job execution is degraded because connectors-py is retrying Elasticsearch API calls due to 404 responses (1 ES|QL-confirmed retry signature)."
  },
  {
    "event_id": "proxy__external-unauthorized-access-attempts-e484022b-beb2c2db-4b59-4ecd-9862-4a31153aaf16",
    "timestamp": "2026-07-13T23:36:20+00:00",
    "created_at": "2026-07-13T23:36:20+00:00",
    "discovery_id": "proxy__external-unauthorized-access-attempts-e484022b-e484022b-4582-497d-b645-7d04a819b557",
    "discovery_slug": "proxy__external-unauthorized-access-attempts-e484022b",
    "status": "acknowledged",
    "title": "Proxy — ingress authentication: external 401s",
    "summary": "Proxy: external requests are being rejected with HTTP 401 responses at the ingress proxy, confirmed still occurring as of 23:32 UTC. External callers cannot successfully authenticate on the affected proxy-exposed paths. Review proxy access logs for the volume and source distribution of 401s to determine whether this is a misconfigured legitimate client or a scanning pattern.",
    "criticality": 40,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Review proxy access logs for the rate and source IP distribution of external 401 responses to distinguish a misconfigured legitimate client from a scanning or brute-force pattern: `kubectl logs -n <namespace> <proxy-pod> | grep ' 401 ' | awk '{print $1}' | sort | uniq -c | sort -rn | head -20`.",
      "If a specific external client or IP range is responsible for the bulk of 401s, apply a rate-limit or block rule at the ingress layer to contain the volume: update the proxy ingress configuration or WAF rule to throttle or deny the offending source.",
      "If the 401s originate from a legitimate client with a misconfigured credential, rotate or reissue the affected API key or token and notify the client team."
    ],
    "dependency_edges": [],
    "root_cause": "Proxy is returning HTTP 401 to external requests because external clients are attempting unauthorized access against proxy-exposed endpoints (1 KI query match since onset; sampled row did not include request detail fields)."
  },
  {
    "event_id": "agentless__otel-stats-endpoint-closed-network-conne-e484022b-beb2c2db-4b59-4ecd-9862-4a31153aaf16",
    "timestamp": "2026-07-13T23:36:19+00:00",
    "created_at": "2026-07-13T23:36:19+00:00",
    "discovery_id": "agentless__otel-stats-endpoint-closed-network-conne-e484022b-e484022b-4582-497d-b645-7d04a819b557",
    "discovery_slug": "agentless__otel-stats-endpoint-closed-network-conne-e484022b",
    "status": "acknowledged",
    "title": "Agentless — OTel stats endpoint: closure event",
    "summary": "Agentless OTel collector: the stats endpoint is crash-looping with a closed network connection error compounded by an AWS credentials provider misconfiguration. Integrations relying on agentless-managed OTel collection are experiencing telemetry gaps while the collector repeatedly exits and attempts recovery. Correct the AWS credentials configuration for the affected OTel collector instance and verify no stale stats socket is blocking restart.",
    "criticality": 45,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the agentless OTel collector configuration for the awscredentialsprovider extension (component: otelcol-aws-elb) and supply at least one of credentials, assume_role, or profile — or remove the auth option to fall back to the default SDK credential chain — then restart: `systemctl restart elastic-agent` or the equivalent agentless restart command.",
      "Check for a stale stats socket file at the path shown in the error and remove it if present before restarting: `rm -f /agentless/data/tmp/<socket-file>.sock && systemctl restart elastic-agent`.",
      "If the crash loop persists after config correction, roll back the agentless collector to the previous known-good version: `helm rollback elastic-agent -n <namespace>`."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "connectors__connectors-service-type-not-configured-e8a33615-13e77cbe-ff50-4541-8dcc-ea376627f516",
    "timestamp": "2026-07-13T22:44:10+00:00",
    "created_at": "2026-07-13T16:51:27+00:00",
    "discovery_id": "connectors__connectors-service-type-not-configured-e8a33615-9c5d8da1-576a-4fc2-a5da-7ac6dc922fb9",
    "discovery_slug": "connectors__connectors-service-type-not-configured-e8a33615",
    "status": "acknowledged",
    "title": "Connectors — configuration: service type not configured",
    "summary": "Connectors: connector sync and job execution is blocked because connectors-py cannot start due to a missing service type configuration. Users cannot run connector syncs for the affected connector while this misconfiguration persists; 1 confirming error row since 19:00 UTC. Locate the affected connector in the Kibana Connectors UI and add the required service type to its configuration.",
    "criticality": 45,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "In the Kibana Connectors UI (Stack Management → Connectors), locate the connector reporting the 'Service type is not configured' error, update its configuration to include the required service type field, save, and re-trigger a sync.",
      "Verify the connector document in the .elastic-connectors index has a non-empty service_type field: GET .elastic-connectors/_search with a filter on the affected connector ID.",
      "If the service type cannot be determined from the connector document, delete and recreate the connector with the correct service type via the Kibana UI or Connectors API."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "connectors",
        "target": "elasticsearch"
      }
    ],
    "root_cause": "Connectors is failing because the connector configuration is missing the required service type, preventing connectors-py from starting/running sync jobs (1 ES|QL-confirmed error row since 19:00 UTC)."
  },
  {
    "event_id": "agentless__httpjson-retryable-http-request-failures-9c5d8da1-13e77cbe-ff50-4541-8dcc-ea376627f516",
    "timestamp": "2026-07-13T22:43:57+00:00",
    "created_at": "2026-07-13T22:43:57+00:00",
    "discovery_id": "agentless__httpjson-retryable-http-request-failures-9c5d8da1-9c5d8da1-576a-4fc2-a5da-7ac6dc922fb9",
    "discovery_slug": "agentless__httpjson-retryable-http-request-failures-9c5d8da1",
    "status": "acknowledged",
    "title": "Agentless HTTPJSON integration — outbound HTTP: retryable request failures",
    "summary": "Agentless HTTPJSON integration: outbound HTTP requests are failing after retries in the retryablehttp client, preventing data collection from the upstream API. Consumers of the affected integration cannot rely on ingested data while failures persist; 1 confirming failure row since 19:00 UTC with no recovery signal. Check upstream API endpoint reachability and review integration credentials or network egress policy for the affected agentless pod.",
    "criticality": 45,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect agentless pod logs for the affected HTTPJSON integration to identify the specific upstream URL and HTTP error code returned after retries: kubectl logs -n <agentless-namespace> -l component.type=httpjson --since=1h",
      "Verify network egress and DNS resolution from the agentless pod to the upstream API endpoint — confirm the endpoint is reachable and returning expected responses from within the pod.",
      "If the upstream API requires authentication, rotate or re-validate the API credentials in the integration policy and trigger a policy re-apply via the Fleet UI or API."
    ],
    "dependency_edges": [],
    "root_cause": "Agentless HTTPJSON-based integration collection is failing because outbound HTTP requests via the retryablehttp client are failing after retries (\"request failed\"), preventing successful collection from the upstream API endpoint (1 ES|QL-confirmed row since 19:00 UTC)."
  },
  {
    "event_id": "agentless__agentless-component-entered-degraded-stat-71c9a6ac-edce70f1-3cc0-49a8-b414-488fe4135916",
    "timestamp": "2026-07-13T20:38:23+00:00",
    "created_at": "2026-07-13T20:38:22+00:00",
    "discovery_id": "agentless__agentless-component-entered-degraded-stat-71c9a6ac-71c9a6ac-8558-43cb-9876-a181b4a0754e",
    "discovery_slug": "agentless__agentless-component-entered-degraded-stat-71c9a6ac",
    "status": "acknowledged",
    "title": "Agentless — runtime management: components degraded",
    "summary": "Agentless: agentless-managed components are in a persistent DEGRADED state and the agent cannot resolve its versioned home symlink, causing cleanup to reschedule every 10 minutes with no recovery. Data collection for workloads on this agentless runtime is degraded — both conditions confirmed active at 20:35 UTC. Restart the affected agentless pod to trigger a clean re-initialization and symlink recreation.",
    "criticality": 55,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Restart the affected agentless pod to trigger clean pod initialization and re-creation of the versioned home symlink: kubectl rollout restart deployment/<agentless-deployment> -n <namespace>.",
      "If restart does not resolve the symlink, exec into the pod and inspect the data directory: kubectl exec -it <pod> -n <namespace> -- ls -la /usr/share/elastic-agent/data — verify or manually recreate the symlink pointing to the correct versioned home directory.",
      "If the pod repeatedly enters DEGRADED state after restart, check the agentless deployment's persistent volume or ephemeral storage configuration for capacity or mount issues: kubectl describe pod <pod> -n <namespace>."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "elastic-agent",
        "target": "agentless-managed-components"
      }
    ],
    "root_cause": "Agentless elastic-agent is degraded because it cannot resolve the live versioned home/data symlink (readlink no such file), indicating a corrupted or incomplete pod filesystem that disrupts component lifecycle management and leaves components in a DEGRADED state."
  },
  {
    "event_id": "connectors__connectors-field-validation-error-configu-71c9a6ac-edce70f1-3cc0-49a8-b414-488fe4135916",
    "timestamp": "2026-07-13T20:38:18+00:00",
    "created_at": "2026-07-13T20:38:17+00:00",
    "discovery_id": "connectors__connectors-field-validation-error-configu-71c9a6ac-71c9a6ac-8558-43cb-9876-a181b4a0754e",
    "discovery_slug": "connectors__connectors-field-validation-error-configu-71c9a6ac",
    "status": "acknowledged",
    "title": "Connectors — configuration validation: required fields missing",
    "summary": "Connectors: one or more connectors are blocked by missing required configuration fields (authentication token and message history window not set). Connector syncs for the affected connector cannot run until the configuration is completed — error confirmed active at 20:35 UTC. Open the affected connector's configuration in Kibana and supply the missing required fields to unblock sync.",
    "criticality": 40,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Open Kibana → Connectors, locate the connector reporting ConfigurableFieldValueError, and fill in the required fields ('Authentication Token' and 'Days of message history to fetch'), then save and re-trigger a sync.",
      "If the connector was recently created or cloned, verify all mandatory fields were populated during setup — check the connector's edit page for any highlighted empty required fields.",
      "If the connector is no longer needed, delete or disable it to suppress recurring validation error alerts from this instance."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "connectors",
        "target": "connector-configuration"
      }
    ],
    "root_cause": "Connectors are failing because required connector configuration fields are empty or invalid (ConfigurableFieldValueError), blocking connector operation and preventing sync from running until configuration is completed."
  },
  {
    "event_id": "agentless-api__app-secrets-or-config-object-creation-9f110aa9-3bf96427-5225-4371-9267-8e07b252519e",
    "timestamp": "2026-07-13T20:06:06+00:00",
    "created_at": "2026-07-13T20:06:05+00:00",
    "discovery_id": "agentless-api__app-secrets-or-config-object-creation-9f110aa9-9f110aa9-54ae-4ce4-b589-9f3d35021e0f",
    "discovery_slug": "agentless-api__app-secrets-or-config-object-creation-9f110aa9",
    "status": "acknowledged",
    "title": "Agentless API — deployments API: app secrets/config created",
    "summary": "Agentless API: app secrets and config object creation events were detected in the deployments API path, with Kibana-originated provisioning workflows exposed via mTLS. The source log stream is currently unreachable (index unknown), so active state cannot be confirmed or cleared — treat as unresolved until telemetry is restored. Restore visibility to the agentless-api log stream and verify whether secret and config creation activity is still occurring.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check GCP Logging export pipeline health for the agentless-api workload: verify the log sink for logging-gcp-us-central1-logs-agentless-api-log-default is active and not throttled (`gcloud logging sinks describe <sink-name> --project=<project>`).",
      "If the log stream is confirmed missing, inspect the agentless-api pod logs directly for recent secret and config creation events: `kubectl logs -n agentless-api -l app=agentless-api --since=30m | grep -i 'secret\\|config\\|create'`.",
      "If creation events are confirmed still occurring and are unexpected, review the Kubernetes RBAC and service account permissions bound to the agentless-api workload to determine whether the operations are authorized: `kubectl get rolebindings,clusterrolebindings -n agentless-api -o wide`."
    ],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "mTLS",
        "source": "kibana",
        "target": "agentless-api"
      }
    ]
  },
  {
    "event_id": "libbeat__libbeat-output-read-errors-b79cfc6e-b4538374-dcda-48d0-9b8a-2e3bd67a4ce7",
    "timestamp": "2026-07-13T19:19:58+00:00",
    "created_at": "2026-07-13T19:19:56+00:00",
    "discovery_id": "libbeat__libbeat-output-read-errors-b79cfc6e-b79cfc6e-a5df-4a0c-8495-ffaf989ed8b5",
    "discovery_slug": "libbeat__libbeat-output-read-errors-b79cfc6e",
    "status": "acknowledged",
    "title": "Elastic Agent — output pipeline: read errors",
    "summary": "Elastic Agent/Beat: event shipping is degraded with output read errors on the agentless output pipeline, causing potential ingestion gaps for this agentless-managed stream. 1 confirming metric breach at onset (17:00 UTC); current-state re-verification is unavailable due to a telemetry gap. Check the Elasticsearch output endpoint connectivity and TLS configuration for the affected agentless Beat.",
    "criticality": 40,
    "confidence": 0.42,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check the Elasticsearch output endpoint connectivity from the agentless Beat: `kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v https://<es-output-host>:9200/_cluster/health` — if TLS or connection errors appear, verify the output TLS certificate and CA bundle are current.",
      "Review the agentless Beat output configuration for the affected integration: `kubectl get configmap -n <agentless-namespace> <beat-config> -o yaml | grep -A 20 output.elasticsearch` — check for mismatched hosts, credentials, or protocol settings.",
      "Restart the agentless Beat process to clear any stuck output connection state: `kubectl rollout restart deployment/<agentless-beat-deployment> -n <agentless-namespace>` — monitor the libbeat output read errors metric after restart to confirm recovery."
    ],
    "dependency_edges": [],
    "root_cause": "Elastic Agent/Beat output shipping is degraded because the output connection is encountering response read errors (monitoring.metrics.libbeat.output.read.errors > 0 confirmed by 1 rule-matched ES|QL row since 17:00 UTC)."
  },
  {
    "event_id": "cel__cel-input-retryable-http-request-failure-b79cfc6e-b4538374-dcda-48d0-9b8a-2e3bd67a4ce7",
    "timestamp": "2026-07-13T19:19:55+00:00",
    "created_at": "2026-07-13T19:19:54+00:00",
    "discovery_id": "cel__cel-input-retryable-http-request-failure-b79cfc6e-b79cfc6e-a5df-4a0c-8495-ffaf989ed8b5",
    "discovery_slug": "cel__cel-input-retryable-http-request-failure-b79cfc6e",
    "status": "acknowledged",
    "title": "CEL integration — outbound HTTP: retryable request failures",
    "summary": "CEL integration: outbound API collection calls are failing after retries, causing ingestion gaps for the affected CEL-based integration. 1 confirming error row at onset (17:00 UTC); current-state re-verification is unavailable due to a telemetry gap. Verify the target API endpoint is reachable from the agentless environment and check the CEL integration credentials for expiry.",
    "criticality": 40,
    "confidence": 0.42,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify the target API endpoint is reachable from the agentless pod: `kubectl exec -n <agentless-namespace> <agentless-pod> -- curl -v <target-api-url>` — if unreachable, check network policies and DNS resolution for the agentless namespace.",
      "Review the CEL integration configuration in Fleet for credential expiry or URL changes: navigate to Fleet > Integrations > <affected CEL integration> and verify the API URL and authentication credentials are current.",
      "Restart the affected CEL integration input by disabling and re-enabling the integration policy in the Fleet UI — this forces a clean reconnection attempt and clears any stuck retry state in the input.cel.retryablehttp client."
    ],
    "dependency_edges": [],
    "root_cause": "CEL-based integration collection is failing because outbound HTTP requests are failing even after retries in the input.cel.retryablehttp client (1 rule-matched ES|QL row since 17:00 UTC)."
  },
  {
    "event_id": "cel__cel-input-malformed-or-missing-url-unsup-3ef2e82d-b9584618-1c8c-4e60-afc1-55c14a2c5cea",
    "timestamp": "2026-07-13T18:18:01+00:00",
    "created_at": "2026-07-13T18:18:01+00:00",
    "discovery_id": "cel__cel-input-malformed-or-missing-url-unsup-3ef2e82d-3ef2e82d-4be7-449b-bb4b-0d8d4144df5d",
    "discovery_slug": "cel__cel-input-malformed-or-missing-url-unsup-3ef2e82d",
    "status": "acknowledged",
    "title": "CEL integration — input URL: unsupported protocol scheme",
    "summary": "CEL integration: data collection is failing because the configured input URL is missing or uses an unsupported protocol scheme, preventing the affected CEL-based integration from ingesting data. Re-verification was blocked by a telemetry gap (index unreachable); last confirmed error at 18:00 UTC. Review and correct the CEL integration input URL in the affected integration policy in Fleet.",
    "criticality": 45,
    "confidence": 0.43,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Open the affected CEL integration policy in Fleet → Integrations, locate the CEL input URL field, and correct it to a valid URL with a supported scheme (http:// or https://); save and redeploy the policy to the agentless integration to clear the unsupported-protocol-scheme error.",
      "If the URL was intentionally left blank or uses a placeholder, check whether the integration was recently cloned or migrated without completing configuration; delete and recreate the integration with a valid endpoint URL.",
      "After correcting the URL, confirm the error clears by reviewing agentless component logs for the specific integration: `kubectl logs -n <agentless-namespace> <agentless-pod> | grep 'unsupported protocol scheme'`."
    ],
    "dependency_edges": [],
    "root_cause": "CEL-based integration collection is failing because the configured input URL is missing or has an unsupported protocol scheme, triggering unsupported-protocol-scheme evaluation failures (1 rule-matched ES|QL row since 17:00 UTC)."
  },
  {
    "event_id": "connectors__connectors-notion-api-response-error-3ef2e82d-b9584618-1c8c-4e60-afc1-55c14a2c5cea",
    "timestamp": "2026-07-13T18:17:19+00:00",
    "created_at": "2026-07-13T18:17:13+00:00",
    "discovery_id": "connectors__connectors-notion-api-response-error-3ef2e82d-3ef2e82d-4be7-449b-bb4b-0d8d4144df5d",
    "discovery_slug": "connectors__connectors-notion-api-response-error-3ef2e82d",
    "status": "acknowledged",
    "title": "Connectors — Notion datasource: API response error",
    "summary": "Connectors: Notion connector is failing with API response errors during sync and ping operations, preventing Notion document synchronization for the affected connector. Re-verification was blocked by a telemetry gap (index unreachable); last confirmed error at 18:00 UTC. Verify and rotate the Notion API integration token in the connector configuration as the most immediate action.",
    "criticality": 50,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Verify and rotate the Notion API integration token in the affected connector configuration: navigate to Stack Management → Connectors, locate the Notion connector, and re-enter a valid API token with the required page and database read permissions, then trigger a manual sync to confirm the error clears.",
      "Check the Notion API status page and confirm the integration has been granted access to the target workspace pages; if access was recently revoked, re-authorize the integration and re-run a connector ping from the connector detail view to observe the live response.",
      "If credentials are valid and the Notion API is healthy, inspect agentless connector pod logs for the full APIResponseError payload to identify whether the error is a rate-limit (429), permission (403), or resource-not-found (404) response: `kubectl logs -n <agentless-namespace> <connectors-py-pod> | grep APIResponseError`."
    ],
    "dependency_edges": [],
    "root_cause": "Notion connector sync/connectivity is failing because the Notion client is raising API response errors during connector ping/sync operations, consistent with invalid credentials/permissions for the Notion integration (1 rule-matched ES|QL row since 17:00 UTC)."
  },
  {
    "event_id": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5-b37d3055-9554-43aa-a251-6914a5d7cfe5",
    "timestamp": "2026-07-13T17:16:32+00:00",
    "created_at": "2026-07-13T12:45:40+00:00",
    "discovery_id": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5-4d98cab1-cad7-416d-831a-d2250ff42cdf",
    "discovery_slug": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5",
    "status": "acknowledged",
    "title": "UIAM — authentication endpoint: proxy-routed auth failures",
    "summary": "UIAM: authentication requests routed through the ingress proxy are failing with HTTP >=400 on the _authenticate path. Users relying on proxy-routed UIAM authentication cannot complete login; failures confirmed active as of 17:12 UTC with no recovery signal. Check proxy upstream connectivity to the UIAM authentication service and review recent proxy routing configuration changes.",
    "criticality": 58,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy service health and upstream UIAM backend connectivity: kubectl logs -n <proxy-namespace> -l app=proxy --since=15m | grep '_authenticate' to confirm whether failures are consistent or intermittent, then verify the UIAM upstream target is reachable from the proxy pod.",
      "Inspect proxy routing rules for the _authenticate path: kubectl get configmap -n <proxy-namespace> proxy-config -o yaml and confirm the upstream URL and health-check settings for the UIAM authentication endpoint are correct.",
      "If the UIAM upstream is confirmed unreachable, restart the UIAM authentication service pod: kubectl rollout restart deployment/<uiam-service> -n <uiam-namespace> and monitor proxy error rate for recovery."
    ],
    "dependency_edges": [],
    "root_cause": "UIAM authentication is failing because the ingress proxy path for the UIAM _authenticate endpoint is returning non-2xx responses (1 rule-matched ES|QL row since 16:00 UTC)."
  },
  {
    "event_id": "agentless-api__namespace-already-exists-during-provision-1b24d32d-71601d21-fcc9-41b2-bf62-e30978c4e524",
    "timestamp": "2026-07-13T17:04:28+00:00",
    "created_at": "2026-07-13T17:04:23+00:00",
    "discovery_id": "agentless-api__namespace-already-exists-during-provision-1b24d32d-1b24d32d-4bb8-4e56-bd3e-8362ab1113e6",
    "discovery_slug": "agentless-api__namespace-already-exists-during-provision-1b24d32d",
    "status": "acknowledged",
    "title": "Agentless API — provisioning: namespace already exists",
    "summary": "Agentless API: provisioning is failing for deployments where the target Kubernetes namespace already exists, blocking the provisioning workflow for affected tenants. Operators attempting to provision agentless integrations via Kibana will see provisioning failures until the namespace collision is resolved. Identify and clean up orphaned namespaces in the provisioning cluster, or add idempotency handling to the provisioning controller.",
    "criticality": 45,
    "confidence": 0.58,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Identify the colliding namespace and, if it is an orphaned or stale resource, delete it to unblock provisioning: kubectl get namespace <target-namespace> -o yaml && kubectl delete namespace <target-namespace> (verify no active workloads are present before deletion)",
      "Trigger a re-provisioning attempt for the affected deployment via the agentless-api after namespace cleanup: curl -X POST <agentless-api>/v1/deployments/<deployment-id>/reprovision -H 'Authorization: Bearer <token>'",
      "If namespace cleanup is not immediately safe, patch the provisioning controller to use an upsert/idempotent namespace creation strategy to prevent recurrence: kubectl set env deployment/agentless-api-controller NAMESPACE_CREATE_STRATEGY=upsert -n <namespace>"
    ],
    "dependency_edges": [],
    "root_cause": "Agentless API provisioning is failing because the target Kubernetes namespace already exists, blocking namespace creation for the provisioning workflow."
  },
  {
    "event_id": "o365__o365-dlp-subscription-permission-error-a-1b24d32d-71601d21-fcc9-41b2-bf62-e30978c4e524",
    "timestamp": "2026-07-13T17:04:05+00:00",
    "created_at": "2026-07-13T17:04:04+00:00",
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-1b24d32d-1b24d32d-4bb8-4e56-bd3e-8362ab1113e6",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-1b24d32d",
    "status": "acknowledged",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365 DLP collector: audit subscription start is failing with an unauthorized permission error (AF10001), and the collector has transitioned to a degraded state. Security and compliance consumers cannot rely on DLP audit data being ingested until the Azure AD application permission is corrected. Verify that the configured Azure AD app registration has the Office 365 Management API DLP.All permission granted and admin-consented.",
    "criticality": 55,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "In Azure AD, open the app registration used by the O365 DLP collector, add the Office 365 Management APIs application permission (ActivityFeed.Read or DLP.All), then grant admin consent: az ad app permission add --id <app-id> --api 00000007-0000-0000-c000-000000000000 --api-permissions <permission-id>=Role && az ad app permission admin-consent --id <app-id>",
      "Restart the agentless O365 DLP collector pod to force a fresh subscription-start attempt after the permission is corrected: kubectl rollout restart deployment/<o365-dlp-collector> -n <namespace>",
      "If the permission grant is delayed, temporarily disable the DLP subscription rule to suppress alert noise and open a ticket with the Azure AD admin team to expedite the permission grant."
    ],
    "dependency_edges": [],
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application permission set is missing the required Office 365 Management API permission for DLP.All, causing subscription start to fail with unauthorized errors (AF10001)."
  },
  {
    "event_id": "agentless__agentless-component-entered-degraded-state-4b738b1b-ccda527e-c8f3-4153-a1ec-d470f5fcb2ab",
    "timestamp": "2026-07-13T16:04:38+00:00",
    "created_at": "2026-07-13T16:04:36+00:00",
    "discovery_id": "agentless__agentless-component-entered-degraded-state-4b738b1b-4b738b1b-2290-4f2f-9440-63d10a96ca79",
    "discovery_slug": "agentless__agentless-component-entered-degraded-state-4b738b1b",
    "status": "acknowledged",
    "title": "Agentless — integrations: degraded state and 401 unauthorized",
    "summary": "Agentless: at least one agentless-managed integration is operating in a degraded state while integration API calls are failing with 401 Unauthorized, blocking external data collection. GCP, GKE, and Wolfi workloads are exposed; consumers of agentless integration ingestion cannot rely on timely or complete data. Two failure signatures were confirmed in the discovery window (onset 14:30 UTC) but re-verification is not possible due to a telemetry gap. Rotate or revalidate the API credentials for the affected integration in the Fleet UI immediately.",
    "criticality": 65,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate or revalidate the API credentials for the integration returning 401 Unauthorized: identify the affected integration in the Fleet UI (Stack Management → Integrations → Agentless), open its policy, update the API key or token, save, and redeploy the policy to trigger a credential refresh.",
      "If credential rotation is not immediately possible, check whether the 401 is caused by an expired token or misconfigured API endpoint: review the integration configuration in Fleet and compare against the external API provider's current auth requirements. Correct the endpoint or auth method and redeploy the policy.",
      "If the component remains DEGRADED after credential correction, force a component restart to reinitialize with fresh credentials: `kubectl delete pod -l component=<affected-integration> -n agentless` and monitor the replacement pod for a return to HEALTHY state in Fleet."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "cel",
        "target": "ess-billing"
      }
    ],
    "root_cause": "Agentless-managed integrations are degraded because integration API authentication is failing (401 Unauthorized), producing repeated request-processing errors and leaving at least one component running in a DEGRADED state (2 rule-matched ES|QL confirmations since 2026-07-13T14:30:00Z)."
  },
  {
    "event_id": "elastic-agent__elastic-agent-data-directory-symlink-missing-e417241d-6b357637-f9e9-4176-af98-b8a2589f57c1",
    "timestamp": "2026-07-13T15:19:15+00:00",
    "created_at": "2026-07-13T15:19:15+00:00",
    "discovery_id": "elastic-agent__elastic-agent-data-directory-symlink-missing-e417241d-e417241d-c578-43a7-98da-8bc6f768b44b",
    "discovery_slug": "elastic-agent__elastic-agent-data-directory-symlink-missing-e417241d",
    "status": "acknowledged",
    "title": "Elastic Agent — data directory: live symlink missing",
    "summary": "Elastic Agent: data directory cleanup is failing because the live versioned home symlink cannot be resolved, leaving orphan directories on affected agentless hosts. Core data collection may be degraded if the inconsistent data directory state affects component operation. Errors confirmed active as of 15:15 UTC. Inspect the Elastic Agent data directory on affected hosts and repair or recreate the missing symlink.",
    "criticality": 38,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "On affected agentless hosts, inspect the Elastic Agent data directory (typically /opt/Elastic/Agent/data/) for missing or broken symlinks; recreate the live symlink pointing to the current versioned agent home: `ln -sfn /opt/Elastic/Agent/data/<version>/ /opt/Elastic/Agent/data/elastic-agent-<version>`.",
      "If the symlink issue is widespread across agentless deployments, trigger a re-enrollment or agent upgrade via Fleet to force a clean data directory setup: `elastic-agent enroll --force ...` or initiate an upgrade policy in the Fleet UI.",
      "If orphan directories are accumulating and consuming disk, manually remove stale versioned directories under the agent data path after confirming the active version: inspect with `ls -la /opt/Elastic/Agent/data/` then remove orphaned entries with `rm -rf`."
    ],
    "dependency_edges": [],
    "root_cause": "Elastic Agent is failing because it cannot resolve its live versioned home symlink in the data directory during cleanup, leaving orphan directories and indicating a corrupted/incomplete agent data-directory state (1 rule-matched ES|QL confirmation since 2026-07-13T13:30:00Z)."
  },
  {
    "event_id": "agentless__fleet-config-update-received-by-componen-1dc7d7dd-62f4b189-cd71-457d-bf7e-a6d448d07940",
    "timestamp": "2026-07-13T15:03:41+00:00",
    "created_at": "2026-07-13T15:03:40+00:00",
    "discovery_id": "agentless__fleet-config-update-received-by-componen-1dc7d7dd-1dc7d7dd-30c0-44de-b39f-cba05d59519c",
    "discovery_slug": "agentless__fleet-config-update-received-by-componen-1dc7d7dd",
    "status": "acknowledged",
    "title": "Agentless runtime — OTel collector: invalid configuration and component panics",
    "summary": "Agentless runtime: multiple components are crash-looping due to two concurrent failures — a heartbeat/synthetics seccomp panic (fatal crash at startup, confirmed 14:59:44Z) and an OTel collector invalid-configuration exit (missing AWS credentials across 6 service targets, confirmed 14:59:59Z). Agentless integrations for AWS CloudWatch and synthetics monitoring are not collecting data with no recovery observed. Roll back the agentless agent to the version prior to 2026-07-09 to address the seccomp panic, and correct the awscredentialsprovider credentials in the affected Fleet policies.",
    "criticality": 62,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the agentless agent package to the version prior to 2026-07-09 via Fleet → Agent policies → [affected policy] → Settings → Agent version. This addresses the seccomp double-registration panic in the heartbeat receiver that is causing the crash loop.",
      "For each affected AWS integration (aws-lambda, aws-rds, aws-ecs, aws-sqs, aws-ec2, aws-elb), open the Fleet integration policy and set credentials, assume_role, or profile in the AWS credentials section — or remove the explicit auth option to use the default SDK credential chain. Save and re-deploy.",
      "If rollback is not immediately available, disable the heartbeat/synthetics and AWS CloudWatch OTel integrations in the affected agentless Fleet policy to stop the crash-restart loops, then re-enable after both the agent version and credentials configuration are corrected."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "opentelemetry-collector"
      }
    ],
    "root_cause": "Agentless runtime is failing because a configuration rollout introduced (1) a seccomp policy registration conflict that triggers Go panics and terminates components and (2) an invalid OTel collector configuration missing required AWS credentials settings, causing otel_manager to exit the collector and enter recovery restarts (2 rule-matched ES|QL confirmations since 13:00 UTC; Fleet update event unverified this cycle)."
  },
  {
    "event_id": "agentless__seccomp-policy-conflict-in-heartbeat-synt-2ff05b08-62f4b189-cd71-457d-bf7e-a6d448d07940",
    "timestamp": "2026-07-13T15:03:40+00:00",
    "created_at": "2026-07-13T15:03:40+00:00",
    "discovery_id": "agentless__seccomp-policy-conflict-in-heartbeat-synt-2ff05b08-2ff05b08-2c6a-4fa7-a5ff-11b27fdd78d8",
    "discovery_slug": "agentless__seccomp-policy-conflict-in-heartbeat-synt-2ff05b08",
    "status": "acknowledged",
    "title": "Agentless — heartbeat/synthetics: seccomp policy panic",
    "summary": "Agentless heartbeat/synthetics: components are crash-looping at startup due to a seccomp policy double-registration panic in the heartbeat receiver, preventing synthetics monitoring from running for affected agentless integrations. Confirmed active at 14:59:44Z with no recovery. Roll back the agentless agent to the version prior to 2026-07-09 to eliminate the double-registration condition.",
    "criticality": 55,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Roll back the agentless agent package (elastic-agent) to the previous release version via Fleet → Agent policies → [affected policy] → Settings → Agent version, targeting the version prior to the deployment on 2026-07-09. This directly addresses the seccomp double-registration introduced in the current build.",
      "If a rollback is not immediately available, disable the heartbeat/synthetics integration in the affected agentless Fleet policy to stop the crash loop, then re-enable after the agent version is corrected.",
      "File an urgent bug against the heartbeat receiver factory (hbreceiver/factory.go) for the seccomp MustRegisterPolicy double-call path, and pin the affected agentless deployments to the stable version until a fix is released."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "heartbeat/synthetics"
      }
    ],
    "root_cause": "Agentless heartbeat/synthetics components are failing because the process panics during startup when a seccomp policy is registered while one is already registered, terminating the component."
  },
  {
    "event_id": "agentless__aws-otel-collector-missing-credentials-c-2ff05b08-62f4b189-cd71-457d-bf7e-a6d448d07940",
    "timestamp": "2026-07-13T15:03:39+00:00",
    "created_at": "2026-07-13T15:03:39+00:00",
    "discovery_id": "agentless__aws-otel-collector-missing-credentials-c-2ff05b08-2ff05b08-2c6a-4fa7-a5ff-11b27fdd78d8",
    "discovery_slug": "agentless__aws-otel-collector-missing-credentials-c-2ff05b08",
    "status": "acknowledged",
    "title": "Agentless — AWS OTel collector: missing credentials config",
    "summary": "Agentless OTel collector: AWS CloudWatch data collection is failing across 6 integration targets (lambda, rds, ecs, sqs, ec2, elb) because the awscredentialsprovider extension is missing required credentials configuration, causing the collector to exit and enter a recovery-restart loop. AWS telemetry ingestion is disrupted for all affected agentless integrations with no recovery as of 15:00 UTC. Open the Fleet integration policy for each affected AWS integration and set at least one of credentials, assume_role, or profile — or remove the explicit auth option to fall back to the default SDK credential chain.",
    "criticality": 55,
    "confidence": 0.62,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "For each affected agentless integration (aws-lambda, aws-rds, aws-ecs, aws-sqs, aws-ec2, aws-elb), open the Fleet integration policy in Kibana and set at least one of credentials, assume_role, or profile in the AWS credentials section — or remove the explicit auth option to use the default SDK credential chain. Save and re-deploy the policy.",
      "If a recent Fleet policy update introduced the empty credentials block, roll back that policy version via Fleet → Policies → [affected policy] → Settings → revert to the previous revision.",
      "If the credentials configuration cannot be corrected immediately, disable the affected AWS CloudWatch OTel integrations in Fleet to stop the crash-restart loop and reduce noise, then re-enable after the credentials are corrected."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "aws-cloudwatch-otel-collector"
      }
    ],
    "root_cause": "Agentless AWS CloudWatch OTel collector components are failing because awscredentialsprovider is configured without any of credentials/assume_role/profile, causing configuration validation failure and preventing the collector path from starting."
  },
  {
    "event_id": "connectors__connectors-elasticsearch-index-not-found-cbffd6de-3226ace9-1eac-4834-a5c8-4669e9cdb741",
    "timestamp": "2026-07-13T14:38:46+00:00",
    "created_at": "2026-07-13T14:38:46+00:00",
    "discovery_id": "connectors__connectors-elasticsearch-index-not-found-cbffd6de-cbffd6de-a4ea-4e09-b67f-101097fcd8df",
    "discovery_slug": "connectors__connectors-elasticsearch-index-not-found-cbffd6de",
    "status": "acknowledged",
    "title": "Connectors — Elasticsearch storage: index not found",
    "summary": "Connectors: sync operations are failing with index_not_found_exception for the .elastic-connectors-sync-jobs index — confirmed active as of 14:34 UTC, persisting for over 90 minutes since onset at ~13:00 UTC. Connector sync jobs cannot be tracked or executed until the missing index is restored; the connectors → Elasticsearch dependency is internal and not externally exposed. Re-initialize the connectors system indices via the Kibana connectors setup API to recreate the missing index.",
    "criticality": 50,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Re-initialize the connectors system indices via the Kibana connectors setup API: `curl -X POST 'https://<kibana-host>/api/connector/_setup' -H 'kbn-xsrf: true' -u <user>:<pass>` — this recreates missing system indices including .elastic-connectors-sync-jobs without affecting existing connector configurations.",
      "Verify the .elastic-connectors-sync-jobs index status directly: `curl -X GET 'https://<es-host>/.elastic-connectors-sync-jobs?pretty' -u <user>:<pass>` — if missing, confirm whether it was deleted by an ILM policy, snapshot restore, or manual action before recreating.",
      "If the setup API fails, check for index template conflicts: `curl -s 'https://<es-host>/_index_template/.elastic-connectors*' -u <user>:<pass>` and verify the template is present and valid; restore from the connectors package if the template is missing."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "connectors",
        "target": "elasticsearch"
      }
    ]
  },
  {
    "event_id": "agentless__dns-resolution-failures-in-integratio-cbffd6de-3226ace9-1eac-4834-a5c8-4669e9cdb741",
    "timestamp": "2026-07-13T14:38:42+00:00",
    "created_at": "2026-07-13T14:38:41+00:00",
    "discovery_id": "agentless__dns-resolution-failures-in-integratio-cbffd6de-cbffd6de-a4ea-4e09-b67f-101097fcd8df",
    "discovery_slug": "agentless__dns-resolution-failures-in-integratio-cbffd6de",
    "status": "acknowledged",
    "title": "Agentless integrations — outbound DNS: resolution failures",
    "summary": "Agentless integrations: DNS resolution failures signaled in error messages since ~13:00 UTC, but active DNS failures are unconfirmed — the re-verification query returned the same document as the index-not-found query, suggesting a partial-term match rather than a genuine 'no such host' hit. Integrations that cannot resolve external API hostnames will silently stop collecting data; the agentless → DNS dependency is not externally exposed. Manually inspect error.message fields on the agentless stream for 'no such host' entries and verify whether affected pods can resolve external hostnames.",
    "criticality": 35,
    "confidence": 0.35,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "On the GKE node(s) hosting agentless pods, run `kubectl exec -n <agentless-namespace> <pod> -- nslookup <failing-hostname>` to confirm whether DNS resolution is failing at the pod level and identify which hostnames are unresolvable.",
      "Check the agentless pod DNS configuration: `kubectl get pod <pod> -n <agentless-namespace> -o yaml | grep -A5 dnsConfig` — verify nameserver and search domain entries are correct and that the cluster DNS service (CoreDNS) is healthy via `kubectl get pods -n kube-system -l k8s-app=kube-dns`.",
      "If a specific integration's external API hostname is misconfigured, update the integration policy in Kibana Fleet to correct the endpoint URL, then trigger a policy re-push to the affected agentless deployment."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "udp",
        "source": "agentless-integrations",
        "target": "dns"
      }
    ]
  },
  {
    "event_id": "connectors__connectors-field-validation-error-config-5e9243fd-5ff506d8-a5e0-4ba7-be96-b9dda695ce9c",
    "timestamp": "2026-07-13T14:15:28+00:00",
    "created_at": "2026-07-13T14:15:28+00:00",
    "discovery_id": "connectors__connectors-field-validation-error-config-5e9243fd-5e9243fd-4936-41db-9cd8-20b8facf96c1",
    "discovery_slug": "connectors__connectors-field-validation-error-config-5e9243fd",
    "status": "acknowledged",
    "title": "Connectors — connector configuration: service type not configured / missing required fields",
    "summary": "Connectors: connector sync jobs are not running due to configuration errors — service type is not configured and required fields are failing validation (ConfigurableFieldValueError). Confluence-backed connector ingestion cannot proceed until configuration is corrected. Review and complete the connector configuration in Kibana Stack Management → Connectors for the affected connector instance.",
    "criticality": 45,
    "confidence": 0.5,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Open Kibana Stack Management → Connectors, locate the connector reporting errors, and complete the required configuration fields (service type and any mandatory fields flagged by ConfigurableFieldValueError); save and trigger a manual sync to verify.",
      "If the connector was recently deployed or migrated, re-run the connector setup wizard to ensure all required fields are populated; verify that the connector service type matches a supported and licensed connector type in this deployment.",
      "If configuration cannot be completed immediately, disable the affected connector to stop repeated validation error logs and schedule a configuration review; this prevents log noise without data loss."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "connectors",
        "target": "confluence"
      }
    ],
    "root_cause": "Connectors is failing because connector policies/config are incomplete (service_type unset and required configuration fields empty), causing startup/validation errors that prevent sync jobs from running (2 rule-matched ES|QL confirmations since 12:30 UTC)."
  },
  {
    "event_id": "httpjson__httpjson-retryable-http-request-failures-5e9243fd-5ff506d8-a5e0-4ba7-be96-b9dda695ce9c",
    "timestamp": "2026-07-13T14:15:28+00:00",
    "created_at": "2026-07-13T14:15:28+00:00",
    "discovery_id": "httpjson__httpjson-retryable-http-request-failures-5e9243fd-5e9243fd-4936-41db-9cd8-20b8facf96c1",
    "discovery_slug": "httpjson__httpjson-retryable-http-request-failures-5e9243fd",
    "status": "acknowledged",
    "title": "HTTPJSON — outbound API calls: retryable request failures",
    "summary": "HTTPJSON integration: outbound API calls are failing after retries, stalling data collection for at least one HTTPJSON-based integration. Consumers of that integration's ingested data cannot rely on timely delivery. Check the HTTPJSON input configuration and upstream API availability in Fleet, and review agent logs for the specific endpoint returning failures.",
    "criticality": 40,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect the HTTPJSON integration configuration in Fleet for the affected integration: verify the target API URL, authentication credentials, and retry settings are correct and the upstream API is reachable (`curl -v <target_api_url>` from the agentless host).",
      "Restart the affected agentless integration via Fleet UI (Integrations → select integration → Actions → Restart) to clear any transient connection state and force a fresh retry cycle.",
      "If the upstream API is confirmed unreachable, temporarily disable the HTTPJSON integration to stop retry noise and open a ticket with the upstream API owner; re-enable once the API is restored."
    ],
    "dependency_edges": [],
    "root_cause": "HTTPJSON integrations are failing because outbound HTTP requests to an external API are failing even after retries, stalling data collection (1 rule-matched ES|QL confirmation since 12:30 UTC)."
  },
  {
    "event_id": "docker-registry__docker-registry-authorization-warnings-ba2d0f08-bf2bc1d3-3520-4dbc-b5ea-6e7e08de2fb5",
    "timestamp": "2026-07-13T14:02:28+00:00",
    "created_at": "2026-07-13T14:02:21+00:00",
    "discovery_id": "docker-registry__docker-registry-authorization-warnings-ba2d0f08-ba2d0f08-1820-4f12-a5e9-f6baedc2fbdf",
    "discovery_slug": "docker-registry__docker-registry-authorization-warnings-ba2d0f08",
    "status": "acknowledged",
    "title": "Docker registry — image pull path: authorization warnings and manifest errors",
    "summary": "Docker registry: authorization warnings and OCI manifest errors are occurring in the container-library namespace. Workloads pulling images from the registry are on the exposed image-pull-clients → docker-registry HTTPS path and may fail to pull required images, causing pod start failures. Inspect registry pod logs for the specific failing image reference and client identity, and verify pull secret validity across dependent workloads.",
    "criticality": 48,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Inspect docker registry pod logs in the container-library namespace for the specific authorization and manifest error messages: kubectl logs -n container-library -l app=docker-registry --since=2h | grep -E 'warning|error|manifest|unauthorized' — identify the failing image reference and client identity.",
      "Verify registry credentials and service account image pull secrets for workloads in the container-library namespace: kubectl get secrets -n container-library | grep dockerconfigjson — re-create or rotate pull secrets if expired or misconfigured.",
      "If manifest errors persist after credential remediation, re-push or re-tag the affected image to repair any corrupted manifest layers: docker pull <image> && docker tag <image> <registry>/container-library/<image> && docker push <registry>/container-library/<image>"
    ],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "https",
        "source": "image-pull-clients",
        "target": "docker-registry"
      },
      {
        "exposure": "exposed",
        "protocol": "https",
        "source": "image-pull-clients",
        "target": "docker-registry"
      }
    ],
    "root_cause": "Docker registry image pulls are failing because the registry is emitting authorization warnings and manifest-related errors in the container-library namespace (2 rule-matched query results returned rows, but the error text was not present in the returned fields)."
  },
  {
    "event_id": "proxy__external-unauthorized-access-attempts-215221e0-e5f510fe-3e32-4cb3-9f70-2da92d5c3a6b",
    "timestamp": "2026-07-13T13:45:16+00:00",
    "created_at": "2026-07-13T13:45:12+00:00",
    "discovery_id": "proxy__external-unauthorized-access-attempts-215221e0-215221e0-ee58-49a0-95bf-f9dbc00a1a20",
    "discovery_slug": "proxy__external-unauthorized-access-attempts-215221e0",
    "status": "acknowledged",
    "title": "Proxy — external access: unauthorized requests rejected",
    "summary": "Proxy: external requests are being rejected with HTTP 401 Unauthorized responses. External callers without valid credentials cannot access proxied endpoints; 1 confirming event row since 12:00 UTC, no recovery signal. Verify whether these are expected security rejections or a credential/auth configuration regression by reviewing recent auth config changes on the ingress proxy.",
    "criticality": 30,
    "confidence": 0.45,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check ingress proxy access logs for the volume and source IPs of 401 responses since 12:00 UTC to distinguish a credential rotation failure from routine unauthorized access: kubectl logs -n <proxy-namespace> -l app=proxy --since=2h | grep '401'",
      "Verify that any recent API key or certificate rotation for external clients completed successfully and that new credentials are propagated: kubectl get secrets -n <proxy-namespace> | grep -i 'external-client'",
      "If a misconfigured auth policy is suspected, roll back the most recent proxy ConfigMap or auth policy change: kubectl rollout undo deployment/<proxy-deployment> -n <proxy-namespace>"
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "proxy",
        "target": "es-es-index"
      }
    ],
    "root_cause": "The ingress proxy is returning HTTP 401 because external clients are making unauthorized requests (1 rule-matched evidence row since 12:00 UTC)."
  },
  {
    "event_id": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2-d846711b-f67b-498a-9b62-747bbd151894",
    "timestamp": "2026-07-13T13:04:29+00:00",
    "created_at": "2026-07-13T13:04:29+00:00",
    "discovery_id": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2-da6e40d2-7635-4ff4-ab84-ae2a24f3ce0b",
    "discovery_slug": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2",
    "status": "acknowledged",
    "title": "Cloudbeat — cis_gcp CSPM: invalid credentials JSON",
    "summary": "Cloudbeat cis_gcp CSPM: the GCP CSPM component is repeatedly cycling to FAILED state (exit code 1), halting security posture scanning and GCP findings ingestion. No downstream services are directly exposed, but CSPM visibility is fully dark. Confirmed still failing at 13:00 UTC — check and rotate the GCP credentials configured for the cis_gcp integration in Kibana.",
    "criticality": 60,
    "confidence": 0.65,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Rotate or re-issue the GCP service account key used by the cis_gcp CSPM integration: navigate to Kibana → Integrations → Cloud Security Posture → cis_gcp policy, re-enter a valid GCP credentials JSON, and save. This directly addresses the credential initialization failure causing the STOPPING→FAILED transition.",
      "If credentials appear valid, inspect the agentless pod logs for the cis_gcp component to confirm whether the failure is a transient restart loop or a persistent config error: kubectl logs -n <agentless-namespace> <cloudbeat-pod> --since=30m | grep -E 'FAILED|credentials|launcher'",
      "If the pod is in a crash loop and credentials cannot be immediately rotated, force a re-provision by deleting and re-creating the agentless integration policy in Kibana to trigger a clean deployment and fresh credential injection cycle."
    ],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "cloudbeat",
        "target": "gcp"
      },
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "cloudbeat",
        "target": "agentless"
      }
    ],
    "root_cause": "Cloudbeat cis_gcp CSPM collection is failing because the GCP credentials JSON provided to Cloudbeat is invalid, causing the launcher to exit during GCP config initialization and the component to transition to FAILED (1 confirming state-transition evidence row since 11:30 UTC)."
  },
  {
    "event_id": "proxy__proxy-http-5xx-server-errors-2238e661-3963c7d7-de08-4657-8c45-11105b7a40ef",
    "timestamp": "2026-07-13T12:44:53+00:00",
    "created_at": "2026-07-13T12:44:53+00:00",
    "discovery_id": "proxy__proxy-http-5xx-server-errors-2238e661-2238e661-36dd-43b1-8c95-8b14a404ef4a",
    "discovery_slug": "proxy__proxy-http-5xx-server-errors-2238e661",
    "status": "acknowledged",
    "title": "Proxy — HTTP server: 5xx responses",
    "summary": "Proxy service: HTTP 5xx server errors are actively occurring, with the most recent confirmed at 12:41 UTC — approximately 1 minute before review. Clients routed through the proxy may experience failed requests; the authentication path is separately confirmed affected (see UIAM discovery). Check proxy pod health and upstream backend connectivity.",
    "criticality": 40,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "Check proxy pod health and recent restart events: kubectl get pods -n <proxy-namespace> and kubectl describe pod <proxy-pod> to identify crash loops or OOM kills.",
      "Inspect proxy upstream backend connectivity: review proxy access logs for which upstream routes are returning 5xx and verify backend service health endpoints are responding.",
      "If a recent proxy config or deployment change preceded the 12:00 UTC onset, roll back: kubectl rollout undo deployment/<proxy-deployment> -n <proxy-namespace>."
    ],
    "dependency_edges": []
  },
  {
    "event_id": "agentless-log__libbeat-pipeline-active-events-near-queu-7399cfb2-989f300f-d263-4a48-be5f-aaa008504c1f",
    "timestamp": "2026-07-13T10:48:07+00:00",
    "created_at": "2026-07-13T09:58:19+00:00",
    "discovery_id": "agentless-log__libbeat-pipeline-active-events-near-queu-7399cfb2-30dcd900-b34b-4854-b005-bce044d5f044",
    "discovery_slug": "agentless-log__libbeat-pipeline-active-events-near-queu-7399cfb2",
    "status": "resolved",
    "title": "Agentless log collector — libbeat pipeline: alerts recovered",
    "summary": "Agentless log collector: libbeat pipeline queue-capacity alert rate returned to baseline. Log shipping backpressure symptoms previously associated with this rule are no longer present per the detection pipeline quiet signal as of 2026-07-13T10:44:13Z. Confidence 72 — detection pipeline quiet signal.",
    "criticality": 10,
    "confidence": 0.68,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [],
    "dependency_edges": [],
    "root_cause": "Agentless log collector libbeat pipeline queue-capacity alerting has recovered and returned to baseline."
  },
  {
    "event_id": "agentless-api__app-secrets-or-config-object-creation-274b69b5-be51010e-1d96-419f-95e2-e51af23aaad5",
    "timestamp": "2026-07-13T09:28:56+00:00",
    "created_at": "2026-07-13T09:28:56+00:00",
    "discovery_id": "agentless-api__app-secrets-or-config-object-creation-274b69b5-274b69b5-5fd6-42aa-9593-1323a68eb726",
    "discovery_slug": "agentless-api__app-secrets-or-config-object-creation-274b69b5",
    "status": "acknowledged",
    "title": "Agentless API — deployments endpoint: unexpected HTTP method",
    "summary": "Agentless API: non-GET requests are actively reaching the deployments endpoint, which is expected to be GET-only for Kibana-origin traffic over mTLS. An unauthorized or misbehaving caller may be attempting deployment mutations; the most recent confirming event was at 09:23 UTC with no recovery. Inspect agentless-api access logs to identify the caller and block non-GET methods on /api/v1/serverless/deployments if the source is not an authorized Kibana instance.",
    "criticality": 50,
    "confidence": 0.6,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "On the agentless-api service, inspect access logs for the source identity of the non-GET requests to /api/v1/serverless/deployments: kubectl logs -n agentless-api -l app=agentless-api --since=2h | grep 'deployments' | grep -v '\"method\":\"GET\"' — identify whether the caller is a known Kibana instance or an unexpected source.",
      "If the caller is not an authorized Kibana instance, apply an ingress or API gateway policy to reject non-GET methods on /api/v1/serverless/deployments — update the relevant NetworkPolicy or Istio VirtualService to allow only GET on that path and redeploy: kubectl apply -f <updated-virtualservice.yaml> -n agentless-api.",
      "If the caller is a Kibana instance, check for a recent Kibana deployment or config change that may have altered the HTTP method used for deployment queries: kubectl rollout history deployment/kibana -n kibana — compare the rollout timestamp with the 08:00 UTC onset and roll back if correlated: kubectl rollout undo deployment/kibana -n kibana."
    ],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "mtls",
        "source": "kibana",
        "target": "agentless-api"
      }
    ],
    "root_cause": "Agentless API is seeing anomalous deployments-endpoint traffic because a caller is issuing non-GET requests to /api/v1/serverless/deployments, which is expected to be GET-only for Kibana-origin traffic (1 confirming query evidence row since 08:00 UTC; no entity KI attribution)."
  },
  {
    "event_id": "o365__o365-dlp-subscription-permission-error-a-c3357da3-4688df3e-1bc7-4ebc-b021-079c4f930b7c",
    "timestamp": "2026-07-13T09:15:36+00:00",
    "created_at": "2026-07-13T09:15:36+00:00",
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-c3357da3-c3357da3-e276-42c6-86a4-fd08dae44bb3",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-c3357da3",
    "status": "acknowledged",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365 CEL collector: DLP audit subscription is failing with an AF10001 permission error, placing the agentless O365 collector in a DEGRADED state. Security and audit consumers are not receiving DLP audit events; the CEL-to-O365 path is exposed and failing since 07:30 UTC with no recovery signal. Verify that the Azure AD application registration has the required Office 365 Management API DLP permission granted with tenant-wide admin consent, then restart the agentless O365 integration.",
    "criticality": 60,
    "confidence": 0.55,
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "cause_ki_ids": [],
    "recommendations": [
      "In Azure AD, open the application registration used by the O365 CEL integration and confirm the Office 365 Management API permission scope indicated by AF10001 is present with tenant-wide admin consent granted — grant consent if missing, then trigger a token refresh on the agentless collector via the Elastic Fleet UI or `POST /api/fleet/agent_policies/<policy_id>/reassign`.",
      "Restart the O365 agentless integration unit to force a fresh subscription attempt after the permission change: toggle the integration off and back on in the Elastic Fleet UI, or use `POST /api/fleet/agents/<agent_id>/actions` with action type `RESTART`.",
      "If the permission cannot be corrected immediately, temporarily disable the DLP content-type subscription in the O365 integration config to stop the DEGRADED loop and restore partial audit collection for other content types, then open a change ticket to remediate the Azure AD permission."
    ],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "https",
        "source": "cel",
        "target": "o365"
      }
    ],
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application lacks the required permission set to start the Office 365 Management API DLP.All subscription (AF10001), forcing the O365 CEL unit into a DEGRADED state."
  }
];
