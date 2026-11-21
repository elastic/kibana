/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import {
  HUNT_REPORT_HUNT_STATUSES,
  HUNT_REPORT_MINT_SUPPRESSIONS,
  HUNT_REPORT_PACKAGE_STATUSES,
  type HuntReportHuntStatus,
  type HuntReportMintSuppression,
  type HuntReportPackageStatus,
} from '../../../common/telemetry/workers/continuous_threat_hunt';
import {
  ALERTZERO_TELEMETRY_PREFIX,
  ENVELOPE_SCHEMA,
  countField,
  flagField,
  optionalInvestigationIdField,
  vocabularyField,
  type AlertZeroEnvelope,
} from '../worker_event_fields';

export const CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENTS = {
  HuntReportCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_hunt_report_completed`,
} as const;

export interface AlertZeroHuntReportCompletedPayload extends AlertZeroEnvelope {
  closed_clean: boolean;
  coverage_kis_skipped: number;
  coverage_kis_written: number;
  has_confirmed_hit: boolean;
  hunt_status: HuntReportHuntStatus;
  investigation_id?: string;
  mint_suppression: HuntReportMintSuppression;
  package_status: HuntReportPackageStatus;
  proposals_dispatch_failed: number;
  proposals_prepared: number;
  tier2_invoked?: boolean;
}

export interface ContinuousThreatHuntTelemetryEventPayloads {
  [CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENTS.HuntReportCompleted]: AlertZeroHuntReportCompletedPayload;
}

export const ALERTZERO_HUNT_REPORT_COMPLETED_EVENT: EventTypeOpts<AlertZeroHuntReportCompletedPayload> =
  {
    eventType: CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENTS.HuntReportCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      closed_clean: flagField(
        'Whether a run with no confirmed hit closed the Investigation: as benign, or as `other` for a `retired_incomplete` run, which is true too although part of the report was never searched'
      ),
      coverage_kis_skipped: countField('Coverage knowledge items packaging did not write'),
      coverage_kis_written: countField(
        'Coverage knowledge items packaging wrote for Detection Watch'
      ),
      has_confirmed_hit: flagField('Whether the hunt cleared the confirmed-hit bar'),
      hunt_status: vocabularyField(
        "The hunt child's result status (`unknown` is any other value)",
        HUNT_REPORT_HUNT_STATUSES
      ),
      investigation_id: optionalInvestigationIdField(
        "The report's Investigation; joins to its close and reopen. Absent only when `package_status` is `run_incomplete`, because the Worker could not find or create the Investigation"
      ),
      mint_suppression: vocabularyField(
        'Why packaging held back its Proposals',
        HUNT_REPORT_MINT_SUPPRESSIONS
      ),
      package_status: vocabularyField("Packaging's own status", HUNT_REPORT_PACKAGE_STATUSES),
      proposals_dispatch_failed: countField('Proposal gates that failed to launch'),
      proposals_prepared: countField('Proposals packaging prepared and launched a gate for'),
      tier2_invoked: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the hunt ran Behavior Hunt (behavioral queries); absent when the Worker did not pass it',
          optional: true,
        },
      },
    },
  };

export const CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_HUNT_REPORT_COMPLETED_EVENT,
] as const;
