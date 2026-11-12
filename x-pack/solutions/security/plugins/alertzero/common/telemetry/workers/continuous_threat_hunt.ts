/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  countInput,
  defineReportableEvents,
  flagInput,
  oneOfInput,
  oneOfOrDefaultInput,
  optionalFlagInput,
  optionalInvestigationIdInput,
} from '../report_step_input_fields';

/** The Hunt child's result status for one report; `unknown` is any other value. */
export const HUNT_REPORT_HUNT_STATUSES = [
  'success',
  'partial',
  'retired_incomplete',
  'failed',
  'unknown',
] as const;

export type HuntReportHuntStatus = (typeof HUNT_REPORT_HUNT_STATUSES)[number];

/** The Hunt packaging child's own status for one report. */
export const HUNT_REPORT_PACKAGE_STATUSES = ['success', 'run_incomplete'] as const;

export type HuntReportPackageStatus = (typeof HUNT_REPORT_PACKAGE_STATUSES)[number];

/** Why Hunt packaging held back its Proposals, mirroring the packaging step's `mintSuppression`. */
export const HUNT_REPORT_MINT_SUPPRESSIONS = [
  'none',
  'existing_proposals',
  'check_failed',
] as const;

export type HuntReportMintSuppression = (typeof HUNT_REPORT_MINT_SUPPRESSIONS)[number];

const huntReportCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('hunt_report_completed'),
    closed_clean: flagInput(
      'Whether a run with no confirmed hit closed the Investigation: as benign, or as `other` for a `retired_incomplete` run, which is true too although part of the report was never searched'
    ),
    coverage_kis_skipped: countInput('Coverage knowledge items packaging did not write'),
    coverage_kis_written: countInput(
      'Coverage knowledge items packaging wrote for Detection Watch'
    ),
    has_confirmed_hit: flagInput('Whether the hunt cleared the confirmed-hit bar'),
    hunt_status: oneOfInput(HUNT_REPORT_HUNT_STATUSES, "The hunt child's result status"),
    investigation_id: optionalInvestigationIdInput(
      "The report's Investigation; absent only when package_status is run_incomplete"
    ),
    mint_suppression: oneOfOrDefaultInput(
      HUNT_REPORT_MINT_SUPPRESSIONS,
      'none',
      'Why packaging held back its Proposals'
    ),
    package_status: oneOfInput(HUNT_REPORT_PACKAGE_STATUSES, "Packaging's own status"),
    proposals_dispatch_failed: countInput('Proposal gates that failed to launch'),
    proposals_prepared: countInput('Proposals packaging prepared and launched a gate for'),
    tier2_invoked: optionalFlagInput('Whether the hunt ran Behavior Hunt'),
  })
);

export const CONTINUOUS_THREAT_HUNT_REPORTABLE_EVENTS = defineReportableEvents(
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  {
    hunt_report_completed: huntReportCompletedInputSchema,
  }
);
