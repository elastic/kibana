/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ActionableFinding, ContinuityPayload } from '@kbn/siem-readiness';
import {
  isCriticalFailureRate,
  VOLUME_DROP_WARNING_PCT,
  VOLUME_DROP_CRITICAL_PCT,
} from '@kbn/siem-readiness';
import { fetchPipelines } from '../fetchers';

export const getContinuity = async ({
  esClient,
  isServerless,
  logger,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
  logger: Logger;
}): Promise<ContinuityPayload> => {
  const pipelines = await fetchPipelines({ esClient, isServerless, logger });

  const actionableFindings: ActionableFinding[] = [];

  // pipeline failure-rate findings (existing)
  pipelines
    .filter((p) => p.statsAvailable && isCriticalFailureRate(p.failedDocsCount, p.docsCount))
    .forEach((p) =>
      actionableFindings.push({
        severity: 'CRITICAL' as const,
        type: 'pipeline_failure' as const,
        message: `Pipeline ${p.name} has a critical document failure rate (${p.failedDocsCount} of ${p.docsCount} failed)`,
        resource: p.name,
      })
    );

  // silence and volume-drop findings — merged when both apply to the same pipeline
  pipelines.forEach((p) => {
    const hasSilence = p.isSilent;
    const hasVolumeDrop = p.volumeDropPct !== null && p.volumeDropPct !== undefined;
    const isVolumeCritical = hasVolumeDrop && p.volumeDropPct! >= VOLUME_DROP_CRITICAL_PCT;
    const isVolumeWarning =
      hasVolumeDrop && !isVolumeCritical && p.volumeDropPct! >= VOLUME_DROP_WARNING_PCT;

    if (hasSilence) {
      // Silence is the primary signal. Include volume context when a baseline exists
      // so the operator sees both facts in one finding rather than two separate bullets.
      const volumeContext =
        hasVolumeDrop && p.baseline7dAvg != null
          ? ` (${p.volumeDropPct}% volume drop vs ~${Math.round(p.baseline7dAvg)} docs/day baseline)`
          : '';
      actionableFindings.push({
        severity: 'CRITICAL' as const,
        type: 'silence' as const,
        message: `Data stream serving pipeline ${p.name} has gone silent${volumeContext}`,
        resource: p.name,
      });
    } else if (isVolumeCritical) {
      actionableFindings.push({
        severity: 'CRITICAL' as const,
        type: 'volume_drop_critical' as const,
        message: `Pipeline ${p.name} volume dropped ${p.volumeDropPct}% vs 7-day baseline (~${Math.round(p.baseline7dAvg!)} docs/day)`,
        resource: p.name,
      });
    } else if (isVolumeWarning) {
      actionableFindings.push({
        severity: 'WARNING' as const,
        type: 'volume_drop_warning' as const,
        message: `Pipeline ${p.name} volume dropped ${p.volumeDropPct}% vs 7-day baseline (~${Math.round(p.baseline7dAvg!)} docs/day)`,
        resource: p.name,
      });
    }
  });

  const status =
    pipelines.length === 0
      ? ('noData' as const)
      : actionableFindings.length > 0
      ? ('actionsRequired' as const)
      : ('healthy' as const);

  const summary = buildContinuitySummary(status, pipelines.length, actionableFindings);

  return { status, summary, items: pipelines, actionableFindings };
};

const buildContinuitySummary = (
  status: string,
  pipelineCount: number,
  findings: ActionableFinding[]
): string => {
  if (status === 'noData') return 'No active ingest pipelines found.';
  if (findings.length === 0) return `All ${pipelineCount} active ingest pipelines are healthy.`;

  const silentCount = findings.filter((f) => f.type === 'silence').length;
  const dropCritical = findings.filter((f) => f.type === 'volume_drop_critical').length;
  const dropWarning = findings.filter((f) => f.type === 'volume_drop_warning').length;
  const failureCount = findings.filter((f) => f.type === 'pipeline_failure').length;

  const parts: string[] = [];
  if (silentCount) parts.push(`${silentCount} silent`);
  if (dropCritical) parts.push(`${dropCritical} critical volume drop`);
  if (dropWarning) parts.push(`${dropWarning} volume drop warning`);
  if (failureCount) parts.push(`${failureCount} pipeline failure`);

  return `${parts.join(', ')} across ${pipelineCount} active pipelines.`;
};
