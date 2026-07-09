/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

// Stub: real implementation (with full event-based-telemetry wiring) is added
// by a later PR in the stack. This minimal version forwards to analytics so
// PR2's discoveries plugin scaffold tests can exercise the call path; FF-off
// prod safety is preserved because no caller is reached unless the FF is on.
interface ReportMisconfigurationParams {
  analytics?: AnalyticsServiceSetup;
  logger: Logger;
  // space_id / workflow_id are filled in by the real telemetry-event impl
  // (later PR in the stack). PR3 callers (plugin startup misconfiguration
  // reports) only have detail + misconfiguration_type at hand, so the
  // optional fields keep the stub forward-compatible. FF-off prod safety
  // is preserved because no caller is reached unless the FF is on.
  params: {
    detail: string;
    misconfiguration_type: string;
    space_id?: string;
    workflow_id?: string;
  };
}

export const reportMisconfiguration = ({
  analytics,
  params,
}: ReportMisconfigurationParams): void => {
  analytics?.reportEvent('attack_discovery_misconfiguration', params);
};
