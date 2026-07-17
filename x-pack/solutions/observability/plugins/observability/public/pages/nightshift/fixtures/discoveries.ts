/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureDiscovery } from './types';

export const discoveries: FixtureDiscovery[] = [
  {
    "discovery_id": "proxy__proxy-http-5xx-server-errors-2238e661-c94ffe82-38a9-4b74-a40f-da9c1a07c23a",
    "discovery_slug": "proxy__proxy-http-5xx-server-errors-2238e661",
    "timestamp": "2026-07-13T22:28:51+00:00",
    "kind": "discovery",
    "title": "Proxy — HTTP server: 5xx responses",
    "summary": "Proxy: proxied requests are failing with server-side HTTP 5xx responses. Clients using the proxy path cannot complete some requests while 5xx responses persist. 1 confirming 5xx row, onset 19:30 UTC, no recovery signal in the current window. Confidence 62 — query-confirmed proxy 5xx, no KI entity attribution.",
    "root_cause": "Ingress proxy requests are failing because an upstream backend behind the proxy is failing or unavailable, causing the proxy to return HTTP 5xx (1 rule-matched ES|QL evidence row since 19:30 UTC; backend identity not attributable from the returned row).",
    "criticality": 70,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "detection_ids": [
      "53f7fa52-5b2d-5582-bf1f-f0072b6bc39b-10037f35-ffad-4118-80d1-ac8ef7c226ce"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "proxy",
        "target": "backend service"
      }
    ]
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-c3357da3-2238e661-36dd-43b1-8c95-8b14a404ef4a",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-c3357da3",
    "timestamp": "2026-07-13T12:38:01+00:00",
    "kind": "discovery",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365: DLP audit subscription start is failing with a permission error and the audit collector is entering a degraded state. Security/audit consumers cannot rely on DLP audit data being ingested. 1 confirming error row, onset 11:00 UTC, no recovery signal in this batch. Confidence 60 — query-confirmed error evidence (1 row); no cause KI attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application permission set does not include the required Office 365 Management API permission for DLP.All, causing subscription start to fail with AF10001/401 Unauthorized.",
    "criticality": 65,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-1fcfb651-5095-47b2-bc24-f7889d80ee68"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-1b24d32d-1b24d32d-4bb8-4e56-bd3e-8362ab1113e6",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-1b24d32d",
    "timestamp": "2026-07-13T16:58:01+00:00",
    "kind": "discovery",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365: DLP audit subscription start is failing with an unauthorized permission error, and the collector is transitioning to a degraded state. Security/audit consumers cannot rely on DLP audit data being ingested while the subscription start fails. 1 confirming error event, onset 15:30 UTC, no recovery signal in this batch. Confidence 60 — 1 ES|QL-confirmed unauthorized permission failure, no KI attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application permission set is missing the required Office 365 Management API permission for DLP.All, causing subscription start to fail with unauthorized errors (AF10001).",
    "criticality": 65,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-d1c63aa7-f9a2-4f4a-9c2a-bdb84de6aae3"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-1b24d32d-1b24d32d-4bb8-4e56-bd3e-8362ab1113e6",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-1b24d32d",
    "timestamp": "2026-07-13T17:04:05+00:00",
    "kind": "handled",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365: DLP audit subscription start is failing with an unauthorized permission error, and the collector is transitioning to a degraded state. Security/audit consumers cannot rely on DLP audit data being ingested while the subscription start fails. 1 confirming error event, onset 15:30 UTC, no recovery signal in this batch. Confidence 60 — 1 ES|QL-confirmed unauthorized permission failure, no KI attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application permission set is missing the required Office 365 Management API permission for DLP.All, causing subscription start to fail with unauthorized errors (AF10001).",
    "criticality": 65,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-d1c63aa7-f9a2-4f4a-9c2a-bdb84de6aae3"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-1b24d32d-b79cfc6e-a5df-4a0c-8495-ffaf989ed8b5",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-1b24d32d",
    "timestamp": "2026-07-13T18:24:49+00:00",
    "kind": "discovery",
    "title": "O365 integration — DLP audit subscription: permission error",
    "summary": "O365 integration: DLP audit subscription start is failing with AF10001 permission errors and the collector is transitioning to a degraded state. Security/audit consumers cannot rely on DLP audit data being ingested while the subscription start fails. 1 confirming error row, onset 17:00 UTC, still active through the latest alert windows with no recovery signal. Confidence 63 — 1 query-confirmed AF10001 signature, no KI entity attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application permission set is missing the required Office 365 Management API permission for DLP.All, causing subscription start to fail with AF10001 (1 rule-matched ES|QL row since 17:00 UTC).",
    "criticality": 65,
    "confidence": 63,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-3014ac98-24d1-4521-9467-912e033da183"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-1b24d32d-e08910a9-9194-4d88-a343-7a082949af59",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-1b24d32d",
    "timestamp": "2026-07-13T19:44:07+00:00",
    "kind": "discovery",
    "title": "O365 integration — DLP audit subscription: permission error",
    "summary": "O365 integration: DLP audit subscription start is failing with AF10001 permission errors and the collector is entering a degraded state. Security/audit consumers cannot rely on DLP audit data being ingested while the subscription start fails. 1 confirming event row, onset 18:30 UTC, no recovery signal. Confidence 63 — query-confirmed AF10001 signature, no KI entity attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application permission set is missing the required Office 365 Management API permission for DLP.All, causing subscription start to fail with AF10001 (1 query-confirmed event since 18:30 UTC).",
    "criticality": 65,
    "confidence": 63,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-7122defc-ddaa-4f1b-a04e-e874e1b4b16c"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "o365 integration",
        "target": "office-365-management-api"
      }
    ]
  },
  {
    "discovery_id": "agentless__agentless-unit-spawn-fatal-error-cbffd6de-341c1ac6-b89c-4498-87b2-14c79a87bb1f",
    "discovery_slug": "agentless__agentless-unit-spawn-fatal-error-cbffd6de",
    "timestamp": "2026-07-13T23:11:36+00:00",
    "kind": "discovery",
    "title": "Agentless runtime — synthetics/heartbeat receiver: seccomp policy panic",
    "summary": "Agentless runtime: agentless-managed components are crashing and entering FAILED state, including a Heartbeat/Synthetics seccomp-policy registration panic. Workloads relying on agentless-managed integrations (including Cloudbeat CSPM under the agentless control plane) can experience monitoring and ingestion gaps while components remain FAILED. 3 confirmation matches since ~21:00 UTC, no recovery verified in this cycle. Confidence 65 — 3 query-confirmed in-window signatures; no KI entity attribut",
    "root_cause": "Agentless runtime is failing because an embedded Heartbeat/Synthetics component is double-registering its seccomp policy, triggering a Go panic (“seccomp policy is already registered”) that terminates the process and drives agent-managed units/components into FAILED state (3 ES|QL-confirmed matches since 21:00 UTC across the seccomp panic and FAILED transition signals).",
    "criticality": 65,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Agentless Component Entered FAILED State",
      "Component State Transitioned to FAILED (component.state)"
    ],
    "detection_ids": [
      "e6bd56b2-cf91-5b15-8c81-34750614f72d-6d8e630e-8e1f-4343-ae0b-94b968ae416f",
      "fb98c038-7d1b-505f-8947-89d30da12f15-6d8e630e-8e1f-4343-ae0b-94b968ae416f",
      "d0bc7e93-2f41-5715-b185-45a36967ae0d-6d8e630e-8e1f-4343-ae0b-94b968ae416f"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "internal",
        "source": "cloudbeat",
        "target": "agentless"
      }
    ]
  },
  {
    "discovery_id": "agentless__agentless-unit-spawn-fatal-error-cbffd6de-341c1ac6-b89c-4498-87b2-14c79a87bb1f",
    "discovery_slug": "agentless__agentless-unit-spawn-fatal-error-cbffd6de",
    "timestamp": "2026-07-13T23:36:21+00:00",
    "kind": "handled",
    "title": "Agentless runtime — synthetics/heartbeat receiver: seccomp policy panic",
    "summary": "Agentless runtime: agentless-managed components are crashing and entering FAILED state, including a Heartbeat/Synthetics seccomp-policy registration panic. Workloads relying on agentless-managed integrations (including Cloudbeat CSPM under the agentless control plane) can experience monitoring and ingestion gaps while components remain FAILED. 3 confirmation matches since ~21:00 UTC, no recovery verified in this cycle. Confidence 65 — 3 query-confirmed in-window signatures; no KI entity attribut",
    "root_cause": "Agentless runtime is failing because an embedded Heartbeat/Synthetics component is double-registering its seccomp policy, triggering a Go panic (“seccomp policy is already registered”) that terminates the process and drives agent-managed units/components into FAILED state (3 ES|QL-confirmed matches since 21:00 UTC across the seccomp panic and FAILED transition signals).",
    "criticality": 65,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "e6bd56b2-cf91-5b15-8c81-34750614f72d-6d8e630e-8e1f-4343-ae0b-94b968ae416f",
      "fb98c038-7d1b-505f-8947-89d30da12f15-6d8e630e-8e1f-4343-ae0b-94b968ae416f",
      "d0bc7e93-2f41-5715-b185-45a36967ae0d-6d8e630e-8e1f-4343-ae0b-94b968ae416f"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "internal",
        "source": "cloudbeat",
        "target": "agentless"
      }
    ]
  },
  {
    "discovery_id": "disc-opslead-20260715-okta-dev-org-deactivated",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__okta-developer-org-deactivated-e0000260-e40c02a6",
    "timestamp": "2026-07-15T00:14:22.754Z",
    "kind": "discovery",
    "title": "Okta integration — developer org: deactivated (E0000260)",
    "summary": "Okta integration: API requests failing with E0000260 (developer org deactivated) in agentless logs. Affects Okta data ingestion for the deactivated developer org. Onset 2026-07-14T18:30:00Z; current status unknown. Most urgent action: reactivate/replace the Okta developer org or update integration credentials/org configuration.",
    "root_cause": "Okta integration is failing because the Okta Developer Org is deactivated, and Okta API requests are being rejected with E0000260.",
    "criticality": 65,
    "confidence": 0.6,
    "impact": "Okta log collection/authentication for this developer org will fail; users depending on Okta data ingestion may see missing Okta events until the org is reactivated or credentials/org updated.",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "detection_ids": [
      "34b2bc19-42a4-5964-bc46-55191291dc2c-a711fe18-8a50-4cf7-b24d-3d74f8dad71b"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-c3357da3-c3357da3-e276-42c6-86a4-fd08dae44bb3",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-c3357da3",
    "timestamp": "2026-07-13T09:13:36+00:00",
    "kind": "discovery",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365: DLP audit subscription start requests are failing with a permission error, and the agentless O365 collector is entering a DEGRADED state. Security/audit consumers cannot rely on DLP audit data being ingested; the CEL collector path to O365 is exposed and failing. Alerting in three consecutive 30-minute windows, onset 07:30 UTC, no recovery signal in this batch. Confidence 62 — 1 KI query evidence row found; no entity KI attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application lacks the required permission set to start the Office 365 Management API DLP.All subscription (AF10001), forcing the O365 CEL unit into a DEGRADED state.",
    "criticality": 60,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-5c877a17-973c-45e0-bc3c-dff4dbbd6ec1"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "https",
        "source": "cel",
        "target": "o365"
      }
    ]
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-c3357da3-c3357da3-e276-42c6-86a4-fd08dae44bb3",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-c3357da3",
    "timestamp": "2026-07-13T09:15:36+00:00",
    "kind": "handled",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365: DLP audit subscription start requests are failing with a permission error, and the agentless O365 collector is entering a DEGRADED state. Security/audit consumers cannot rely on DLP audit data being ingested; the CEL collector path to O365 is exposed and failing. Alerting in three consecutive 30-minute windows, onset 07:30 UTC, no recovery signal in this batch. Confidence 62 — 1 KI query evidence row found; no entity KI attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application lacks the required permission set to start the Office 365 Management API DLP.All subscription (AF10001), forcing the O365 CEL unit into a DEGRADED state.",
    "criticality": 60,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-5c877a17-973c-45e0-bc3c-dff4dbbd6ec1"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "https",
        "source": "cel",
        "target": "o365"
      }
    ]
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-c3357da3-8aca4ce7-57f5-4a40-8c33-7447278e1eb1",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-c3357da3",
    "timestamp": "2026-07-13T09:18:28+00:00",
    "kind": "discovery",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365: DLP audit subscription start is failing with a permission error and the agentless O365 collector is entering a DEGRADED state. Security/audit consumers cannot rely on DLP audit data being ingested; the CEL collector path to O365 is exposed and failing over HTTPS. Alerting in three consecutive 30-minute windows, onset 08:00 UTC, no recovery signal in this batch. Confidence 62 — 1 confirming query evidence row found; no entity KI attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application lacks the required permission set to start the Office 365 Management API DLP.All subscription (AF10001), forcing the agentless CEL O365 audit unit into a DEGRADED state.",
    "criticality": 60,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-35316da0-926c-45f1-b36c-ba0fbd874fdf"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "https",
        "source": "cel",
        "target": "o365"
      }
    ]
  },
  {
    "discovery_id": "o365__o365-dlp-subscription-permission-error-a-c3357da3-bf94edae-4886-4240-af45-d91622d4d67d",
    "discovery_slug": "o365__o365-dlp-subscription-permission-error-a-c3357da3",
    "timestamp": "2026-07-13T10:57:53+00:00",
    "kind": "discovery",
    "title": "O365 — DLP audit subscription: permission error",
    "summary": "O365: DLP audit subscription start is failing with a permission error and the O365 audit collector is entering a DEGRADED state. Security/audit consumers cannot rely on DLP audit data being ingested; the CEL collector path to O365 is exposed and failing over HTTPS. 1 confirming error row, onset 10:00 UTC, no recovery signal in this batch. Confidence 63 — KI-confirmed query evidence (1 row); no cause KI attribution.",
    "root_cause": "O365 DLP audit collection is degraded because the configured Azure AD application is missing the required Office 365 Management API permission for DLP.All, causing subscription start to fail with AF10001 (1 confirming query evidence row since 10:00 UTC).",
    "criticality": 60,
    "confidence": 63,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "O365 DLP Subscription Permission Error (AF10001)"
    ],
    "detection_ids": [
      "3f81c6e4-f338-554b-806d-73fbf7439a89-182f4f58-1d78-43c6-86e1-172a69e75362"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "https",
        "source": "cel",
        "target": "o365"
      }
    ]
  },
  {
    "discovery_id": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2-da6e40d2-7635-4ff4-ab84-ae2a24f3ce0b",
    "discovery_slug": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2",
    "timestamp": "2026-07-13T12:49:11+00:00",
    "kind": "discovery",
    "title": "Cloudbeat — cis_gcp CSPM: invalid credentials JSON",
    "summary": "Cloudbeat: the cis_gcp CSPM component is failing to start and is transitioning to FAILED due to invalid GCP credentials JSON during configuration initialization. Security posture scanning/collection for the GCP CSPM integration is halted, reducing CSPM visibility for consumers of posture findings and related ingestion. 1 failure-confirming row, onset 11:30 UTC, no recovery signal in this batch. Confidence 60 — 1 found evidence plus dependency KI context; no cause KI attribution.",
    "root_cause": "Cloudbeat cis_gcp CSPM collection is failing because the GCP credentials JSON provided to Cloudbeat is invalid, causing the launcher to exit during GCP config initialization and the component to transition to FAILED (1 confirming state-transition evidence row since 11:30 UTC).",
    "criticality": 60,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Component State Transition to FAILED (Message-Based)",
      "Cloudbeat Launcher Fatal Exit",
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "detection_ids": [
      "3c864c83-8171-5311-bbd7-a267aa54e6ac-6ea9935d-9c97-4d66-bfc9-4e2d889971e5",
      "79e2c7f9-0504-52b6-b8d2-1d9e57e549fc-6ea9935d-9c97-4d66-bfc9-4e2d889971e5",
      "90978945-4dad-582e-ae89-7897c5ec068b-6ea9935d-9c97-4d66-bfc9-4e2d889971e5"
    ],
    "cause_ki_ids": [],
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
    ]
  },
  {
    "discovery_id": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2-da6e40d2-7635-4ff4-ab84-ae2a24f3ce0b",
    "discovery_slug": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2",
    "timestamp": "2026-07-13T13:04:30+00:00",
    "kind": "handled",
    "title": "Cloudbeat — cis_gcp CSPM: invalid credentials JSON",
    "summary": "Cloudbeat: the cis_gcp CSPM component is failing to start and is transitioning to FAILED due to invalid GCP credentials JSON during configuration initialization. Security posture scanning/collection for the GCP CSPM integration is halted, reducing CSPM visibility for consumers of posture findings and related ingestion. 1 failure-confirming row, onset 11:30 UTC, no recovery signal in this batch. Confidence 60 — 1 found evidence plus dependency KI context; no cause KI attribution.",
    "root_cause": "Cloudbeat cis_gcp CSPM collection is failing because the GCP credentials JSON provided to Cloudbeat is invalid, causing the launcher to exit during GCP config initialization and the component to transition to FAILED (1 confirming state-transition evidence row since 11:30 UTC).",
    "criticality": 60,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "3c864c83-8171-5311-bbd7-a267aa54e6ac-6ea9935d-9c97-4d66-bfc9-4e2d889971e5",
      "79e2c7f9-0504-52b6-b8d2-1d9e57e549fc-6ea9935d-9c97-4d66-bfc9-4e2d889971e5",
      "90978945-4dad-582e-ae89-7897c5ec068b-6ea9935d-9c97-4d66-bfc9-4e2d889971e5"
    ],
    "cause_ki_ids": [],
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
    ]
  },
  {
    "discovery_id": "connectors__connectors-elasticsearch-index-not-found-cbffd6de-8571c49e-fb3e-4fc8-839b-4e5f79657bfa",
    "discovery_slug": "connectors__connectors-elasticsearch-index-not-found-cbffd6de",
    "timestamp": "2026-07-13T19:11:29+00:00",
    "kind": "discovery",
    "title": "Connectors — Elasticsearch storage: index not found",
    "summary": "Connectors: connector sync/job execution is blocked by missing Elasticsearch backing storage (index not found), and connectors-py is retrying after 404 responses on refresh calls. Connector-based ingestion/synchronization cannot proceed for affected connectors. 2 confirming error rows, onset 18:00 UTC, no recovery signal in the current alert windows. Confidence 65 — 2 query-confirmed failure signatures, no KI entity attribution.",
    "root_cause": "Connectors sync/job execution is failing because the required Elasticsearch backing index .elastic-connectors-sync-jobs is missing, triggering index_not_found_exception errors and downstream 404 refresh retries in connectors-py.",
    "criticality": 60,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Python Client API Retry Error",
      "Connectors Elasticsearch Index Not Found"
    ],
    "detection_ids": [
      "461a6b05-7641-5448-9258-a903f9f8cc1e-00160967-8ba8-4241-8416-6619e32a72eb",
      "600f0451-6a20-58a3-9bf7-6f0c927cd892-00160967-8ba8-4241-8416-6619e32a72eb"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5-ec6ffbad-d22b-4624-9ad4-840f281939ff",
    "discovery_slug": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5",
    "timestamp": "2026-07-13T20:43:39+00:00",
    "kind": "discovery",
    "title": "UIAM — authentication endpoint: proxy-routed auth failures",
    "summary": "UIAM: authentication requests routed through the ingress proxy are failing (non-2xx responses on the _authenticate path). Callers relying on UIAM authentication via the proxy path cannot authenticate through this route. 1 confirming proxy failure event, onset 19:30 UTC, no recovery signal in the sampled window. Confidence 57 — query-confirmed proxy match, but no error text available in sampled row and no KI entity attribution.",
    "root_cause": "UIAM authentication is failing because the ingress proxy path for the UIAM _authenticate endpoint is returning non-2xx responses (1 ES|QL-confirmed proxy failure row since 19:30 UTC; sampled row lacks text fields for finer classification).",
    "criticality": 60,
    "confidence": 57,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "detection_ids": [
      "75637c65-b6fe-5d7a-a87c-912346e564af-ee2eaa07-71b8-47bc-9d87-5f726eb49f7d"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "agentless__otel-collector-exited-with-error-otel--49d734d5-49d734d5-59b0-4e39-8f34-0f272ba1d240",
    "discovery_slug": "agentless__otel-collector-exited-with-error-otel--49d734d5",
    "timestamp": "2026-07-13T23:44:45+00:00",
    "kind": "discovery",
    "title": "Agentless — OTel collector: invalid configuration restart loop",
    "summary": "Agentless: OTel collector startup is failing and the collector is repeatedly exiting and restarting in a recovery loop. Integrations relying on this agentless-managed OTel collector (notably AWS CloudWatch inputs referenced by the failing awscredentialsprovider extensions) cannot rely on telemetry collection while the collector remains unable to start cleanly. Confirmed in-window exit and recovery-restart signatures around 22:30 UTC, no sign of recovery in the sampled window. Confidence 65 — 3 q",
    "root_cause": "Agentless OTel collection is failing because the OTel collector configuration is invalid: awscredentialsprovider extensions are missing required AWS credential configuration (credentials, assume_role, or profile), causing otel_manager to repeatedly exit the collector and restart it in recovery (hundreds of retries observed).",
    "criticality": 60,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "OTel Collector Invalid Configuration Error",
      "OTel Collector Persistent Recovery Restart Loop",
      "OTel Collector Exited with Error (otel_manager)"
    ],
    "detection_ids": [
      "631140e7-ecf2-52c5-838e-10db0acce568-f48ac8de-f403-4c12-ba50-6b92ef180d71",
      "9c07dd0c-cc94-5d3e-ab7f-3c8cf6ec62bc-f48ac8de-f403-4c12-ba50-6b92ef180d71",
      "213d0477-e5fc-5c5d-b5f4-8fad58409430-f48ac8de-f403-4c12-ba50-6b92ef180d71"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "internal",
        "source": "otel_manager",
        "target": "otel-collector"
      }
    ]
  },
  {
    "discovery_id": "agentless__otel-collector-exited-with-error-otel--49d734d5-49d734d5-59b0-4e39-8f34-0f272ba1d240",
    "discovery_slug": "agentless__otel-collector-exited-with-error-otel--49d734d5",
    "timestamp": "2026-07-13T23:57:35+00:00",
    "kind": "handled",
    "title": "Agentless — OTel collector: invalid configuration restart loop",
    "summary": "Agentless: OTel collector startup is failing and the collector is repeatedly exiting and restarting in a recovery loop. Integrations relying on this agentless-managed OTel collector (notably AWS CloudWatch inputs referenced by the failing awscredentialsprovider extensions) cannot rely on telemetry collection while the collector remains unable to start cleanly. Confirmed in-window exit and recovery-restart signatures around 22:30 UTC, no sign of recovery in the sampled window. Confidence 65 — 3 q",
    "root_cause": "Agentless OTel collection is failing because the OTel collector configuration is invalid: awscredentialsprovider extensions are missing required AWS credential configuration (credentials, assume_role, or profile), causing otel_manager to repeatedly exit the collector and restart it in recovery (hundreds of retries observed).",
    "criticality": 60,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "631140e7-ecf2-52c5-838e-10db0acce568-f48ac8de-f403-4c12-ba50-6b92ef180d71",
      "9c07dd0c-cc94-5d3e-ab7f-3c8cf6ec62bc-f48ac8de-f403-4c12-ba50-6b92ef180d71",
      "213d0477-e5fc-5c5d-b5f4-8fad58409430-f48ac8de-f403-4c12-ba50-6b92ef180d71"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "internal",
        "source": "otel_manager",
        "target": "otel-collector"
      }
    ]
  },
  {
    "discovery_id": "connectors__connectors-elasticsearch-index-not-foun-2032fddb-2032fddb-a6c6-49f8-8829-9cf6a5016099",
    "discovery_slug": "connectors__connectors-elasticsearch-index-not-foun-2032fddb",
    "timestamp": "2026-07-14T00:27:43+00:00",
    "kind": "discovery",
    "title": "Connectors — Elasticsearch backing indices: missing index",
    "summary": "Connectors: connector sync/job operations are failing due to missing Elasticsearch connector indices, producing index-not-found and refresh 404 errors. Connector-backed ingestions cannot run their sync jobs as expected. Confirmed by 2 log matches starting 00:00 UTC, no recovery shown in this check. Confidence 62 — 2 confirming evidences, no KI entity attribution.",
    "root_cause": "Connectors service is erroring because required connector system indices are missing in Elasticsearch, causing index-not-found and refresh 404 errors.",
    "criticality": 60,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Index Not Found",
      "Connectors Elasticsearch Refresh API 404 Errors"
    ],
    "detection_ids": [
      "600f0451-6a20-58a3-9bf7-6f0c927cd892-f48ac8de-f403-4c12-ba50-6b92ef180d71",
      "b3d493c7-f608-5fe7-981a-cea0ca9c06a0-f48ac8de-f403-4c12-ba50-6b92ef180d71"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "connectors",
        "target": "elasticsearch"
      }
    ]
  },
  {
    "discovery_id": "connectors__connectors-elasticsearch-index-not-foun-2032fddb-2032fddb-a6c6-49f8-8829-9cf6a5016099",
    "discovery_slug": "connectors__connectors-elasticsearch-index-not-foun-2032fddb",
    "timestamp": "2026-07-14T00:33:57+00:00",
    "kind": "handled",
    "title": "Connectors — Elasticsearch backing indices: missing index",
    "summary": "Connectors: connector sync/job operations are failing due to missing Elasticsearch connector indices, producing index-not-found and refresh 404 errors. Connector-backed ingestions cannot run their sync jobs as expected. Confirmed by 2 log matches starting 00:00 UTC, no recovery shown in this check. Confidence 62 — 2 confirming evidences, no KI entity attribution.",
    "root_cause": "Connectors service is erroring because required connector system indices are missing in Elasticsearch, causing index-not-found and refresh 404 errors.",
    "criticality": 60,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "600f0451-6a20-58a3-9bf7-6f0c927cd892-f48ac8de-f403-4c12-ba50-6b92ef180d71",
      "b3d493c7-f608-5fe7-981a-cea0ca9c06a0-f48ac8de-f403-4c12-ba50-6b92ef180d71"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "connectors",
        "target": "elasticsearch"
      }
    ]
  },
  {
    "discovery_id": "89a472cd-ce9e-4cca-bc11-0353383dd1e9",
    "discovery_slug": "agentless__agentless-unit-spawn-fatal-error-cbffd6de",
    "timestamp": "2026-07-14T05:48:46.909Z",
    "kind": "discovery",
    "title": "Agentless runtime — heartbeat/synthetics: seccomp policy already registered panic",
    "summary": "Agentless runtime: components are crash-looping with a Go panic (“seccomp policy is already registered”) and units are entering FAILED state. Affects agentless-managed integrations in logging-gcp-us-central1, including Cloudbeat CSPM GCP (cis_gcp) which cannot remain running. Pattern present across three consecutive activity windows and confirmed by rule-matched log rows. Most urgent action: mitigate the seccomp double-registration crash (rollback/fix) to restore agentless component stability.",
    "root_cause": "Agentless runtime is failing because an embedded Heartbeat/Synthetics component double-registers its seccomp policy, triggering a Go panic (“seccomp policy is already registered”) that terminates the process and drives agent-managed units into FAILED state.",
    "criticality": 60,
    "confidence": 0.75,
    "impact": "Agentless-managed integrations are unstable: Heartbeat/Synthetics components crash with a seccomp policy conflict, and at least one Cloudbeat CSPM GCP (cis_gcp) unit is entering FAILED state, blocking CSPM compliance scanning/data collection for affected agentless workloads.",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component",
      "Go Panic in Agentless Component",
      "Agentless Component Entered FAILED State"
    ],
    "detection_ids": [
      "e6bd56b2-cf91-5b15-8c81-34750614f72d-c3e027ad-d025-46db-b643-416552357308",
      "cf9d5c6e-555c-5f43-ac3b-209d26616df7-c3e027ad-d025-46db-b643-416552357308",
      "fb98c038-7d1b-505f-8947-89d30da12f15-c3e027ad-d025-46db-b643-416552357308"
    ],
    "cause_ki_ids": [
      {
        "name": "synthetics-http-input",
        "stream_name": "logging-gcp-us-central1-logs-agentless-log-default"
      },
      {
        "name": "synthetics-tcp-input",
        "stream_name": "logging-gcp-us-central1-logs-agentless-log-default"
      }
    ],
    "dependency_edges": []
  },
  {
    "discovery_id": "discovery-2026-07-14T11:48:20Z-1",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__integration-oauth-token-fetch-403-forbid-c0f47ba8",
    "timestamp": "2026-07-14T11:50:55.137Z",
    "kind": "discovery",
    "title": "Authentication — proxy/token fetch: 403 forbidden failures",
    "summary": "Authentication: elevated authentication failures via ingress proxy and Okta agentless integration token fetch failures. Affects proxy-mediated auth (/..._authenticate...) and Okta system log collection. Onset around 2026-07-14T10:00Z with confirmed 4xx/403 patterns. Most urgent action: verify Okta org status/credentials and proxy auth path configuration.",
    "root_cause": "Authentication requests are failing because upstream identity provider access is returning 403 Forbidden (including Okta developer org deactivation E0000260), causing proxy-auth and token fetch operations to be rejected.",
    "criticality": 60,
    "confidence": 0.62,
    "impact": "Users/systems attempting to authenticate via the proxy and integrations fetching Okta OAuth tokens may receive failures (HTTP 4xx), potentially blocking authentication and Okta log ingestion.",
    "stream_names": [
      "logging-gcp-us-central1-logs-all",
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy",
      "Integration OAuth Token Fetch 403 Forbidden",
      "Okta Developer Org Deactivated (E0000260)"
    ],
    "detection_ids": [
      "75637c65-b6fe-5d7a-a87c-912346e564af-bb0f6325-4fb8-43de-bf47-bff4a480c25b",
      "cf4d5b49-4ce7-5c33-9440-a7470e3297fb-bb0f6325-4fb8-43de-bf47-bff4a480c25b",
      "34b2bc19-42a4-5964-bc46-55191291dc2c-bb0f6325-4fb8-43de-bf47-bff4a480c25b"
    ],
    "cause_ki_ids": [
      {
        "name": "ingress-proxy",
        "stream_name": "logging-gcp-us-central1-logs-all"
      },
      {
        "name": "uiam",
        "stream_name": "logging-gcp-us-central1-logs-all"
      },
      {
        "name": "ingress-proxy",
        "stream_name": "logging-gcp-us-central1-logs-all"
      }
    ],
    "dependency_edges": []
  },
  {
    "discovery_id": "gcp-cred-json-2026-07-14T10-30Z",
    "discovery_slug": "cloudbeat__cloudbeat-launcher-fatal-exit-da6e40d2",
    "timestamp": "2026-07-14T12:02:50.253Z",
    "kind": "discovery",
    "title": "Cloudbeat — cis_gcp CSPM: invalid credentials JSON",
    "summary": "Cloudbeat cis_gcp: GCP CSPM component fails to start due to invalid GCP credentials JSON. Affects CSPM scanning and findings ingestion for the configured GCP environment. Onset at 2026-07-14T10:30Z; failure confirmed by a launcher fatal initialization error row. Fix/replace the GCP service account credentials JSON in the cis_gcp integration configuration.",
    "root_cause": "Cloudbeat cis_gcp CSPM collection is failing because the GCP credentials JSON provided to Cloudbeat is invalid, causing GCP config initialization to fail and the launcher to exit.",
    "criticality": 60,
    "confidence": 0.65,
    "impact": "Cloudbeat cis_gcp (GCP CSPM) cannot start, so GCP security posture scanning and findings ingestion are halted for the affected agentless deployment.",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "GCP Invalid Credentials JSON in Cloudbeat"
    ],
    "detection_ids": [
      "90978945-4dad-582e-ae89-7897c5ec068b-66dcc7cf-09f7-431f-996d-19d2417817dc"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "source": "cloudbeat",
        "target": "gcp",
        "protocol": "https",
        "exposure": "internal"
      },
      {
        "source": "cloudbeat",
        "target": "agentless",
        "protocol": "internal",
        "exposure": "internal"
      }
    ]
  },
  {
    "discovery_id": "7a28c589-400e-4f5a-825a-4a373425e779",
    "discovery_slug": "logging-gcp-us-central1-logs-all__uiam-service-level-errors-c892202d",
    "timestamp": "2026-07-14T20:54:29.142Z",
    "kind": "discovery",
    "title": "UIAM — service runtime: entropy source stuck errors",
    "summary": "UIAM: service-level errors with 'entropy source stuck'. Potential impact to any auth/identity flows depending on UIAM. Onset around 20:50Z with a trend change and strong p_value≈0.00051; first confirming error row at 20:53Z. Most urgent action: check UIAM runtime/host entropy availability and blocking calls to the RNG/entropy device.",
    "root_cause": "UIAM is erroring because its entropy source is stuck, preventing required random number generation.",
    "criticality": 60,
    "confidence": 0.6,
    "impact": "Requests relying on UIAM may error or degrade if entropy/rng is unavailable or blocked; blast radius unknown from current evidence.",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Service-Level Errors"
    ],
    "detection_ids": [
      "9ccd26b0-bce6-5b84-b60b-9cf347400f2f-95da6803-cae8-44b6-af59-66be886c05f4"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "disc-opslead-20260715-connectors-config-validation",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-l__agentless-component-entered-degraded-sta-f9294da9",
    "timestamp": "2026-07-15T00:21:56.711Z",
    "kind": "discovery",
    "title": "Agentless connectors — configuration validation: required fields missing",
    "summary": "Agentless connectors: connector runs are failing with configuration validation errors and degraded runtime cleanup. Confluence connector users are affected (connectors → confluence dependency is exposed). Errors began around 2026-07-13T22:30Z and are still present in the latest alert window. Most urgent action: audit/fix connector policy required fields and restore the elastic-agent data directory symlink to stabilize the agentless runtime.",
    "root_cause": "Agentless connectors are failing because connector policies are missing required configuration fields (and at least one integration token is invalid), triggering ConfigurableFieldValueError and credential errors; concurrently, the agentless elastic-agent data directory symlink is missing, causing the runtime cleanup to degrade and reschedule components.",
    "criticality": 60,
    "confidence": 0.74,
    "impact": "Users running agentless connector syncs (notably Confluence connector users) cannot sync or ingest data because connector policies are missing required configuration fields and some connector credentials are invalid. Agentless connector runtime is additionally degraded due to missing elastic-agent data directory symlink, increasing instability/rescheduling.",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured",
      "Connectors Field Validation Error (ConfigurableFieldValueError)",
      "Elastic Agent Data Directory Symlink Missing"
    ],
    "detection_ids": [
      "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6-a711fe18-8a50-4cf7-b24d-3d74f8dad71b",
      "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab-a711fe18-8a50-4cf7-b24d-3d74f8dad71b",
      "541e4357-63d0-512c-b19a-86c4df17f852-a711fe18-8a50-4cf7-b24d-3d74f8dad71b"
    ],
    "cause_ki_ids": [
      {
        "name": "connectors",
        "stream_name": "logging-gcp-us-central1-logs-agentless-log-default"
      }
    ],
    "dependency_edges": [
      {
        "source": "connectors",
        "target": "confluence",
        "protocol": "https",
        "exposure": "exposed"
      }
    ]
  },
  {
    "discovery_id": "agentless-api__app-secrets-or-config-object-creation-274b69b5-bc757259-3df2-424a-a695-f5e77cb003c4",
    "discovery_slug": "agentless-api__app-secrets-or-config-object-creation-274b69b5",
    "timestamp": "2026-07-13T11:04:07+00:00",
    "kind": "discovery",
    "title": "Agentless API — deployments endpoint: non-GET request observed",
    "summary": "Agentless API: the deployments endpoint is receiving at least one non-GET request. Kibana-origin traffic is exposed to agentless-api over mTLS; operators using Kibana to manage agentless deployments may be impacted if these requests represent unintended mutations. 1 confirmed non-GET endpoint hit (and 1 unconfirmed secrets/config creation match), onset 10:00 UTC, no recovery signal in this batch. Confidence 55 — 1 confirming evidence, 1 inconclusive evidence, no cause KI attribution.",
    "root_cause": "Agentless API is receiving non-GET requests to the serverless deployments endpoint because a caller is issuing deployment-mutation requests over the Kibana-to-agentless-api mTLS path (1 confirming query row since 10:00 UTC); secrets/config object creation activity is unconfirmed by the executed query’s returned message text (1 row, non-confirming).",
    "criticality": 55,
    "confidence": 55,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "App Secrets or Config Object Creation",
      "Unexpected HTTP Method on Deployments Endpoint"
    ],
    "detection_ids": [
      "86925279-9ba5-51b8-be2c-7fa3bbb73cb6-182f4f58-1d78-43c6-86e1-172a69e75362",
      "39fe8667-95af-570c-bf41-73a9cebf1674-182f4f58-1d78-43c6-86e1-172a69e75362"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "exposed",
        "protocol": "mtls",
        "source": "kibana",
        "target": "agentless-api"
      }
    ]
  },
  {
    "discovery_id": "4a918cc8-c126-48c8-ad48-9d6b705a8d7b",
    "discovery_slug": "logging-gcp-us-central1-logs-agentless-a__k8s-client-check-failure-820d3ef5",
    "timestamp": "2026-07-15T03:14:46.992Z",
    "kind": "discovery",
    "title": "Agentless API — deployments list: HTTP error",
    "summary": "Agentless API: deployment/config listing is failing with HTTP errors and Go stack traces. Affects Kibana → agentless-api serverless deployments list path. Ongoing since 2026-07-15T02:30Z; failure confirmed at 02:48:36Z in current window. Most urgent action: investigate agentless-api connectivity to the Kubernetes API and review the stack trace for the failing handler.",
    "root_cause": "agentless-api is failing because its deployments/config listing handler cannot list agentless configs from the Kubernetes API, causing HTTP errors and emitting Go stack traces.",
    "criticality": 55,
    "confidence": 0.65,
    "impact": "Kibana-origin requests that list serverless deployments/configs can fail because agentless-api cannot retrieve agentless configs, producing HTTP errors.",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-api-log-default"
    ],
    "rule_names": [
      "Go Stack Trace in Agentless API",
      "Failed to List Agentless Configs"
    ],
    "detection_ids": [
      "f2417277-e6b2-5000-937a-cc7681072f79-911b8c8f-f3e5-4905-bf5d-4997529c7640",
      "724b0ec6-12b3-5272-9837-5e1805a69043-911b8c8f-f3e5-4905-bf5d-4997529c7640"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "source": "kibana",
        "target": "agentless-api",
        "protocol": "mTLS",
        "exposure": "exposed"
      }
    ]
  },
  {
    "discovery_id": "proxy__proxy-http-5xx-server-errors-2238e661-215221e0-ee58-49a0-95bf-f9dbc00a1a20",
    "discovery_slug": "proxy__proxy-http-5xx-server-errors-2238e661",
    "timestamp": "2026-07-13T13:38:55+00:00",
    "kind": "discovery",
    "title": "Proxy — HTTP server: 5xx responses",
    "summary": "Proxy: requests are failing with server-side 5xx responses (confirmed 503). Clients behind the proxy cannot complete some proxied requests. 2 confirming event rows, onset 12:00 UTC, no recovery signal in this batch. Confidence 55 — query-confirmed 5xx/503; no cause KI attribution.",
    "root_cause": "The ingress proxy is returning HTTP 503 because an upstream backend service is unavailable (2 rule-matched evidence rows since 12:00 UTC; dependency KI shows proxy → es-es-index over HTTP but the failing backend is not identified in the query output).",
    "criticality": 55,
    "confidence": 55,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "detection_ids": [
      "53f7fa52-5b2d-5582-bf1f-f0072b6bc39b-1deac67d-5607-45d7-aa20-fa7e0e50c1d7"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "proxy",
        "target": "es-es-index"
      }
    ]
  },
  {
    "discovery_id": "connectors__connectors-field-validation-error-config-5e9243fd-5e9243fd-4936-41db-9cd8-20b8facf96c1",
    "discovery_slug": "connectors__connectors-field-validation-error-config-5e9243fd",
    "timestamp": "2026-07-13T14:09:51+00:00",
    "kind": "discovery",
    "title": "Connectors — connector configuration: service type not configured / missing required fields",
    "summary": "Connectors: connector sync/jobs are not running due to configuration errors (service type not configured and required fields failing validation). Connector-based ingestion cannot proceed; Confluence connectivity is a known integration path (connectors → confluence over HTTPS). 2 confirming error rows, onset 12:30 UTC, no recovery signal in this batch. Confidence 65 — query-confirmed errors; no cause KI attribution.",
    "root_cause": "Connectors is failing because connector policies/config are incomplete (service_type unset and required configuration fields empty), causing startup/validation errors that prevent sync jobs from running (2 rule-matched ES|QL confirmations since 12:30 UTC).",
    "criticality": 55,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Service Type Not Configured",
      "Connectors Field Validation Error (ConfigurableFieldValueError)"
    ],
    "detection_ids": [
      "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3",
      "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "connectors",
        "target": "confluence"
      }
    ]
  },
  {
    "discovery_id": "httpjson__httpjson-retryable-http-request-failures-5e9243fd-5e9243fd-4936-41db-9cd8-20b8facf96c1",
    "discovery_slug": "httpjson__httpjson-retryable-http-request-failures-5e9243fd",
    "timestamp": "2026-07-13T14:09:53+00:00",
    "kind": "discovery",
    "title": "HTTPJSON — outbound API calls: retryable request failures",
    "summary": "HTTPJSON: outbound integration API calls are failing after retries (“request failed”), indicating collection is stalling for at least one HTTPJSON-based integration. Consumers of that integration’s ingested data cannot rely on timely ingestion. 1 confirming error row, onset 12:30 UTC, no recovery signal in this batch. Confidence 60 — query-confirmed retryable request failure; no cause KI attribution.",
    "root_cause": "HTTPJSON integrations are failing because outbound HTTP requests to an external API are failing even after retries, stalling data collection (1 rule-matched ES|QL confirmation since 12:30 UTC).",
    "criticality": 55,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "HTTPJSON Retryable HTTP Request Failures"
    ],
    "detection_ids": [
      "ee04da45-24d7-560c-896b-2075a3d23ddb-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "httpjson__httpjson-retryable-http-request-failures-5e9243fd-5e9243fd-4936-41db-9cd8-20b8facf96c1",
    "discovery_slug": "httpjson__httpjson-retryable-http-request-failures-5e9243fd",
    "timestamp": "2026-07-13T14:15:28+00:00",
    "kind": "handled",
    "title": "HTTPJSON — outbound API calls: retryable request failures",
    "summary": "HTTPJSON: outbound integration API calls are failing after retries (“request failed”), indicating collection is stalling for at least one HTTPJSON-based integration. Consumers of that integration’s ingested data cannot rely on timely ingestion. 1 confirming error row, onset 12:30 UTC, no recovery signal in this batch. Confidence 60 — query-confirmed retryable request failure; no cause KI attribution.",
    "root_cause": "HTTPJSON integrations are failing because outbound HTTP requests to an external API are failing even after retries, stalling data collection (1 rule-matched ES|QL confirmation since 12:30 UTC).",
    "criticality": 55,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "ee04da45-24d7-560c-896b-2075a3d23ddb-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "connectors__connectors-field-validation-error-config-5e9243fd-5e9243fd-4936-41db-9cd8-20b8facf96c1",
    "discovery_slug": "connectors__connectors-field-validation-error-config-5e9243fd",
    "timestamp": "2026-07-13T14:15:28+00:00",
    "kind": "handled",
    "title": "Connectors — connector configuration: service type not configured / missing required fields",
    "summary": "Connectors: connector sync/jobs are not running due to configuration errors (service type not configured and required fields failing validation). Connector-based ingestion cannot proceed; Confluence connectivity is a known integration path (connectors → confluence over HTTPS). 2 confirming error rows, onset 12:30 UTC, no recovery signal in this batch. Confidence 65 — query-confirmed errors; no cause KI attribution.",
    "root_cause": "Connectors is failing because connector policies/config are incomplete (service_type unset and required configuration fields empty), causing startup/validation errors that prevent sync jobs from running (2 rule-matched ES|QL confirmations since 12:30 UTC).",
    "criticality": 55,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "d62a0b2e-db35-52c3-afc9-2f1c2c8ac7e6-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3",
      "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab-f0052b34-3a53-47a9-bc1e-c7b0c3504dc3"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "connectors",
        "target": "confluence"
      }
    ]
  },
  {
    "discovery_id": "agentless__fleet-config-update-received-by-componen-1dc7d7dd-1dc7d7dd-30c0-44de-b39f-cba05d59519c",
    "discovery_slug": "agentless__fleet-config-update-received-by-componen-1dc7d7dd",
    "timestamp": "2026-07-13T14:42:17+00:00",
    "kind": "discovery",
    "title": "Agentless runtime — OTel collector: invalid configuration and component panics",
    "summary": "Agentless: agentless-managed integrations are crash-looping and failing to collect data due to confirmed Go panics and an OTel collector invalid-configuration/exit condition. Consumers of agentless integration ingestion cannot rely on timely data collection for affected integrations. 2 confirming error events (panic + collector invalid configuration) since 13:00 UTC, recovery not verified in this cycle. Confidence 62 — 2 query-confirmed failure signatures; no cause KI attribution for impacted wo",
    "root_cause": "Agentless runtime is failing because a configuration rollout introduced (1) a seccomp policy registration conflict that triggers Go panics and terminates components and (2) an invalid OTel collector configuration missing required AWS credentials settings, causing otel_manager to exit the collector and enter recovery restarts (2 rule-matched ES|QL confirmations since 13:00 UTC; Fleet update event unverified this cycle).",
    "criticality": 55,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Fleet Config Update Received by Component",
      "OTel Collector Invalid Configuration Error",
      "Go Panic in Agentless Component"
    ],
    "detection_ids": [
      "c30a4c14-975a-5f6b-acc7-a46893a5c21c-e3c95b49-0215-4187-bc14-f3f8ab74214b",
      "631140e7-ecf2-52c5-838e-10db0acce568-e3c95b49-0215-4187-bc14-f3f8ab74214b",
      "cf9d5c6e-555c-5f43-ac3b-209d26616df7-e3c95b49-0215-4187-bc14-f3f8ab74214b"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "opentelemetry-collector"
      }
    ]
  },
  {
    "discovery_id": "agentless__seccomp-policy-conflict-in-heartbeat-synt-2ff05b08-2ff05b08-2c6a-4fa7-a5ff-11b27fdd78d8",
    "discovery_slug": "agentless__seccomp-policy-conflict-in-heartbeat-synt-2ff05b08",
    "timestamp": "2026-07-13T14:55:34+00:00",
    "kind": "discovery",
    "title": "Agentless — heartbeat/synthetics: seccomp policy panic",
    "summary": "Agentless: heartbeat/synthetics components are crashing at startup with a seccomp registration panic. Synthetics monitoring coverage (Heartbeat/CEL-backed checks) is disrupted for affected agentless integrations. Confirmed in 1 log event, onset 12:00 UTC, no recovery confirmed in this cycle. Confidence 58 — 1 confirming evidence, no KI-derived entity attribution.",
    "root_cause": "Agentless heartbeat/synthetics components are failing because the process panics during startup when a seccomp policy is registered while one is already registered, terminating the component.",
    "criticality": 55,
    "confidence": 58,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Seccomp Policy Conflict in Heartbeat/Synthetics Component"
    ],
    "detection_ids": [
      "e6bd56b2-cf91-5b15-8c81-34750614f72d-e3c95b49-0215-4187-bc14-f3f8ab74214b"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "heartbeat/synthetics"
      }
    ]
  },
  {
    "discovery_id": "agentless__seccomp-policy-conflict-in-heartbeat-synt-2ff05b08-2ff05b08-2c6a-4fa7-a5ff-11b27fdd78d8",
    "discovery_slug": "agentless__seccomp-policy-conflict-in-heartbeat-synt-2ff05b08",
    "timestamp": "2026-07-13T15:03:40+00:00",
    "kind": "handled",
    "title": "Agentless — heartbeat/synthetics: seccomp policy panic",
    "summary": "Agentless: heartbeat/synthetics components are crashing at startup with a seccomp registration panic. Synthetics monitoring coverage (Heartbeat/CEL-backed checks) is disrupted for affected agentless integrations. Confirmed in 1 log event, onset 12:00 UTC, no recovery confirmed in this cycle. Confidence 58 — 1 confirming evidence, no KI-derived entity attribution.",
    "root_cause": "Agentless heartbeat/synthetics components are failing because the process panics during startup when a seccomp policy is registered while one is already registered, terminating the component.",
    "criticality": 55,
    "confidence": 58,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "e6bd56b2-cf91-5b15-8c81-34750614f72d-e3c95b49-0215-4187-bc14-f3f8ab74214b"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "heartbeat/synthetics"
      }
    ]
  },
  {
    "discovery_id": "agentless__fleet-config-update-received-by-componen-1dc7d7dd-1dc7d7dd-30c0-44de-b39f-cba05d59519c",
    "discovery_slug": "agentless__fleet-config-update-received-by-componen-1dc7d7dd",
    "timestamp": "2026-07-13T15:03:41+00:00",
    "kind": "handled",
    "title": "Agentless runtime — OTel collector: invalid configuration and component panics",
    "summary": "Agentless: agentless-managed integrations are crash-looping and failing to collect data due to confirmed Go panics and an OTel collector invalid-configuration/exit condition. Consumers of agentless integration ingestion cannot rely on timely data collection for affected integrations. 2 confirming error events (panic + collector invalid configuration) since 13:00 UTC, recovery not verified in this cycle. Confidence 62 — 2 query-confirmed failure signatures; no cause KI attribution for impacted wo",
    "root_cause": "Agentless runtime is failing because a configuration rollout introduced (1) a seccomp policy registration conflict that triggers Go panics and terminates components and (2) an invalid OTel collector configuration missing required AWS credentials settings, causing otel_manager to exit the collector and enter recovery restarts (2 rule-matched ES|QL confirmations since 13:00 UTC; Fleet update event unverified this cycle).",
    "criticality": 55,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "c30a4c14-975a-5f6b-acc7-a46893a5c21c-e3c95b49-0215-4187-bc14-f3f8ab74214b",
      "631140e7-ecf2-52c5-838e-10db0acce568-e3c95b49-0215-4187-bc14-f3f8ab74214b",
      "cf9d5c6e-555c-5f43-ac3b-209d26616df7-e3c95b49-0215-4187-bc14-f3f8ab74214b"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "internal",
        "source": "agentless",
        "target": "opentelemetry-collector"
      }
    ]
  },
  {
    "discovery_id": "connectors__connectors-field-validation-error-config-5e9243fd-e417241d-c578-43a7-98da-8bc6f768b44b",
    "discovery_slug": "connectors__connectors-field-validation-error-config-5e9243fd",
    "timestamp": "2026-07-13T15:12:33+00:00",
    "kind": "discovery",
    "title": "Connectors — connector configuration: missing required fields",
    "summary": "Connectors: connector sync/jobs are failing due to missing required configuration fields / validation errors. Connector-based ingestion cannot proceed for affected connectors. 2 confirming error events, onset 2026-07-13T13:30 UTC, no sign of recovery. Confidence 63 — 2 query-confirmed validation failures; no cause KI attribution.",
    "root_cause": "Connectors is failing because required connector configuration fields are empty/invalid, triggering connector field validation failures that prevent sync jobs from starting (2 rule-matched ES|QL confirmations since 2026-07-13T13:30:00Z).",
    "criticality": 55,
    "confidence": 63,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Field Validation Error (ConfigurableFieldValueError)",
      "Connectors Missing Required Configuration Fields"
    ],
    "detection_ids": [
      "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
      "ccb0705c-4931-5c85-b5a8-413b55c85f0a-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "agentless__agentless-component-entered-degraded-state-4b738b1b-4b738b1b-2290-4f2f-9440-63d10a96ca79",
    "discovery_slug": "agentless__agentless-component-entered-degraded-state-4b738b1b",
    "timestamp": "2026-07-13T15:28:44+00:00",
    "kind": "discovery",
    "title": "Agentless — integrations: degraded state and 401 unauthorized",
    "summary": "Agentless: at least one agentless-managed integration is operating in a degraded mode while external integration API calls are failing with 401 Unauthorized. Consumers of agentless integration ingestion for the affected integration(s) cannot rely on timely/complete data collection. 2 confirming log events, onset 2026-07-13T13:30 UTC, no recovery signal in the latest window. Confidence 62 — 2 found evidences; no cause KI attribution.",
    "root_cause": "Agentless-managed integrations are degraded because integration API authentication is failing (401 Unauthorized), producing repeated request-processing errors and leaving at least one component running in a DEGRADED state (2 rule-matched ES|QL confirmations since 2026-07-13T14:30:00Z).",
    "criticality": 55,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Agentless Component Entered DEGRADED State",
      "Integration API 401 Unauthorized Errors",
      "Fleet Config Update Received by Component"
    ],
    "detection_ids": [
      "39c8a416-ad91-57c6-881e-29f7573d0987-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
      "7a4990ec-34c8-5995-b24a-c55654745633-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
      "c30a4c14-975a-5f6b-acc7-a46893a5c21c-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "cel",
        "target": "ess-billing"
      }
    ]
  },
  {
    "discovery_id": "connectors__connectors-elasticsearch-index-not-found-cbffd6de-f3baa2b1-d458-4f79-a011-7fffdbd7cecd",
    "discovery_slug": "connectors__connectors-elasticsearch-index-not-found-cbffd6de",
    "timestamp": "2026-07-13T15:44:53+00:00",
    "kind": "discovery",
    "title": "Connectors — Elasticsearch storage: index not found",
    "summary": "Connectors: connector sync/job execution is blocked by missing Elasticsearch backing storage (index not found) and connectors client refresh 404 retry errors. Connector-based ingestion cannot proceed for affected connectors. 2 confirming error events, onset 14:00 UTC, still alerting through 15:00 UTC with no recovery signal. Confidence 63 — 2 query-confirmed failure signatures; one rule has no confirming query and no cause KI attribution.",
    "root_cause": "Connectors sync/job execution is failing because the required Elasticsearch backing index .elastic-connectors-sync-jobs is missing, which also drives connectors client refresh operations to return HTTP 404 and enter retry.",
    "criticality": 55,
    "confidence": 63,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Index Not Found",
      "Connectors Elasticsearch Refresh API 404 Errors",
      "Connectors Python Client API Retry Error"
    ],
    "detection_ids": [
      "600f0451-6a20-58a3-9bf7-6f0c927cd892-37075072-7cba-485b-9197-ebdfc6e2ad1e",
      "b3d493c7-f608-5fe7-981a-cea0ca9c06a0-37075072-7cba-485b-9197-ebdfc6e2ad1e",
      "461a6b05-7641-5448-9258-a903f9f8cc1e-37075072-7cba-485b-9197-ebdfc6e2ad1e"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "agentless__agentless-component-entered-degraded-state-4b738b1b-4b738b1b-2290-4f2f-9440-63d10a96ca79",
    "discovery_slug": "agentless__agentless-component-entered-degraded-state-4b738b1b",
    "timestamp": "2026-07-13T16:04:44+00:00",
    "kind": "handled",
    "title": "Agentless — integrations: degraded state and 401 unauthorized",
    "summary": "Agentless: at least one agentless-managed integration is operating in a degraded mode while external integration API calls are failing with 401 Unauthorized. Consumers of agentless integration ingestion for the affected integration(s) cannot rely on timely/complete data collection. 2 confirming log events, onset 2026-07-13T13:30 UTC, no recovery signal in the latest window. Confidence 62 — 2 found evidences; no cause KI attribution.",
    "root_cause": "Agentless-managed integrations are degraded because integration API authentication is failing (401 Unauthorized), producing repeated request-processing errors and leaving at least one component running in a DEGRADED state (2 rule-matched ES|QL confirmations since 2026-07-13T14:30:00Z).",
    "criticality": 55,
    "confidence": 62,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [],
    "detection_ids": [
      "39c8a416-ad91-57c6-881e-29f7573d0987-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
      "7a4990ec-34c8-5995-b24a-c55654745633-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56",
      "c30a4c14-975a-5f6b-acc7-a46893a5c21c-99d9d71e-6ce9-4c19-a07b-c2ef403b6f56"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "cel",
        "target": "ess-billing"
      }
    ]
  },
  {
    "discovery_id": "agentless__agentless-component-entered-degraded-state-4b738b1b-65abae15-da36-4344-9019-c4206b5044f3",
    "discovery_slug": "agentless__agentless-component-entered-degraded-state-4b738b1b",
    "timestamp": "2026-07-13T16:10:24+00:00",
    "kind": "discovery",
    "title": "Okta integration — OAuth token fetch: developer org deactivated",
    "summary": "Agentless Okta integration: Okta system log collection is failing with OAuth token fetch errors (403 Forbidden) tied to a deactivated Okta developer org (E0000260). Consumers of Okta system log ingestion cannot rely on timely/complete Okta audit visibility. 2 confirming events, onset 14:30 UTC, no recovery signal in this batch. Confidence 65 — 2 query-confirmed auth failures; no cause KI attribution.",
    "root_cause": "Okta integration ingestion is failing because the configured Okta developer organization is deactivated, causing OAuth token fetch to return 403 Forbidden (E0000260) and halting Okta system log collection (2 rule-matched ES|QL confirmations since 2026-07-13T14:30:00Z).",
    "criticality": 55,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Okta Developer Org Deactivated (E0000260)",
      "Integration OAuth Token Fetch 403 Forbidden",
      "CEL State Registry Cleanup Failure"
    ],
    "detection_ids": [
      "34b2bc19-42a4-5964-bc46-55191291dc2c-e171b842-b130-4ed9-9955-703a579e6b50",
      "cf4d5b49-4ce7-5c33-9440-a7470e3297fb-e171b842-b130-4ed9-9955-703a579e6b50",
      "7734fb52-a784-5201-bbc8-7dfffe011aa6-e171b842-b130-4ed9-9955-703a579e6b50"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "httpjson",
        "target": "okta"
      }
    ]
  },
  {
    "discovery_id": "proxy__proxy-http-5xx-server-errors-2238e661-e8a33615-55db-441a-b589-c23843947f70",
    "discovery_slug": "proxy__proxy-http-5xx-server-errors-2238e661",
    "timestamp": "2026-07-13T16:21:36+00:00",
    "kind": "discovery",
    "title": "Proxy — HTTP server: 5xx responses",
    "summary": "Proxy: proxied requests are failing with server-side HTTP 5xx responses. Clients using the proxy path cannot complete some requests routed to Elasticsearch backends. 1 confirming 5xx event, onset 14:30 UTC, still alerting through 15:30 UTC with no recovery signal. Confidence 58 — query-confirmed proxy 5xx; dependency KIs identify ES backends but no entity attribution.",
    "root_cause": "Proxy is returning HTTP 5xx because an upstream Elasticsearch-tier backend behind the proxy is failing or unavailable (1 rule-matched ES|QL row confirms proxy 5xx since 14:30 UTC; dependency KIs show proxy → es-es-index and proxy → es-es-search over HTTP).",
    "criticality": 55,
    "confidence": 58,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "Proxy HTTP 5xx Server Errors"
    ],
    "detection_ids": [
      "53f7fa52-5b2d-5582-bf1f-f0072b6bc39b-e171b842-b130-4ed9-9955-703a579e6b50"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "proxy",
        "target": "es-es-index"
      },
      {
        "exposure": "not_exposed",
        "protocol": "http",
        "source": "proxy",
        "target": "es-es-search"
      }
    ]
  },
  {
    "discovery_id": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5-4d98cab1-cad7-416d-831a-d2250ff42cdf",
    "discovery_slug": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5",
    "timestamp": "2026-07-13T17:10:08+00:00",
    "kind": "discovery",
    "title": "UIAM — authentication endpoint: proxy-routed auth failures",
    "summary": "UIAM: authentication requests routed through the ingress proxy are failing (HTTP >=400 on the _authenticate path). Callers relying on UIAM authentication via the proxy path cannot authenticate. 1 confirming event, onset 16:00 UTC, still alerting through 16:30 UTC with no recovery signal. Confidence 60 — 1 query-confirmed auth failure; no KI attribution.",
    "root_cause": "UIAM authentication is failing because the ingress proxy path for the UIAM _authenticate endpoint is returning non-2xx responses (1 rule-matched ES|QL row since 16:00 UTC).",
    "criticality": 55,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "detection_ids": [
      "75637c65-b6fe-5d7a-a87c-912346e564af-a3f408de-c320-4564-bf0f-a3775d4cb698"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5-4d98cab1-cad7-416d-831a-d2250ff42cdf",
    "discovery_slug": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5",
    "timestamp": "2026-07-13T17:16:33+00:00",
    "kind": "handled",
    "title": "UIAM — authentication endpoint: proxy-routed auth failures",
    "summary": "UIAM: authentication requests routed through the ingress proxy are failing (HTTP >=400 on the _authenticate path). Callers relying on UIAM authentication via the proxy path cannot authenticate. 1 confirming event, onset 16:00 UTC, still alerting through 16:30 UTC with no recovery signal. Confidence 60 — 1 query-confirmed auth failure; no KI attribution.",
    "root_cause": "UIAM authentication is failing because the ingress proxy path for the UIAM _authenticate endpoint is returning non-2xx responses (1 rule-matched ES|QL row since 16:00 UTC).",
    "criticality": 55,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [],
    "detection_ids": [
      "75637c65-b6fe-5d7a-a87c-912346e564af-a3f408de-c320-4564-bf0f-a3775d4cb698"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "connectors__connectors-elasticsearch-index-not-found-cbffd6de-fc2c4930-7cbe-4915-a9c4-73a77d017d46",
    "discovery_slug": "connectors__connectors-elasticsearch-index-not-found-cbffd6de",
    "timestamp": "2026-07-13T17:31:37+00:00",
    "kind": "discovery",
    "title": "Connectors — Elasticsearch storage: index not found",
    "summary": "Connectors: connector sync/job execution is blocked by missing Elasticsearch backing storage (index not found), with downstream refresh API 404s and client retry errors. Connector-based ingestion cannot proceed for affected connectors. 3 confirming error rows, onset 16:00 UTC, still active through 17:00 UTC with no recovery signal. Confidence 65 — 3 query-confirmed failure signatures; dependency KI identifies Elasticsearch but no cause entity attribution.",
    "root_cause": "Connectors sync/job execution is failing because the required Elasticsearch backing index .elastic-connectors-sync-jobs is missing, triggering index-not-found exceptions and downstream refresh API 404 failures that drive connectors-py client retries (3 ES|QL-confirmed rows across the rule-matched queries).",
    "criticality": 55,
    "confidence": 65,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Elasticsearch Refresh API 404 Errors",
      "Connectors Elasticsearch Index Not Found",
      "Connectors Python Client API Retry Error"
    ],
    "detection_ids": [
      "b3d493c7-f608-5fe7-981a-cea0ca9c06a0-6d71b4b3-63dc-44a3-8800-6d149a927f43",
      "600f0451-6a20-58a3-9bf7-6f0c927cd892-6d71b4b3-63dc-44a3-8800-6d149a927f43",
      "461a6b05-7641-5448-9258-a903f9f8cc1e-6d71b4b3-63dc-44a3-8800-6d149a927f43"
    ],
    "cause_ki_ids": [],
    "dependency_edges": [
      {
        "exposure": "not_exposed",
        "protocol": "https",
        "source": "connectors",
        "target": "elasticsearch"
      }
    ]
  },
  {
    "discovery_id": "connectors__connectors-field-validation-error-configu-8966f9c8-8966f9c8-c039-409e-b134-d446c7c099db",
    "discovery_slug": "connectors__connectors-field-validation-error-configu-8966f9c8",
    "timestamp": "2026-07-13T17:43:39+00:00",
    "kind": "discovery",
    "title": "Connectors — connector configuration: field validation errors",
    "summary": "Connectors: connector sync jobs are failing due to connector configuration validation errors. Connector-based ingestion cannot start for the affected connector(s) until required configuration fields are populated. 1 confirming error event, onset 17:30 UTC, still present across the 17:30–18:00 UTC alert windows with no recovery signal. Confidence 60 — query-confirmed validation failure, no KI entity attribution.",
    "root_cause": "Connectors is failing because required connector configuration fields are missing/empty, triggering ConfigurableFieldValueError validation failures that prevent connector sync jobs from starting (1 ES|QL-confirmed row since 17:30 UTC).",
    "criticality": 55,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Connectors Field Validation Error (ConfigurableFieldValueError)"
    ],
    "detection_ids": [
      "ec7e1b38-a3ec-53ad-9f84-499c1db9ceab-6d71b4b3-63dc-44a3-8800-6d149a927f43"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5-3ef2e82d-4be7-449b-bb4b-0d8d4144df5d",
    "discovery_slug": "uiam__uiam-authentication-failures-via-proxy-85a4cfd5",
    "timestamp": "2026-07-13T18:09:50+00:00",
    "kind": "discovery",
    "title": "UIAM — authentication endpoint: proxy-routed auth failures",
    "summary": "UIAM: authentication requests routed through the ingress proxy are failing (non-2xx on the _authenticate path). Callers relying on UIAM authentication via the proxy path cannot authenticate. 1 confirming event, onset 17:00 UTC, no recovery signal in this batch. Confidence 60 — 1 query-confirmed proxy-routed auth failure, no KI entity attribution.",
    "root_cause": "UIAM authentication is failing because the ingress proxy path for the UIAM _authenticate endpoint is returning non-2xx responses (1 rule-matched ES|QL row since 17:00 UTC).",
    "criticality": 55,
    "confidence": 60,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-all"
    ],
    "rule_names": [
      "UIAM Authentication Failures via Proxy"
    ],
    "detection_ids": [
      "75637c65-b6fe-5d7a-a87c-912346e564af-3014ac98-24d1-4521-9467-912e033da183"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "libbeat__libbeat-output-read-errors-b79cfc6e-b79cfc6e-a5df-4a0c-8495-ffaf989ed8b5",
    "discovery_slug": "libbeat__libbeat-output-read-errors-b79cfc6e",
    "timestamp": "2026-07-13T18:24:46+00:00",
    "kind": "discovery",
    "title": "Elastic Agent — output pipeline: read errors",
    "summary": "Elastic Agent/Beat: event shipping is degraded with output read errors. Consumers of this agentless-managed stream cannot rely on timely/complete ingestion while the output read errors persist. 1 confirming event row, onset 17:00 UTC, still active through the latest alert windows with no recovery signal. Confidence 58 — 1 query-confirmed metric breach, no KI entity attribution.",
    "root_cause": "Elastic Agent/Beat output shipping is degraded because the output connection is encountering response read errors (monitoring.metrics.libbeat.output.read.errors > 0 confirmed by 1 rule-matched ES|QL row since 17:00 UTC).",
    "criticality": 55,
    "confidence": 58,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "Libbeat Output Read Errors"
    ],
    "detection_ids": [
      "03dbbeae-326d-5be6-b13d-991d459bd685-3014ac98-24d1-4521-9467-912e033da183"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  },
  {
    "discovery_id": "cel__cel-input-retryable-http-request-failure-b79cfc6e-b79cfc6e-a5df-4a0c-8495-ffaf989ed8b5",
    "discovery_slug": "cel__cel-input-retryable-http-request-failure-b79cfc6e",
    "timestamp": "2026-07-13T18:24:50+00:00",
    "kind": "discovery",
    "title": "CEL integration — outbound HTTP: retryable request failures",
    "summary": "CEL integration: outbound API collection calls are failing after retries (request failed). Consumers of the affected CEL-based integration cannot rely on that integration’s ingested data while outbound request failures persist. 1 confirming error row, onset 17:00 UTC, still active through the latest alert windows with no recovery signal. Confidence 58 — 1 query-confirmed retryable request failure, no KI entity attribution.",
    "root_cause": "CEL-based integration collection is failing because outbound HTTP requests are failing even after retries in the input.cel.retryablehttp client (1 rule-matched ES|QL row since 17:00 UTC).",
    "criticality": 55,
    "confidence": 58,
    "impact": "",
    "stream_names": [
      "logging-gcp-us-central1-logs-agentless-log-default"
    ],
    "rule_names": [
      "CEL Input Retryable HTTP Request Failure"
    ],
    "detection_ids": [
      "663fad72-a6f6-55dc-be3f-e3352dd1a880-3014ac98-24d1-4521-9467-912e033da183"
    ],
    "cause_ki_ids": [],
    "dependency_edges": []
  }
];
