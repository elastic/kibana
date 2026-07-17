/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureDetection } from './types';

export const detections: FixtureDetection[] = [
  {
    "detection_id": "f2417277-e6b2-5000-937a-cc7681072f79-911b8c8f-f3e5-4905-bf5d-4997529c7640",
    "timestamp": "2026-07-15T03:14:46.992Z",
    "rule_uuid": "f2417277-e6b2-5000-937a-cc7681072f79",
    "rule_name": "Go Stack Trace in Agentless API",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "go-stack-trace-in-agentless-api"
  },
  {
    "detection_id": "724b0ec6-12b3-5272-9837-5e1805a69043-911b8c8f-f3e5-4905-bf5d-4997529c7640",
    "timestamp": "2026-07-15T03:14:46.992Z",
    "rule_uuid": "724b0ec6-12b3-5272-9837-5e1805a69043",
    "rule_name": "Failed to List Agentless Configs",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "failed-to-list-agentless-configs"
  },
  {
    "detection_id": "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6-a711fe18-8a50-4cf7-b24d-3d74f8dad71b",
    "timestamp": "2026-07-15T00:21:56.711Z",
    "rule_uuid": "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6",
    "rule_name": "Connectors Service Type Not Configured",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "trend_change",
    "p_value": 0.008268672869960692,
    "query_id": "connectors-service-type-not-configured"
  },
  {
    "detection_id": "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab-a711fe18-8a50-4cf7-b24d-3d74f8dad71b",
    "timestamp": "2026-07-15T00:21:56.711Z",
    "rule_uuid": "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab",
    "rule_name": "Connectors Field Validation Error (ConfigurableFieldValueError)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "dip",
    "p_value": 1.276245156641286e-50,
    "query_id": "connectors-field-validation-error-configurablefieldvalueerror"
  },
  {
    "detection_id": "541e4357-63d0-512c-b19a-86c4df17f852-a711fe18-8a50-4cf7-b24d-3d74f8dad71b",
    "timestamp": "2026-07-15T00:21:56.711Z",
    "rule_uuid": "541e4357-63d0-512c-b19a-86c4df17f852",
    "rule_name": "Elastic Agent Data Directory Symlink Missing",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "dip",
    "p_value": 2.973067167338795e-22,
    "query_id": "elastic-agent-data-directory-symlink-missing"
  },
  {
    "detection_id": "34b2bc19-42a4-5964-bc46-55191291dc2c-a711fe18-8a50-4cf7-b24d-3d74f8dad71b",
    "timestamp": "2026-07-15T00:14:22.754Z",
    "rule_uuid": "34b2bc19-42a4-5964-bc46-55191291dc2c",
    "rule_name": "Okta Developer Org Deactivated (E0000260)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "non_stationary",
    "p_value": 8.21099410686088e-10,
    "query_id": "okta-developer-org-deactivated-e0000260"
  },
  {
    "detection_id": "9ccd26b0-bce6-5b84-b60b-9cf347400f2f-95da6803-cae8-44b6-af59-66be886c05f4",
    "timestamp": "2026-07-14T20:54:29.142Z",
    "rule_uuid": "9ccd26b0-bce6-5b84-b60b-9cf347400f2f",
    "rule_name": "UIAM Service-Level Errors",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "change_point_type": "trend_change",
    "p_value": 0.0005071955200195433,
    "query_id": "uiam-service-level-errors"
  },
  {
    "detection_id": "90978945-4dad-582e-ae89-7897c5ec068b-66dcc7cf-09f7-431f-996d-19d2417817dc",
    "timestamp": "2026-07-14T12:02:50.253Z",
    "rule_uuid": "90978945-4dad-582e-ae89-7897c5ec068b",
    "rule_name": "GCP Invalid Credentials JSON in Cloudbeat",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "stationary",
    "p_value": 0,
    "query_id": "gcp-invalid-credentials-json-in-cloudbeat"
  },
  {
    "detection_id": "75637c65-b6fe-5d7a-a87c-912346e564af-bb0f6325-4fb8-43de-bf47-bff4a480c25b",
    "timestamp": "2026-07-14T11:50:55.137Z",
    "rule_uuid": "75637c65-b6fe-5d7a-a87c-912346e564af",
    "rule_name": "UIAM Authentication Failures via Proxy",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "change_point_type": "spike",
    "p_value": 0.000002937453964735326,
    "query_id": "uiam-authentication-failures-via-proxy"
  },
  {
    "detection_id": "cf4d5b49-4ce7-5c33-9440-a7470e3297fb-bb0f6325-4fb8-43de-bf47-bff4a480c25b",
    "timestamp": "2026-07-14T11:50:55.137Z",
    "rule_uuid": "cf4d5b49-4ce7-5c33-9440-a7470e3297fb",
    "rule_name": "Integration OAuth Token Fetch 403 Forbidden",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "integration-oauth-token-fetch-403-forbidden"
  },
  {
    "detection_id": "34b2bc19-42a4-5964-bc46-55191291dc2c-bb0f6325-4fb8-43de-bf47-bff4a480c25b",
    "timestamp": "2026-07-14T11:50:55.137Z",
    "rule_uuid": "34b2bc19-42a4-5964-bc46-55191291dc2c",
    "rule_name": "Okta Developer Org Deactivated (E0000260)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "okta-developer-org-deactivated-e0000260"
  },
  {
    "detection_id": "e6bd56b2-cf91-5b15-8c81-34750614f72d-c3e027ad-d025-46db-b643-416552357308",
    "timestamp": "2026-07-14T05:48:46.909Z",
    "rule_uuid": "e6bd56b2-cf91-5b15-8c81-34750614f72d",
    "rule_name": "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "stationary",
    "p_value": 0,
    "query_id": "seccomp-policy-conflict-in-heartbeat-synthetics-component"
  },
  {
    "detection_id": "cf9d5c6e-555c-5f43-ac3b-209d26616df7-c3e027ad-d025-46db-b643-416552357308",
    "timestamp": "2026-07-14T05:48:46.909Z",
    "rule_uuid": "cf9d5c6e-555c-5f43-ac3b-209d26616df7",
    "rule_name": "Go Panic in Agentless Component",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "stationary",
    "p_value": 0,
    "query_id": "go-panic-in-agentless-component"
  },
  {
    "detection_id": "fb98c038-7d1b-505f-8947-89d30da12f15-c3e027ad-d025-46db-b643-416552357308",
    "timestamp": "2026-07-14T05:48:46.909Z",
    "rule_uuid": "fb98c038-7d1b-505f-8947-89d30da12f15",
    "rule_name": "Agentless Component Entered FAILED State",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "stationary",
    "p_value": 0,
    "query_id": "agentless-component-entered-failed-state"
  },
  {
    "detection_id": "600f0451-6a20-58a3-9bf7-6f0c927cd892-f48ac8de-f403-4c12-ba50-6b92ef180d71",
    "timestamp": "2026-07-14T00:27:43+00:00",
    "rule_uuid": "600f0451-6a20-58a3-9bf7-6f0c927cd892",
    "rule_name": "Connectors Elasticsearch Index Not Found",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "connectors-elasticsearch-index-not-found"
  },
  {
    "detection_id": "b3d493c7-f608-5fe7-981a-cea0ca9c06a0-f48ac8de-f403-4c12-ba50-6b92ef180d71",
    "timestamp": "2026-07-14T00:27:43+00:00",
    "rule_uuid": "b3d493c7-f608-5fe7-981a-cea0ca9c06a0",
    "rule_name": "Connectors Elasticsearch Refresh API 404 Errors",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "connectors-elasticsearch-refresh-api-404-errors"
  },
  {
    "detection_id": "631140e7-ecf2-52c5-838e-10db0acce568-f48ac8de-f403-4c12-ba50-6b92ef180d71",
    "timestamp": "2026-07-13T23:44:45+00:00",
    "rule_uuid": "631140e7-ecf2-52c5-838e-10db0acce568",
    "rule_name": "OTel Collector Invalid Configuration Error",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "otel-collector-invalid-configuration-error"
  },
  {
    "detection_id": "9c07dd0c-cc94-5d3e-ab7f-3c8cf6ec62bc-f48ac8de-f403-4c12-ba50-6b92ef180d71",
    "timestamp": "2026-07-13T23:44:45+00:00",
    "rule_uuid": "9c07dd0c-cc94-5d3e-ab7f-3c8cf6ec62bc",
    "rule_name": "OTel Collector Persistent Recovery Restart Loop",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "otel-collector-persistent-recovery-restart-loop"
  },
  {
    "detection_id": "213d0477-e5fc-5c5d-b5f4-8fad58409430-f48ac8de-f403-4c12-ba50-6b92ef180d71",
    "timestamp": "2026-07-13T23:44:45+00:00",
    "rule_uuid": "213d0477-e5fc-5c5d-b5f4-8fad58409430",
    "rule_name": "OTel Collector Exited with Error (otel_manager)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "otel-collector-exited-with-error-otel-manager"
  },
  {
    "detection_id": "e6bd56b2-cf91-5b15-8c81-34750614f72d-6d8e630e-8e1f-4343-ae0b-94b968ae416f",
    "timestamp": "2026-07-13T23:11:36+00:00",
    "rule_uuid": "e6bd56b2-cf91-5b15-8c81-34750614f72d",
    "rule_name": "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "seccomp-policy-conflict-in-heartbeat-synthetics-component"
  },
  {
    "detection_id": "fb98c038-7d1b-505f-8947-89d30da12f15-6d8e630e-8e1f-4343-ae0b-94b968ae416f",
    "timestamp": "2026-07-13T23:11:36+00:00",
    "rule_uuid": "fb98c038-7d1b-505f-8947-89d30da12f15",
    "rule_name": "Agentless Component Entered FAILED State",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "agentless-component-entered-failed-state"
  },
  {
    "detection_id": "d0bc7e93-2f41-5715-b185-45a36967ae0d-6d8e630e-8e1f-4343-ae0b-94b968ae416f",
    "timestamp": "2026-07-13T23:11:36+00:00",
    "rule_uuid": "d0bc7e93-2f41-5715-b185-45a36967ae0d",
    "rule_name": "Component State Transitioned to FAILED (component.state)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "component-state-transitioned-to-failed-component-state"
  },
  {
    "detection_id": "53f7fa52-5b2d-5582-bf1f-f0072b6bc39b-10037f35-ffad-4118-80d1-ac8ef7c226ce",
    "timestamp": "2026-07-13T22:28:51+00:00",
    "rule_uuid": "53f7fa52-5b2d-5582-bf1f-f0072b6bc39b",
    "rule_name": "Proxy HTTP 5xx Server Errors",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "proxy-http-5xx-server-errors"
  },
  {
    "detection_id": "75637c65-b6fe-5d7a-a87c-912346e564af-ee2eaa07-71b8-47bc-9d87-5f726eb49f7d",
    "timestamp": "2026-07-13T20:43:39+00:00",
    "rule_uuid": "75637c65-b6fe-5d7a-a87c-912346e564af",
    "rule_name": "UIAM Authentication Failures via Proxy",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "uiam-authentication-failures-via-proxy"
  },
  {
    "detection_id": "3f81c6e4-f338-554b-806d-73fbf7439a89-7122defc-ddaa-4f1b-a04e-e874e1b4b16c",
    "timestamp": "2026-07-13T19:44:07+00:00",
    "rule_uuid": "3f81c6e4-f338-554b-806d-73fbf7439a89",
    "rule_name": "O365 DLP Subscription Permission Error (AF10001)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "o365-dlp-subscription-permission-error-af10001"
  },
  {
    "detection_id": "461a6b05-7641-5448-9258-a903f9f8cc1e-00160967-8ba8-4241-8416-6619e32a72eb",
    "timestamp": "2026-07-13T19:11:29+00:00",
    "rule_uuid": "461a6b05-7641-5448-9258-a903f9f8cc1e",
    "rule_name": "Connectors Python Client API Retry Error",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "connectors-python-client-api-retry-error"
  },
  {
    "detection_id": "663fad72-a6f6-55dc-be3f-e3352dd1a880-3014ac98-24d1-4521-9467-912e033da183",
    "timestamp": "2026-07-13T18:24:50+00:00",
    "rule_uuid": "663fad72-a6f6-55dc-be3f-e3352dd1a880",
    "rule_name": "CEL Input Retryable HTTP Request Failure",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "cel-input-retryable-http-request-failure"
  },
  {
    "detection_id": "03dbbeae-326d-5be6-b13d-991d459bd685-3014ac98-24d1-4521-9467-912e033da183",
    "timestamp": "2026-07-13T18:24:46+00:00",
    "rule_uuid": "03dbbeae-326d-5be6-b13d-991d459bd685",
    "rule_name": "Libbeat Output Read Errors",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "libbeat-output-read-errors"
  },
  {
    "detection_id": "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab-6d71b4b3-63dc-44a3-8800-6d149a927f43",
    "timestamp": "2026-07-13T17:43:39+00:00",
    "rule_uuid": "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab",
    "rule_name": "Connectors Field Validation Error (ConfigurableFieldValueError)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "connectors-field-validation-error-configurablefieldvalueerror"
  },
  {
    "detection_id": "7734fb52-a784-5201-bbc8-7dfffe011aa6-e171b842-b130-4ed9-9955-703a579e6b50",
    "timestamp": "2026-07-13T16:10:24+00:00",
    "rule_uuid": "7734fb52-a784-5201-bbc8-7dfffe011aa6",
    "rule_name": "CEL State Registry Cleanup Failure",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "cel-state-registry-cleanup-failure"
  },
  {
    "detection_id": "c30a4c14-975a-5f6b-acc7-a46893a5c21c-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
    "timestamp": "2026-07-13T15:28:44+00:00",
    "rule_uuid": "c30a4c14-975a-5f6b-acc7-a46893a5c21c",
    "rule_name": "Fleet Config Update Received by Component",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "fleet-config-update-received-by-component"
  },
  {
    "detection_id": "39c8a416-ad91-57c6-881e-29f7573d0987-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
    "timestamp": "2026-07-13T15:28:44+00:00",
    "rule_uuid": "39c8a416-ad91-57c6-881e-29f7573d0987",
    "rule_name": "Agentless Component Entered DEGRADED State",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "agentless-component-entered-degraded-state"
  },
  {
    "detection_id": "7a4990ec-34c8-5995-b24a-c55654745633-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
    "timestamp": "2026-07-13T15:28:44+00:00",
    "rule_uuid": "7a4990ec-34c8-5995-b24a-c55654745633",
    "rule_name": "Integration API 401 Unauthorized Errors",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "integration-api-401-unauthorized-errors"
  },
  {
    "detection_id": "ccb0705c-4931-5c85-b5a8-413b55c85f0a-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
    "timestamp": "2026-07-13T15:12:33+00:00",
    "rule_uuid": "ccb0705c-4931-5c85-b5a8-413b55c85f0a",
    "rule_name": "Connectors Missing Required Configuration Fields",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "connectors-missing-required-configuration-fields"
  },
  {
    "detection_id": "cf9d5c6e-555c-5f43-ac3b-209d26616df7-e3c95b49-0215-4187-bc14-f3f8ab74214b",
    "timestamp": "2026-07-13T14:42:17+00:00",
    "rule_uuid": "cf9d5c6e-555c-5f43-ac3b-209d26616df7",
    "rule_name": "Go Panic in Agentless Component",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "go-panic-in-agentless-component"
  },
  {
    "detection_id": "ee04da45-24d7-560c-896b-2075a3d23ddb-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3",
    "timestamp": "2026-07-13T14:09:53+00:00",
    "rule_uuid": "ee04da45-24d7-560c-896b-2075a3d23ddb",
    "rule_name": "HTTPJSON Retryable HTTP Request Failures",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "httpjson-retryable-http-request-failures"
  },
  {
    "detection_id": "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3",
    "timestamp": "2026-07-13T14:09:51+00:00",
    "rule_uuid": "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6",
    "rule_name": "Connectors Service Type Not Configured",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "connectors-service-type-not-configured"
  },
  {
    "detection_id": "3c864c83-8171-5311-bbd7-a267aa54e6ac-6ea9935d-9c97-4d66-bfc9-4e2d889971e5",
    "timestamp": "2026-07-13T12:49:11+00:00",
    "rule_uuid": "3c864c83-8171-5311-bbd7-a267aa54e6ac",
    "rule_name": "Component State Transition to FAILED (Message-Based)",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "component-state-transition-to-failed-message-based"
  },
  {
    "detection_id": "79e2c7f9-0504-52b6-b8d2-1d9e57e549fc-6ea9935d-9c97-4d66-bfc9-4e2d889971e5",
    "timestamp": "2026-07-13T12:49:11+00:00",
    "rule_uuid": "79e2c7f9-0504-52b6-b8d2-1d9e57e549fc",
    "rule_name": "Cloudbeat Launcher Fatal Exit",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "cloudbeat-launcher-fatal-exit"
  },
  {
    "detection_id": "90978945-4dad-582e-ae89-7897c5ec068b-6ea9935d-9c97-4d66-bfc9-4e2d889971e5",
    "timestamp": "2026-07-13T12:49:11+00:00",
    "rule_uuid": "90978945-4dad-582e-ae89-7897c5ec068b",
    "rule_name": "GCP Invalid Credentials JSON in Cloudbeat",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "gcp-invalid-credentials-json-in-cloudbeat"
  },
  {
    "detection_id": "86925279-9ba5-51b8-be2c-7fa3bbb73cb6-182f4f58-1d78-43c6-86e1-172a69e75362",
    "timestamp": "2026-07-13T11:04:07+00:00",
    "rule_uuid": "86925279-9ba5-51b8-be2c-7fa3bbb73cb6",
    "rule_name": "App Secrets or Config Object Creation",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "app-secrets-or-config-object-creation"
  },
  {
    "detection_id": "39fe8667-95af-570c-bf41-73a9cebf1674-182f4f58-1d78-43c6-86e1-172a69e75362",
    "timestamp": "2026-07-13T11:04:07+00:00",
    "rule_uuid": "39fe8667-95af-570c-bf41-73a9cebf1674",
    "rule_name": "Unexpected HTTP Method on Deployments Endpoint",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "change_point_type": "indeterminable",
    "p_value": 0,
    "query_id": "unexpected-http-method-on-deployments-endpoint"
  }
];
