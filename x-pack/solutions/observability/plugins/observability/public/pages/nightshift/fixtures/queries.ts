/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureQuery } from './types';

export const queries: FixtureQuery[] = [
  {
    "id": "new-agentless-integration-unit-added",
    "title": "New Agentless Integration Unit Added",
    "description": "Tracks when a new integration unit is dynamically added to an agentless deployment, which can indicate a new customer integration being provisioned or a policy change that may affect resource consumption.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE (message : \"UnitChanged\") AND (message : \"added\")",
    "severity_score": 25,
    "type": "match",
    "rule_backed": true,
    "rule_id": "e5d0eca4-da17-5497-9803-5953f138f23b",
    "feature_ids": []
  },
  {
    "id": "all-error-level-log-entries",
    "title": "All Error-Level Log Entries",
    "description": "Retrieves all log entries at the error severity level across all agentless components, providing a broad view of operational failures for triage and investigation.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE log.level == \"error\"",
    "severity_score": 60,
    "type": "match",
    "rule_backed": true,
    "rule_id": "dcf3c209-0d9e-5995-8b4e-b34645b07fb8",
    "feature_ids": []
  },
  {
    "id": "integration-dns-resolution-failures",
    "title": "Integration DNS Resolution Failures",
    "description": "Detects DNS lookup failures when agentless integrations attempt to reach external API endpoints, indicating network misconfiguration or invalid hostnames that will prevent data collection entirely.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE MATCH_PHRASE(message, \"no such host\")",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "187c5052-d160-5df0-8d19-5b0619fd5630",
    "feature_ids": []
  },
  {
    "id": "elastic-agent-rpc-context-canceled-errors",
    "title": "Elastic Agent RPC Context Canceled Errors",
    "description": "Detects errors where the elastic-agent-client gRPC connection is canceled (context canceled), which typically signals an unexpected agent restart or loss of communication between a Beat component and the Elastic Agent coordinator.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE (message : \"context\") AND (message : \"canceled\")",
    "severity_score": 60,
    "type": "match",
    "rule_backed": true,
    "rule_id": "0db30754-6dab-586a-b9b4-7c554f4b9e85",
    "feature_ids": []
  },
  {
    "id": "elastic-agent-data-directory-symlink-missing",
    "title": "Elastic Agent Data Directory Symlink Missing",
    "description": "Detects errors where the elastic-agent cannot resolve its data directory symlink, indicating a corrupted or incomplete agentless pod filesystem that may prevent the agent from starting or managing components correctly.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE (error.message : \"readlink\") AND (error.message : \"no such file\")",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "541e4357-63d0-512c-b19a-86c4df17f852",
    "feature_ids": []
  },
  {
    "id": "agentless-component-restart-detected-short-uptime",
    "title": "Agentless Component Restart Detected (Short Uptime)",
    "description": "Detects agentless Beat components that have restarted and report an uptime under 10 seconds, which is a strong indicator of a crash-loop or repeated restart cycle that may go unnoticed without uptime monitoring.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE MATCH_PHRASE(message, \"Uptime: 1.\")",
    "severity_score": 55,
    "type": "match",
    "rule_backed": true,
    "rule_id": "932cac3d-e3bf-5244-a96a-8ab19041556e",
    "feature_ids": []
  },
  {
    "id": "connectors-elasticsearch-refresh-api-404-errors",
    "title": "Connectors Elasticsearch Refresh API 404 Errors",
    "description": "Detects repeated 404 errors from the Connectors service when calling the Elasticsearch refresh API, which may indicate missing connector indices or a partially initialized connector setup.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE (message : \"refresh\") AND (message : \"404\")",
    "severity_score": 55,
    "type": "match",
    "rule_backed": true,
    "rule_id": "b3d493c7-f608-5fe7-981a-cea0ca9c06a0",
    "feature_ids": []
  },
  {
    "id": "agentless-component-entered-failed-state",
    "title": "Agentless Component Entered FAILED State",
    "description": "Detects when any agentless-managed component (e.g., cloudbeat CSPM, httpjson, CEL) transitions to a FAILED state, indicating a process crash or unrecoverable error that requires investigation. This is the primary signal for integration health degradation.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE unit.state == \"FAILED\"",
    "severity_score": 80,
    "type": "match",
    "rule_backed": true,
    "rule_id": "fb98c038-7d1b-505f-8947-89d30da12f15",
    "feature_ids": []
  },
  {
    "id": "azure-oauth-client-secret-expired-aadsts7000222",
    "title": "Azure OAuth Client Secret Expired (AADSTS7000222)",
    "description": "Detects when an agentless integration (e.g., M365 Defender) fails to authenticate with Azure AD because the registered application's client secret has expired, causing all data collection from that integration to stop silently. Responder should rotate the client secret in the Azure portal and update",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE error.message : \"AADSTS7000222\"",
    "severity_score": 80,
    "type": "match",
    "rule_backed": true,
    "rule_id": "2d873b74-6f59-58a9-9f31-a1330b56fec3",
    "feature_ids": []
  },
  {
    "id": "cloudbeat-launcher-fatal-exit",
    "title": "Cloudbeat Launcher Fatal Exit",
    "description": "Detects when the Cloudbeat launcher fails to start the Beat process and exits fatally, which stops all CSPM or asset inventory scanning for the affected integration. This is a broader signal than credential-specific failures and can indicate misconfiguration, missing dependencies, or runtime initial",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE message : \"launcher could not run Beater\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "79e2c7f9-0504-52b6-b8d2-1d9e57e549fc",
    "feature_ids": []
  },
  {
    "id": "otel-collector-persistent-recovery-restart-loop",
    "title": "OTel Collector Persistent Recovery Restart Loop",
    "description": "Detects when the OTel collector managed by otel_manager enters a recovery restart loop after repeated failures, indicating a persistent configuration or runtime error that is not self-healing. This is distinct from a single exit event and signals that the collector has been cycling through restarts,",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE log.logger == \"otel_manager\" AND (message : \"recovery\") AND (message : \"restarting\")",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "9c07dd0c-cc94-5d3e-ab7f-3c8cf6ec62bc",
    "feature_ids": []
  },
  {
    "id": "gcp-invalid-credentials-json-in-cloudbeat",
    "title": "GCP Invalid Credentials JSON in Cloudbeat",
    "description": "Detects when a Cloudbeat CSPM component fails to initialize because the GCP credentials JSON is invalid or malformed, causing the launcher to exit and halting cloud security posture scanning entirely. This is distinct from the AWS missing-credentials error and indicates a GCP-specific credential pro",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE message : \"invalid credentials JSON\"",
    "severity_score": 80,
    "type": "match",
    "rule_backed": true,
    "rule_id": "90978945-4dad-582e-ae89-7897c5ec068b",
    "feature_ids": []
  },
  {
    "id": "dns-resolution-failures-in-integration-error-messages",
    "title": "DNS Resolution Failures in Integration Error Messages",
    "description": "Detects DNS lookup failures recorded in the structured error.message field when agentless integrations attempt to reach external API endpoints (e.g., AWS GuardDuty, SecurityHub), indicating invalid hostnames or network misconfiguration that will prevent data collection. Complements the existing mess",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE error.message : \"no such host\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "e58d34dc-7c18-5a1c-8253-08c1042ae690",
    "feature_ids": []
  },
  {
    "id": "httpjson-retryable-http-request-failures",
    "title": "HTTPJSON Retryable HTTP Request Failures",
    "description": "Detects HTTP request failures logged by the go-retryablehttp client used by HTTPJSON integrations (e.g., M365 Defender, 1Password, AWS GuardDuty), indicating that an external API endpoint is unreachable or returning errors after all retries are exhausted. These failures silently halt data collection",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE log.logger == \"input.httpjson-cursor.retryablehttp\" AND (message : \"request failed\")",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "ee04da45-24d7-560c-896b-2075a3d23ddb",
    "feature_ids": []
  },
  {
    "id": "connectors-missing-required-configuration-fields",
    "title": "Connectors Missing Required Configuration Fields",
    "description": "Detects when an Elastic Connector (e.g., Slack, Confluence) fails field validation because required configuration fields such as authentication tokens or history settings are empty, indicating the integration was provisioned without completing its configuration and will not collect any data.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE error.message : \"Field validation errors\"",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "ccb0705c-4931-5c85-b5a8-413b55c85f0a",
    "feature_ids": []
  },
  {
    "id": "libbeat-pipeline-active-events-near-queue-capacity",
    "title": "Libbeat Pipeline Active Events Near Queue Capacity",
    "description": "Detects when the libbeat publisher pipeline has 2,560 or more active events, representing ≥80% of the observed 3,200-event queue maximum. This indicates the Beat component is producing events faster than they can be shipped to Elasticsearch, risking event drops. Replaces the previous queue fill-perc",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE monitoring.metrics.libbeat.pipeline.events.active >= 2560",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "27f8626d-23ce-57f5-bce6-14d1c6671898",
    "feature_ids": [
      "dataset_analysis"
    ]
  },
  {
    "id": "component-state-transition-to-failed-message-based",
    "title": "Component State Transition to FAILED (Message-Based)",
    "description": "Detects agentless component state machine transitions to the FAILED state by matching the '->FAILED' pattern in log messages, capturing process exits with non-zero codes and unrecoverable component failures. This complements the structured unit.state field query by catching state transition log entr",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE message : \"->FAILED\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "3c864c83-8171-5311-bbd7-a267aa54e6ac",
    "feature_ids": []
  },
  {
    "id": "httpjson-input-http-request-processing-error",
    "title": "HTTPJSON Input HTTP Request Processing Error",
    "description": "Detects HTTP request processing errors logged by the httpjson-cursor input (not the retryablehttp retry layer), indicating that an external API call failed at the input level — often due to auth failures, rate limiting, or unexpected response formats that stop data collection.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE log.logger == \"input.httpjson-cursor\" AND (message : \"Error while processing http request\")",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "0c0b5eb4-d229-52b0-99a6-e1f690c87d1e",
    "feature_ids": []
  },
  {
    "id": "agentless-fleet-checkin-json-parse-failure",
    "title": "Agentless Fleet Checkin JSON Parse Failure",
    "description": "Detects when the agentless elastic-agent fails to unmarshal Fleet checkin action responses due to malformed or truncated JSON, which can prevent the agent from receiving policy updates and leave integrations running stale configurations.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE message : \"failed to unmarshal checkin actions\"",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "823a6b5d-1a63-5ec2-8629-8d787ef8d2a6",
    "feature_ids": []
  },
  {
    "id": "component-state-transitioned-to-failed-component-state",
    "title": "Component State Transitioned to FAILED (component.state)",
    "description": "Detects when a Beat component's own state machine (component.state) transitions to FAILED, which is distinct from the unit.state field and captures a different layer of the agentless component lifecycle. This complements the unit.state FAILED query and ensures no FAILED transitions are missed.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE component.state == \"FAILED\"",
    "severity_score": 80,
    "type": "match",
    "rule_backed": true,
    "rule_id": "d0bc7e93-2f41-5715-b185-45a36967ae0d",
    "feature_ids": []
  },
  {
    "id": "otel-stats-endpoint-closed-network-connection",
    "title": "OTel Stats Endpoint Closed Network Connection",
    "description": "Detects when the EDOT/OTel stats endpoint Unix socket closes with a 'use of closed network connection' error, which is a direct indicator that the OTel collector process has crashed or been forcibly terminated and the stats API is no longer accepting connections — typically preceding or accompanying",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE message : \"closed network connection\"",
    "severity_score": 60,
    "type": "match",
    "rule_backed": true,
    "rule_id": "376e78e2-3b7e-5703-8cf4-95e637997914",
    "feature_ids": []
  },
  {
    "id": "libbeat-output-write-latency-spike",
    "title": "Libbeat Output Write Latency Spike",
    "description": "Detects when the libbeat output write latency p99 exceeds 5 seconds, indicating that the Beat component is experiencing severe backpressure or connectivity issues when shipping events to Elasticsearch — sustained high latency at this level will cause the pipeline queue to fill and eventually drop ev",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE TO_DOUBLE(monitoring.metrics.libbeat.output.write.latency.histogram.p99) > 5000.0",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "35223855-03d4-5520-bc04-fbf8d64c6b7f",
    "feature_ids": []
  },
  {
    "id": "connectors-ssh-connection-failure",
    "title": "Connectors SSH Connection Failure",
    "description": "Detects when an Elastic Connector (e.g., Confluence) fails to establish an SSH or TCP connection to a configured host, indicating a misconfigured connector endpoint or an unreachable service that will prevent data synchronization entirely.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE (error.message : \"Connect call failed\") AND (error.message : \"22\")",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "c51a56ef-7315-55e1-bb17-6747450681e7",
    "feature_ids": []
  },
  {
    "id": "otel-collector-invalid-configuration-error",
    "title": "OTel Collector Invalid Configuration Error",
    "description": "Detects when the elastic-agent OTel manager logs an 'invalid configuration' error, indicating a misconfigured OTel collector component that will prevent the collector from starting and cause a recovery restart loop. This is broader than the AWS credentials-specific query and catches any OTel configu",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE log.logger == \"otel_manager\" AND (message : \"invalid configuration\")",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "631140e7-ecf2-52c5-838e-10db0acce568",
    "feature_ids": []
  },
  {
    "id": "integration-api-401-unauthorized-errors",
    "title": "Integration API 401 Unauthorized Errors",
    "description": "Detects HTTP 401 Unauthorized responses from external integration APIs (e.g., 1Password, Okta), indicating expired or invalid API credentials that will cause data collection to stop silently.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-log-default METADATA _id, _source | WHERE (error.message : \"401\") AND (error.message : \"Unauthorized\")",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "7a4990ec-34c8-5995-b24a-c55654745633",
    "feature_ids": []
  },
  {
    "id": "k8s-api-rate-limiter-exhaustion",
    "title": "K8s API Rate Limiter Exhaustion",
    "description": "Detects liveness check failures caused specifically by the Kubernetes client-side rate limiter being exhausted, as opposed to simple context cancellations from direct API call timeouts. Rate limiter errors indicate the agentless-api is issuing K8s API requests faster than the configured rate limit a",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE (error.message : \"rate limiter\") AND (error.message : \"context canceled\")",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "f4e8e0f4-9e5f-58cf-ad49-af47ccba2f9d",
    "feature_ids": [
      "error_logs",
      "agentless-api",
      "gke-kubernetes"
    ]
  },
  {
    "id": "mtls-authorization-layer-error",
    "title": "mTLS Authorization Layer Error",
    "description": "Detects error-level log entries emitted directly from the mTLS certificate authorization layer (auth/mtls.go). Unlike the existing unexpected-issuer and unexpected-subject queries that flag anomalous certificate attributes, this query fires when the authorization code itself encounters a runtime err",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE log.level == \"error\" AND log.origin.file.name == \"auth/mtls.go\"",
    "severity_score": 78,
    "type": "match",
    "rule_backed": true,
    "rule_id": "04698695-afc8-5e6a-b430-f58cfd8712b1",
    "feature_ids": [
      "mutual-tls",
      "go",
      "ecs",
      "dataset_analysis"
    ]
  },
  {
    "id": "error-from-unexpected-agentless-api-source-file",
    "title": "Error from Unexpected Agentless API Source File",
    "description": "Detects error-level log entries originating from source files other than the three primary runtime files (handler/handler.go, auth/mtls.go, middleware/logger.go). Errors from unexpected files such as provisioning, configuration, or deployment management code indicate new failure modes not covered by",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE log.level == \"error\" AND log.origin.file.name IS NOT NULL AND (log.origin.file.name NOT IN (\"handler/handler.go\", \"auth/mtls.go\", \"middleware/logger.go\"))",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "f9e7cee8-4414-55e2-8333-1d861c8c3a07",
    "feature_ids": [
      "dataset_analysis",
      "agentless-api",
      "go",
      "error_logs"
    ]
  },
  {
    "id": "http-non-200-response-from-agentless-api",
    "title": "HTTP Non-200 Response from Agentless API",
    "description": "Detects any HTTP response with a status code of 400 or higher logged by the middleware layer, indicating a client error (4xx) or server error (5xx) returned to the caller. Since all observed traffic is legitimate Kibana requests returning 200, any non-200 response warrants investigation for misconfi",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE http.response.status_code IS NOT NULL AND http.response.status_code != 200",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "ec8eeb52-27be-560c-9df7-02d93ac4c165",
    "feature_ids": [
      "dataset_analysis",
      "agentless-api",
      "kibana-agentless-api-mtls"
    ]
  },
  {
    "id": "get-request-with-non-zero-body",
    "title": "GET Request with Non-Zero Body",
    "description": "Detects HTTP GET requests to the agentless-api that carry a non-zero request body. All legitimate Kibana-origin GET requests use axios/1.16.1 and send zero body bytes; a GET request with a body is anomalous and may indicate request smuggling, a non-standard client, or an attempt to inject payload da",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE http.request.method == \"GET\" AND http.request.body.bytes > 0",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "a292f3cc-68a9-5c0f-b996-d20cace600f2",
    "feature_ids": [
      "dataset_analysis",
      "kibana-agentless-api-mtls",
      "mutual-tls",
      "axios-1.16.1"
    ]
  },
  {
    "id": "api-request-from-unexpected-source-ip",
    "title": "API Request from Unexpected Source IP",
    "description": "Detects HTTP requests to the agentless-api originating from a source IP outside the expected Kubernetes pod CIDR (100.64.0.0/10). All observed legitimate traffic originates from 100.64.x.x pod IPs; a request from any other range may indicate traffic bypassing the cluster network, a misconfigured pro",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE source.ip IS NOT NULL AND NOT source.ip LIKE \"100.64.*\"",
    "severity_score": 82,
    "type": "match",
    "rule_backed": true,
    "rule_id": "31e026ce-50f0-5e29-86f9-ba74b160e383",
    "feature_ids": [
      "dataset_analysis",
      "kibana-agentless-api-mtls",
      "mutual-tls"
    ]
  },
  {
    "id": "deployment-provisioning-error-in-applyagentlessappconfig",
    "title": "Deployment Provisioning Error in applyAgentlessAppConfig",
    "description": "Detects error-level log entries emitted specifically from the applyAgentlessAppConfig handler function, which provisions or updates agentless deployment application configuration. Unlike the existing 'Error from Unexpected Source File' query (which excludes handler.go) and the 'Liveness Check HTTP E",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE log.level == \"error\" AND log.origin.function LIKE \"*applyAgentlessAppConfig*\"",
    "severity_score": 72,
    "type": "match",
    "rule_backed": true,
    "rule_id": "620d247c-2751-5517-86b5-05643740e2da",
    "feature_ids": [
      "dataset_analysis",
      "agentless-api",
      "go"
    ]
  },
  {
    "id": "k8s-api-server-rst-stream-throttling-enhance-your-calm",
    "title": "K8s API Server RST_STREAM Throttling (ENHANCE_YOUR_CALM)",
    "description": "Detects errors where the Kubernetes API server terminates a gRPC stream with HTTP/2 RST_STREAM error code ENHANCE_YOUR_CALM, indicating server-side throttling of the agentless-api. This is distinct from client-side rate limiter exhaustion (already monitored separately) and affects both the liveness ",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE error.message : \"ENHANCE_YOUR_CALM\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "603233d8-c8f1-56af-8323-1494910e01be",
    "feature_ids": [
      "error_logs",
      "dataset_analysis",
      "agentless-api",
      "gke-kubernetes"
    ]
  },
  {
    "id": "failed-to-list-agentless-configs",
    "title": "Failed to List Agentless Configs",
    "description": "Detects errors from the listDeployments handler path where the agentless-api fails to retrieve deployment configurations from the Kubernetes API. Unlike the existing k8s client check failure query (which targets the liveness probe path), this targets the main API serving path and indicates that Kiba",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE error.message : \"failed to list agentless configs\"",
    "severity_score": 72,
    "type": "match",
    "rule_backed": true,
    "rule_id": "724b0ec6-12b3-5272-9837-5e1805a69043",
    "feature_ids": [
      "error_logs",
      "dataset_analysis",
      "agentless-api"
    ]
  },
  {
    "id": "unexpected-user-stack-type-or-project-type",
    "title": "Unexpected User Stack Type or Project Type",
    "description": "Detects API requests carrying user context fields with values outside the expected set: user.StackType should always be 'serverless' and user.ProjectType should always be 'security'. A request with a different stack type or project type may indicate a misconfigured client, a cross-tenant request, or",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE user.StackType IS NOT NULL AND user.StackType != \"serverless\" OR user.ProjectType IS NOT NULL AND user.ProjectType != \"security\"",
    "severity_score": 72,
    "type": "match",
    "rule_backed": true,
    "rule_id": "6c21fef4-619c-5378-9f11-fe71524f693a",
    "feature_ids": [
      "dataset_analysis",
      "kibana-agentless-api-mtls",
      "agentless-api"
    ]
  },
  {
    "id": "kibana-request-missing-traceparent-header",
    "title": "Kibana Request Missing Traceparent Header",
    "description": "Detects HTTP requests that carry the X-Elastic-Internal-Origin: Kibana header but lack the Traceparent distributed-tracing header present on every legitimate Kibana-origin request. A request that passes the Kibana origin check yet omits Traceparent may indicate a crafted or replayed request bypassin",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE http.request.method IS NOT NULL AND `http.request.headers.X-Elastic-Internal-Origin` == \"Kibana\" AND `http.request.headers.Traceparent` IS NULL",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "db6cd273-3482-5940-97b5-4ec451c5b6f7",
    "feature_ids": [
      "kibana-agentless-api-mtls",
      "mutual-tls",
      "kibana",
      "dataset_analysis",
      "ecs"
    ]
  },
  {
    "id": "unexpected-limit-parameter-in-deployment-list-request",
    "title": "Unexpected Limit Parameter in Deployment List Request",
    "description": "Detects HTTP requests to the agentless-api where the URL query string contains a limit parameter with a value other than the expected 20. All observed legitimate Kibana-origin requests use limit=20; a different limit value may indicate a non-standard caller attempting to retrieve an abnormally large",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE url.query IS NOT NULL AND url.query LIKE \"*limit=*\" AND NOT url.query LIKE \"*limit=20*\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "4c7c68a5-dc0a-5b2c-a1ec-16b7cc09a720",
    "feature_ids": [
      "kibana-agentless-api-mtls",
      "dataset_analysis",
      "agentless-api",
      "ecs"
    ]
  },
  {
    "id": "liveness-check-http-error",
    "title": "Liveness Check HTTP Error",
    "description": "Detects error-level log entries emitted by the liveness check handler in agentless-api where the message is exactly 'HTTP error'. Uses MATCH_PHRASE to avoid false positives from the high-volume 'HTTP request' log entries (28% of all logs) that share the term 'HTTP'. Repeated liveness errors indicate",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE MATCH_PHRASE(message, \"HTTP error\") AND log.origin.file.name == \"handler/handler.go\"",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "3eb9cea5-3fdc-50c6-bc7d-7545a4dbd0e6",
    "feature_ids": [
      "dataset_analysis",
      "log_patterns",
      "error_logs",
      "agentless-api"
    ]
  },
  {
    "id": "ca-certificate-rotation",
    "title": "CA Certificate Rotation",
    "description": "Tracks CA certificate updates performed by the controller-runtime certwatcher component, complementing the existing TLS certificate rotation query. CA certificate rotation is expected but infrequent; unexpected frequency or absence of rotation may indicate certificate management issues or a misconfi",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE message : \"Updated current CA certificate\"",
    "severity_score": 20,
    "type": "match",
    "rule_backed": true,
    "rule_id": "4356a005-a9ff-5969-84b2-dfb66b3a5c1b",
    "feature_ids": []
  },
  {
    "id": "app-secrets-or-config-object-creation",
    "title": "App Secrets or Config Object Creation",
    "description": "Detects creation of application secrets or configuration objects for agentless deployments, which are rare provisioning events. Monitoring these helps track deployment lifecycle activity and detect unexpected or repeated provisioning attempts that could indicate configuration drift or retry loops.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE (message : \"Creating app secrets\") OR (message : \"Creating app config object\")",
    "severity_score": 25,
    "type": "match",
    "rule_backed": true,
    "rule_id": "86925279-9ba5-51b8-be2c-7fa3bbb73cb6",
    "feature_ids": []
  },
  {
    "id": "agentless-api-pod-startup",
    "title": "Agentless API Pod Startup",
    "description": "Detects agentless-api pod startup events by matching the HTTPS server initialization log message. Pod startups are expected during deployments and rolling updates but unexpected restarts may indicate crash-looping, OOM kills, or liveness probe failures causing pod recycling.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE message : \"starting HTTPS Server\"",
    "severity_score": 25,
    "type": "match",
    "rule_backed": true,
    "rule_id": "d2ebfd81-884b-59ca-be98-2e0adc460eec",
    "feature_ids": []
  },
  {
    "id": "agentless-deployment-deletion",
    "title": "Agentless Deployment Deletion",
    "description": "Captures log entries recording the deletion of an agentless deployment, a rare and significant lifecycle event. Unexpected or high-frequency deletions may indicate automated cleanup issues, misconfigured controllers, or unintended removal of active deployments.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE message : \"Deleting agentless deployment\"",
    "severity_score": 40,
    "type": "match",
    "rule_backed": true,
    "rule_id": "d355bcc9-c9dd-57e7-aa41-bb590546a2f7",
    "feature_ids": []
  },
  {
    "id": "namespace-already-exists-during-provisioning",
    "title": "Namespace Already Exists During Provisioning",
    "description": "Detects log entries where the agentless-api encounters an already-existing namespace during deployment provisioning. While idempotent in normal operation, repeated occurrences may indicate retry storms, failed cleanup from prior deployments, or race conditions in the provisioning workflow.",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE message : \"Namespace already exists\"",
    "severity_score": 30,
    "type": "match",
    "rule_backed": true,
    "rule_id": "19e10b13-177e-5477-b668-be0dc96148c1",
    "feature_ids": []
  },
  {
    "id": "unexpected-user-agent-on-api-request",
    "title": "Unexpected User-Agent on API Request",
    "description": "Detects HTTP requests to the agentless-api that carry a user agent other than the expected axios/1.16.1 used exclusively by Kibana. All legitimate Kibana-to-agentless-api traffic uses axios/1.16.1; a different or absent user agent may indicate a non-Kibana caller attempting to access the API, comple",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE http.request.method IS NOT NULL AND (`user_agent`.original IS NULL OR `user_agent`.original != \"axios/1.16.1\")",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "48e9507d-53d8-5732-9fe7-77e3aa3fbaa3",
    "feature_ids": []
  },
  {
    "id": "http-error-response-from-agentless-api",
    "title": "HTTP Error Response from Agentless API",
    "description": "Detects error-level log entries emitted by the HTTP middleware logger (middleware/logger.go), indicating a request-handling failure at the middleware layer. This replaces the prior http.response.status_code-based query, which references a field absent from the current dataset schema; middleware-leve",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE log.level == \"error\" AND log.origin.file.name == \"middleware/logger.go\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "d58d7782-37e3-53dc-9dfb-cba1277a4d0c",
    "feature_ids": []
  },
  {
    "id": "k8s-client-check-failure",
    "title": "K8s Client Check Failure",
    "description": "Detects liveness check failures caused by the Kubernetes API client being unable to reach the agentless configs endpoint, typically due to context cancellation. These errors indicate the agentless-api pod cannot communicate with the Kubernetes API server, which will cause the liveness probe to fail ",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE error.message : \"k8s client check failed\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "31fc0f95-8fe3-5911-a1c4-387c8ec3c835",
    "feature_ids": []
  },
  {
    "id": "unexpected-tls-client-certificate-issuer",
    "title": "Unexpected TLS Client Certificate Issuer",
    "description": "Detects mTLS requests where the client certificate was not issued by the expected internal Kibana CA (kb-kb-ca). All legitimate Kibana-to-agentless-api calls use certificates issued by CN=kb-kb-ca,OU=kb-kb-ca; any other issuer may indicate a misconfigured client, a certificate rotation issue, or an ",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE tls.client.issuer IS NOT NULL AND tls.client.issuer != \"CN=kb-kb-ca,OU=kb-kb-ca\"",
    "severity_score": 80,
    "type": "match",
    "rule_backed": true,
    "rule_id": "979d9d00-78ed-542d-a64e-dcfd447b6ba2",
    "feature_ids": []
  },
  {
    "id": "non-kibana-http-request-to-agentless-api",
    "title": "Non-Kibana HTTP Request to Agentless API",
    "description": "Detects HTTP requests reaching the agentless-api that do not carry the expected X-Elastic-Internal-Origin: Kibana header. All legitimate API traffic originates from Kibana; a request with HTTP metadata but a missing or unexpected origin header may indicate an unauthorized client attempting to access",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE http.request.method IS NOT NULL AND (`http.request.headers.X-Elastic-Internal-Origin` IS NULL OR `http.request.headers.X-Elastic-Internal-Origin` != \"Kibana\")",
    "severity_score": 80,
    "type": "match",
    "rule_backed": true,
    "rule_id": "e1ad0d64-ffdd-5f0f-9aec-647aec70f6c6",
    "feature_ids": []
  },
  {
    "id": "agentless-cleaner-job-error",
    "title": "Agentless Cleaner Job Error",
    "description": "Detects error-level log entries from the agentless-cleaner batch job, which is responsible for cleaning up stopped deployments and managing search cursors. Errors in the cleaner may indicate failures to read or save cursors to the config map, or issues with the stopped-deployment search, potentially",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE service.type == \"agentless-cleaner\" AND error.message IS NOT NULL",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "ec003b12-5a41-5a44-96f7-32eab5bb355e",
    "feature_ids": []
  },
  {
    "id": "unexpected-tls-client-certificate-subject",
    "title": "Unexpected TLS Client Certificate Subject",
    "description": "Detects mTLS requests where the client certificate subject does not match the expected project-scoped Kibana pattern (CN=kb-kb-http.project-*.kb.local). All legitimate Kibana-to-agentless-api calls present subjects in this format; a non-conforming subject may indicate a rogue or misconfigured client",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "esql": "FROM $.logging-gcp-us-central1-logs-agentless-api-log-default METADATA _id, _source | WHERE tls.client.subject IS NOT NULL AND NOT tls.client.subject LIKE \"CN=kb-kb-http.project-*\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "9c5ecd71-22ba-5050-84b7-044d6faf76b5",
    "feature_ids": []
  },
  {
    "id": "elasticsearch-search-tier-errors",
    "title": "Elasticsearch Search Tier Errors",
    "description": "Detects error-level log entries from the Elasticsearch search tier (es-es-search deployment), which handles all read and query operations. Errors here indicate query failures, circuit breaker trips, or JVM issues that degrade search and analytics for all serverless projects.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.deployment.name == \"es-es-search\" AND log.level == \"error\"",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "51756e9e-771e-55c7-a61c-945ad3687bc3",
    "feature_ids": [
      "elasticsearch-search-tier",
      "dataset_analysis"
    ]
  },
  {
    "id": "elasticsearch-index-tier-errors",
    "title": "Elasticsearch Index Tier Errors",
    "description": "Detects error-level log entries from the Elasticsearch index tier (es-es-index deployment), which handles all write operations. Errors here indicate write failures, replication issues, or JVM problems that directly impact data ingestion for all serverless projects.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.deployment.name == \"es-es-index\" AND log.level == \"error\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "77fca4a2-da51-5d20-afb4-c3205c60ef3d",
    "feature_ids": [
      "elasticsearch-index-tier",
      "dataset_analysis"
    ]
  },
  {
    "id": "cilium-network-agent-warnings-and-errors",
    "title": "Cilium Network Agent Warnings and Errors",
    "description": "Detects warning and error events from the Cilium network agent, which manages cluster networking policy and datapath. These events can indicate foreign IP anomalies (potential IP spoofing), policy update failures, or datapath integrity issues that affect cluster network security.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.container.name == \"cilium-agent\" AND (log.level IN (\"warning\", \"error\"))",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "f775aa37-cae1-513c-9952-cd006cbc0b6b",
    "feature_ids": [
      "cilium-agent",
      "cilium-1.18.7"
    ]
  },
  {
    "id": "elasticsearch-controller-errors-and-warnings",
    "title": "Elasticsearch Controller Errors and Warnings",
    "description": "Detects error and warning log entries from the Elasticsearch controller, which reconciles ElasticsearchAutoscaler resources and manages tier scaling. Errors here can indicate autoscaler limited conditions, reconciliation failures, or secret observation issues that precede capacity exhaustion across ",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE service.name == \"elasticsearch-controller\" AND (log.level IN (\"error\", \"warning\"))",
    "severity_score": 60,
    "type": "match",
    "rule_backed": true,
    "rule_id": "76cc20f4-6f50-5f43-a870-c2df0e768ac4",
    "feature_ids": [
      "elasticsearch-controller",
      "elasticsearch-controller-dca638820928",
      "elasticsearch-controller-33a814441b4a"
    ]
  },
  {
    "id": "warpstream-agent-errors",
    "title": "Warpstream Agent Errors",
    "description": "Detects error-level log entries from the Warpstream agent, which handles stream-processing compaction jobs and Kafka-compatible messaging in the mis-warpstream-agent namespace. Errors here indicate job failures, agent discovery issues, or streaming pipeline degradation.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.namespace == \"mis-warpstream-agent\" AND log.level == \"error\"",
    "severity_score": 60,
    "type": "match",
    "rule_backed": true,
    "rule_id": "41209beb-8f11-5763-a8c8-d91e595dda14",
    "feature_ids": [
      "warpstream-agent",
      "warpstream-agent-v812"
    ]
  },
  {
    "id": "proxy-http-5xx-server-errors",
    "title": "Proxy HTTP 5xx Server Errors",
    "description": "Detects HTTP 5xx server-side errors returned by the ingress proxy to clients. These indicate backend Elasticsearch tier failures, upstream timeouts, or proxy-level faults that directly impact user-facing request success.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE service.name == \"proxy\" AND status_code >= 500",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "53f7fa52-5b2d-5582-bf1f-f0072b6bc39b",
    "feature_ids": [
      "ingress-proxy",
      "dataset_analysis"
    ]
  },
  {
    "id": "external-unauthorized-access-attempts",
    "title": "External Unauthorized Access Attempts",
    "description": "Detects HTTP 401 Unauthorized responses for requests originating from external sources through the ingress proxy. Repeated external 401s may indicate credential brute-forcing, expired API keys, or unauthorized access attempts against Elasticsearch endpoints.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE service.name == \"proxy\" AND status_code == 401 AND request_source == \"external\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "0a883518-b20b-5d15-97c4-fa3bde06b2c0",
    "feature_ids": [
      "ingress-proxy",
      "playwright-1.58.2",
      "dataset_analysis"
    ]
  },
  {
    "id": "autoops-metricbeat-errors",
    "title": "AutoOps Metricbeat Errors",
    "description": "Detects error-level events from the AutoOps Metricbeat serverless component, which is the source of DNS lookup failures for deleted or misconfigured Elasticsearch project endpoints. These errors indicate stale monitoring targets.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE service.name == \"autoops-metricbeat-serverless\" AND log.level == \"error\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "0ff66dd2-c674-5d7c-b221-83525e472a9f",
    "feature_ids": [
      "autoops",
      "autoops-to-elasticsearch-http"
    ]
  },
  {
    "id": "docker-registry-authorization-warnings",
    "title": "Docker Registry Authorization Warnings",
    "description": "Detects authorization warning events in the Docker Registry namespace, indicating clients attempting to pull images without sufficient scope. These events signal misconfigured pull secrets or unauthorized registry access attempts.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.namespace == \"container-library\" AND log.level == \"warning\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "c9d7948a-3704-56f5-8d3a-ed50671bfb38",
    "feature_ids": [
      "docker-registry",
      "docker-auth",
      "error_logs"
    ]
  },
  {
    "id": "kafka-broker-errors",
    "title": "Kafka Broker Errors",
    "description": "Detects error-level events from the Kafka broker StatefulSet, including replication factor violations where the number of alive brokers is insufficient for the offsets topic. A degraded Kafka cluster risks losing consumer group offset data.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.statefulset.name == \"deco-green-kafka\" AND log.level == \"error\"",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "2463d411-87e6-5fb6-90cc-c0675ca3229b",
    "feature_ids": [
      "deco-green-kafka",
      "kafka-5.0.1"
    ]
  },
  {
    "id": "elasticsearch-shard-limit-exhaustion-pubsubbeat",
    "title": "Elasticsearch Shard Limit Exhaustion (Pubsubbeat)",
    "description": "Detects error-level events from the GCP Pubsubbeat ingest component, which is the primary source of Elasticsearch shard-limit exhaustion errors. When the cluster reaches its maximum shard count, Pubsubbeat logs errors for every failed indexing attempt.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.container.name == \"gcp-pubsubbeat\" AND log.level == \"error\"",
    "severity_score": 85,
    "type": "match",
    "rule_backed": true,
    "rule_id": "4901e44c-714b-5ac1-b128-9785195485c5",
    "feature_ids": [
      "gcp-pubsubbeat",
      "gcp-pubsubbeat-to-elasticsearch-http",
      "elasticsearch-search-tier"
    ]
  },
  {
    "id": "uiam-authentication-failures-via-proxy",
    "title": "UIAM Authentication Failures via Proxy",
    "description": "Detects failed authentication requests to the UIAM service routed through the ingress proxy. Non-2xx responses on the _authenticate endpoint may indicate invalid credentials, token expiry, or authentication service degradation.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE service.name == \"proxy\" AND request_path LIKE \"*_authenticate*\" AND status_code >= 400",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "75637c65-b6fe-5d7a-a87c-912346e564af",
    "feature_ids": [
      "uiam",
      "ingress-proxy",
      "quarkus-3.37.2"
    ]
  },
  {
    "id": "docker-registry-oci-manifest-errors",
    "title": "Docker Registry OCI Manifest Errors",
    "description": "Detects Docker Registry error responses caused by OCI manifest compatibility issues or missing signature manifests. The err.message field is populated specifically when the registry encounters a response-level error, such as an unsupported OCI manifest accept header.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.namespace == \"container-library\" AND err.message IS NOT NULL",
    "severity_score": 60,
    "type": "match",
    "rule_backed": true,
    "rule_id": "c9d93519-2a96-59b9-9317-b2395b0c5109",
    "feature_ids": [
      "docker-registry",
      "error_logs"
    ]
  },
  {
    "id": "elasticsearch-ml-tier-errors",
    "title": "Elasticsearch ML Tier Errors",
    "description": "Detects error-level log entries from the Elasticsearch ML tier (es-es-ml deployment), which handles machine-learning workloads such as anomaly detection and model inference. Errors here indicate ML job failures, JVM issues, or resource exhaustion on the ML tier.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.deployment.name == \"es-es-ml\" AND log.level == \"error\"",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "b422c802-f8fd-5bd4-aa62-4e02ba89485a",
    "feature_ids": [
      "elasticsearch-ml-tier",
      "dataset_analysis"
    ]
  },
  {
    "id": "uiam-service-level-errors",
    "title": "UIAM Service-Level Errors",
    "description": "Detects error and warning log entries emitted directly by the UIAM authentication service, as opposed to proxy-level auth failures. These indicate internal service errors such as database connectivity issues, token validation failures, or Quarkus runtime exceptions that may not surface as HTTP 4xx r",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE service.name == \"uiam\" AND (log.level IN (\"ERROR\", \"error\", \"WARN\", \"warn\", \"WARNING\", \"warning\"))",
    "severity_score": 75,
    "type": "match",
    "rule_backed": true,
    "rule_id": "9ccd26b0-bce6-5b84-b60b-9cf347400f2f",
    "feature_ids": [
      "uiam",
      "quarkus-3.37.2",
      "log_samples"
    ]
  },
  {
    "id": "proxy-cross-az-backend-routing",
    "title": "Proxy Cross-AZ Backend Routing",
    "description": "Detects ingress proxy requests that are routed to a backend in a different availability zone rather than the preferred same-AZ backend. Cross-AZ routing indicates that the same-AZ Elasticsearch tier is unavailable or unhealthy, which can signal AZ-level degradation and increased latency.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE service.name == \"proxy\" AND routing_decision IS NOT NULL AND NOT routing_decision LIKE \"*same_az*\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "69e44559-c9b9-59b2-bcef-244b9e4685a2",
    "feature_ids": [
      "ingress-proxy",
      "log_samples",
      "dataset_analysis"
    ]
  },
  {
    "id": "dns-resolution-failures",
    "title": "DNS Resolution Failures",
    "description": "Detects DNS lookup failures across all components, most commonly seen in AutoOps Metricbeat when it attempts to resolve deleted or misconfigured Elasticsearch project endpoints. These errors indicate stale DNS references to deprovisioned projects or network configuration issues.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE (body.text : \"getaddrinfo\") AND (body.text : \"not known\")",
    "severity_score": 60,
    "type": "match",
    "rule_backed": true,
    "rule_id": "ef3daf4d-ff74-5ca7-8547-f9c955808011",
    "feature_ids": [
      "log_patterns",
      "autoops",
      "autoops-to-elasticsearch-http"
    ]
  },
  {
    "id": "zwischending-s3-proxy-errors",
    "title": "Zwischending S3 Proxy Errors",
    "description": "Detects error-level log entries from the Zwischending production service, which proxies requests to S3 artifact storage. Errors here indicate upstream S3 connectivity failures or missing artifacts that may disrupt artifact delivery workflows.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE kubernetes.deployment.name == \"zwischending-production-vanilla\" AND log.level == \"ERROR\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "9f1df31b-e34b-59c5-9675-72ef81a94ffb",
    "feature_ids": [
      "zwischending-production",
      "error_logs"
    ]
  },
  {
    "id": "beats-and-pubsubbeat-indexing-failures",
    "title": "Beats and Pubsubbeat Indexing Failures",
    "description": "Detects log entries where Beats-based shippers (Filebeat, Pubsubbeat, Heartbeat) fail to index events into Elasticsearch. These failures indicate data loss in the observability pipeline and are commonly caused by Elasticsearch shard limits, circuit breaker trips, or cluster unavailability.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE body.text : \"Cannot index event\"",
    "severity_score": 65,
    "type": "match",
    "rule_backed": true,
    "rule_id": "39909477-2b13-5bbb-9410-af5c71b3bbaf",
    "feature_ids": [
      "gcp-pubsubbeat",
      "filebeat-8.8.2",
      "error_logs"
    ]
  },
  {
    "id": "kafka-client-broker-connectivity-failures",
    "title": "Kafka Client Broker Connectivity Failures",
    "description": "Detects Kafka client-side broken pipe errors when components such as usage-api or Warpstream lose their TCP connection to a Kafka broker mid-write. These errors indicate broker instability or network disruption that can cause message loss and stall downstream consumers.",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "esql": "FROM $.logging-gcp-us-central1-logs-all METADATA _id, _source | WHERE log.logger == \"kafka\" AND (body.text : \"broken pipe\")",
    "severity_score": 70,
    "type": "match",
    "rule_backed": true,
    "rule_id": "5ebb86da-7877-51ce-a4a2-00c32ddd8dfa",
    "feature_ids": [
      "usage-api",
      "deco-green-kafka",
      "log_patterns"
    ]
  }
];
