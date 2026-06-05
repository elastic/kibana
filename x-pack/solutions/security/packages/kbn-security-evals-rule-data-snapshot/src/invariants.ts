/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Expected document counts per index after a successful restore.
 *
 * These numbers come from the initial snapshot creation run
 * (integration samples @ 80 docs each, endpoint samples @ 200 each).
 * The invariant check allows a small tolerance for sampling variance.
 */
const EXPECTED_INDEX_COUNTS: Record<string, { min: number; max: number }> = {
  'logs-o365.audit-default': { min: 80, max: 80 },
  'logs-azure.auditlogs-default': { min: 80, max: 80 },
  'logs-gcp.audit-default': { min: 80, max: 80 },
  'logs-windows.sysmon_operational-default': { min: 80, max: 80 },
  'logs-network_traffic.http-default': { min: 80, max: 80 },
  'logs-network_traffic.flow-default': { min: 80, max: 80 },
  'logs-aws.cloudtrail-default': { min: 80, max: 80 },
  'logs-google_workspace.admin-default': { min: 80, max: 80 },
  'logs-okta.system-default': { min: 80, max: 80 },
  'logs-windows.powershell_operational-default': { min: 80, max: 80 },
  'logs-endpoint.events.file-default': { min: 200, max: 200 },
  'logs-endpoint.events.process-default': { min: 200, max: 200 },
  'logs-endpoint.events.network-default': { min: 200, max: 200 },
  'logs-endpoint.events.registry-default': { min: 200, max: 200 },
};

/**
 * Verify that the restored snapshot contains the expected indices with
 * roughly the expected document counts. Surfaces snapshot↔dataset drift
 * as a single actionable failure.
 */
export const verifyRuleDataInvariants = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> => {
  const violations: string[] = [];

  for (const [index, expected] of Object.entries(EXPECTED_INDEX_COUNTS)) {
    try {
      const { count } = await esClient.count({ index });
      if (count < expected.min || count > expected.max) {
        violations.push(
          `${index}: expected ${expected.min}-${expected.max} docs, found ${count}`
        );
      }
    } catch (err) {
      violations.push(`${index}: count query failed — ${String(err)}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `[rule-data] invariant violations after restore:\n  - ${violations.join('\n  - ')}`
    );
  }

  log.info('[rule-data] all invariants verified');
};
