/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
import { isEsqlResultsResult, isQueryResult } from '@kbn/agent-builder-common/tools';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { EntityType } from '../../../../common/entity_analytics/types';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { IntelligenceEntity, RiskLevel } from './common';
import { getRiskLevelFromScore } from './common';
import type { DirectiveHuntArtifact } from './hunt_directive_artifacts';

export interface EntityHuntArtifact {
  id: string;
  type: 'entity';
  entity: IntelligenceEntity;
  alertCount?: number;
  canInvestigate: boolean;
}

export interface AlertHuntArtifact {
  id: string;
  type: 'alert';
  title: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: string;
  entities: string[];
}

export interface RelationshipHuntArtifact {
  id: string;
  type: 'relationship';
  source: string;
  relation: string;
  target: string;
  evidenceCount?: number;
}

export interface EvidenceHuntArtifact {
  id: string;
  type: 'evidence';
  toolId: string;
  query?: string;
  rowCount?: number;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  timeRange?: { from: string; to: string };
  details?: Record<string, unknown>;
}

export interface RecommendedActionHuntArtifact {
  id: string;
  type: 'recommended_action';
  title: string;
  description?: string;
}

export interface VerdictHuntArtifact {
  id: string;
  type: 'verdict';
  summary: string;
  title?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  takeaways: string[];
}

export interface ToolResultHuntArtifact {
  id: string;
  type: 'tool_result';
  toolId: string;
  resultType: string;
  details: unknown;
}

export type HuntArtifact =
  | EntityHuntArtifact
  | AlertHuntArtifact
  | RelationshipHuntArtifact
  | EvidenceHuntArtifact
  | RecommendedActionHuntArtifact
  | VerdictHuntArtifact
  | ToolResultHuntArtifact
  | DirectiveHuntArtifact;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const firstString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    const candidate = Array.isArray(value) ? value[0] : value;
    const parsed = stringValue(candidate);
    if (parsed) return parsed;
  }
};

const firstNumber = (record: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const parsed = numberValue(record[key]);
    if (parsed !== undefined) return parsed;
  }
};

const toEntityType = (value: unknown): EntityType | undefined => {
  if (value === EntityType.user || value === EntityType.host || value === EntityType.service) {
    return value;
  }
  if (value === EntityType.generic) return EntityType.generic;
};

const toRiskLevel = (value: unknown, score: number | undefined): RiskLevel => {
  if (
    value === 'Unknown' ||
    value === 'Low' ||
    value === 'Moderate' ||
    value === 'High' ||
    value === 'Critical'
  ) {
    return value;
  }
  return getRiskLevelFromScore(score);
};

const toEntityArtifact = (
  data: unknown,
  id: string,
  riskData?: unknown
): EntityHuntArtifact | undefined => {
  if (!isRecord(data)) return;
  const identifierType = toEntityType(data.identifierType);
  const identifier = stringValue(data.identifier);
  if (!identifierType || !identifier) return;

  const risk = isRecord(riskData) ? riskData : undefined;
  const riskScoreNorm = risk ? numberValue(risk.calculated_score_norm) : undefined;
  const entityStoreId = stringValue(data.entityStoreId);
  return {
    id,
    type: 'entity',
    entity: {
      id: entityStoreId ?? identifier,
      name: identifier,
      type: identifierType,
      identifierValue: identifier,
      riskScoreNorm,
      riskLevel: toRiskLevel(risk?.calculated_level, riskScoreNorm),
      criticality: stringValue(risk?.criticality_level),
      source: undefined,
      lastSeen: stringValue(risk?.['@timestamp']),
    },
    canInvestigate: entityStoreId !== undefined,
  };
};

const entityArtifactsFromAttachment = (attachment: VersionedAttachment): EntityHuntArtifact[] => {
  if (attachment.type !== SecurityAgentBuilderAttachments.entity || attachment.hidden) return [];
  const latest = getLatestVersion(attachment);
  if (!latest || !isRecord(latest.data)) return [];
  const data = latest.data;
  if (Array.isArray(data.entities)) {
    return data.entities.flatMap((entityData, index) => {
      const artifact = toEntityArtifact(entityData, `${attachment.id}:${index}`);
      return artifact ? [artifact] : [];
    });
  }
  const artifact = toEntityArtifact(data, attachment.id, data.riskStats);
  return artifact ? [artifact] : [];
};

const alertArtifactFromAttachment = (
  attachment: VersionedAttachment
): AlertHuntArtifact | undefined => {
  if (attachment.type !== SecurityAgentBuilderAttachments.alert || attachment.hidden) return;
  const latest = getLatestVersion(attachment);
  if (!latest || !isRecord(latest.data)) return;
  const title = firstString(latest.data, [
    'kibana.alert.rule.name',
    'ruleName',
    'title',
    'attachmentLabel',
  ]);
  if (!title) return;
  const severity = firstString(latest.data, ['kibana.alert.severity', 'severity']);
  const entities = [
    firstString(latest.data, ['user.name', 'userName']),
    firstString(latest.data, ['host.name', 'hostName']),
  ].filter((value): value is string => value !== undefined);
  return {
    id: attachment.id,
    type: 'alert',
    title,
    severity:
      severity === 'low' || severity === 'medium' || severity === 'high' || severity === 'critical'
        ? severity
        : undefined,
    timestamp: firstString(latest.data, ['@timestamp', 'timestamp']),
    entities,
  };
};

export const artifactsFromAttachments = (attachments: VersionedAttachment[]): HuntArtifact[] =>
  attachments.flatMap<HuntArtifact>((attachment) => {
    const entities = entityArtifactsFromAttachment(attachment);
    if (entities.length > 0) return entities;
    const alert = alertArtifactFromAttachment(attachment);
    return alert ? [alert] : [];
  });

export const artifactsFromStructuredOutput = (
  messageId: string,
  output: object
): HuntArtifact[] => {
  const record = output as Record<string, unknown>;
  const actions = record.recommended_actions ?? record.recommendedActions;
  const verdictCandidate = record.verdict;
  const verdictRecord = isRecord(verdictCandidate) ? verdictCandidate : undefined;
  const verdictSummary =
    stringValue(verdictCandidate) ??
    stringValue(verdictRecord?.summary) ??
    stringValue(record.summary);
  const rawSeverity = stringValue(verdictRecord?.severity)?.toLowerCase();
  const verdict: VerdictHuntArtifact[] = verdictSummary
    ? [
        {
          id: `${messageId}:verdict`,
          type: 'verdict',
          summary: verdictSummary,
          title: stringValue(verdictRecord?.title),
          severity:
            rawSeverity === 'low' ||
            rawSeverity === 'medium' ||
            rawSeverity === 'high' ||
            rawSeverity === 'critical'
              ? rawSeverity
              : undefined,
          confidence: numberValue(verdictRecord?.confidence),
          takeaways: Array.isArray(verdictRecord?.takeaways)
            ? verdictRecord.takeaways.filter(
                (takeaway): takeaway is string =>
                  typeof takeaway === 'string' && takeaway.length > 0
              )
            : [],
        },
      ]
    : [];
  if (!Array.isArray(actions)) return verdict;
  return [
    ...verdict,
    ...actions.flatMap((action, index) => {
      if (typeof action === 'string' && action.length > 0) {
        return [
          {
            id: `${messageId}:recommended-action:${index}`,
            type: 'recommended_action' as const,
            title: action,
          },
        ];
      }
      if (!isRecord(action)) return [];
      const title = firstString(action, ['title', 'action', 'name']);
      if (!title) return [];
      return [
        {
          id: `${messageId}:recommended-action:${index}`,
          type: 'recommended_action' as const,
          title,
          description: firstString(action, ['description', 'reason', 'details']),
        },
      ];
    }),
  ];
};

const rowFromEsqlResult = (
  columns: Array<{ name: string }>,
  values: unknown[]
): Record<string, unknown> =>
  Object.fromEntries(columns.map((column, index) => [column.name, values[index]]));

const artifactsFromRow = (
  row: Record<string, unknown>,
  toolId: string,
  resultId: string
): HuntArtifact[] => {
  const artifacts: HuntArtifact[] = [];
  const entityId = firstString(row, ['entity.id']);
  const entityType = toEntityType(firstString(row, ['entity.EngineMetadata.Type', 'entity.type']));
  const entityName = firstString(row, ['entity.name', 'user.name', 'host.name', 'service.name']);
  if (entityId && entityType && entityName) {
    const riskScoreNorm = firstNumber(row, [
      'entity.risk.calculated_score_norm',
      'calculated_score_norm',
    ]);
    artifacts.push({
      id: `${resultId}:entity:${entityId}`,
      type: 'entity',
      entity: {
        id: entityId,
        name: entityName,
        type: entityType,
        identifierValue: entityName,
        riskScoreNorm,
        riskLevel: toRiskLevel(
          firstString(row, ['entity.risk.calculated_level', 'calculated_level']),
          riskScoreNorm
        ),
        criticality: firstString(row, ['asset.criticality', 'criticality']),
        source: firstString(row, ['entity.source']),
        lastSeen: firstString(row, ['@timestamp']),
      },
      alertCount: firstNumber(row, ['alert_count', 'alerts', 'count']),
      canInvestigate: true,
    });
  }

  const alertTitle = firstString(row, ['kibana.alert.rule.name', 'rule.name']);
  if (alertTitle) {
    const severity = firstString(row, ['kibana.alert.severity']);
    artifacts.push({
      id: `${resultId}:alert:${firstString(row, ['_id', 'kibana.alert.uuid']) ?? alertTitle}`,
      type: 'alert',
      title: alertTitle,
      severity:
        severity === 'low' ||
        severity === 'medium' ||
        severity === 'high' ||
        severity === 'critical'
          ? severity
          : undefined,
      timestamp: firstString(row, ['@timestamp']),
      entities: [
        firstString(row, ['user.name']),
        firstString(row, ['host.name']),
        firstString(row, ['service.name']),
      ].filter((value): value is string => value !== undefined),
    });
  }

  const source = firstString(row, ['source', 'source.name', 'source_entity']);
  const target = firstString(row, ['target', 'target.name', 'target_entity']);
  const relation = firstString(row, ['relation', 'relationship', 'relation_type']);
  if (source && target && relation) {
    artifacts.push({
      id: `${resultId}:relationship:${source}:${relation}:${target}`,
      type: 'relationship',
      source,
      relation,
      target,
      evidenceCount: firstNumber(row, ['evidence_count', 'shared_alert_count', 'alert_count']),
    });
  }
  return artifacts;
};

export const artifactsFromToolResults = (toolId: string, results: ToolResult[]): HuntArtifact[] =>
  results.flatMap((result) => {
    if (isEsqlResultsResult(result)) {
      const { columns, values, query } = result.data;
      const rows = values.map((valuesRow) => rowFromEsqlResult(columns, valuesRow));
      const rowArtifacts = rows.flatMap((row) =>
        artifactsFromRow(row, toolId, result.tool_result_id)
      );
      return [
        ...rowArtifacts,
        {
          id: `${toolId}:evidence:${query}`,
          type: 'evidence' as const,
          toolId,
          query,
          rowCount: values.length,
          columns: columns.map(({ name }) => name),
          rows,
          timeRange: result.data.time_range,
        },
      ];
    }
    if (isQueryResult(result)) {
      return [
        {
          id: result.tool_result_id,
          type: 'evidence' as const,
          toolId,
          query: result.data.esql,
          columns: [],
          rows: [],
        },
      ];
    }
    if (result.type === ToolResultType.error || result.type === ToolResultType.fileReference) {
      return [];
    }
    return [
      {
        id: result.tool_result_id,
        type: 'tool_result' as const,
        toolId,
        resultType: result.type,
        details: result.data,
      },
    ];
  });

export const mergeHuntArtifacts = (
  current: HuntArtifact[],
  incoming: HuntArtifact[]
): HuntArtifact[] => {
  const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
  incoming.forEach((artifact) => {
    const existing = byId.get(artifact.id);
    if (
      existing?.type === 'evidence' &&
      artifact.type === 'evidence' &&
      existing.rowCount !== undefined &&
      artifact.rowCount !== undefined
    ) {
      byId.set(artifact.id, {
        ...artifact,
        rowCount: existing.rowCount + artifact.rowCount,
        columns: [...new Set([...existing.columns, ...artifact.columns])],
        rows: [...existing.rows, ...artifact.rows],
      });
      return;
    }
    byId.set(artifact.id, artifact);
  });
  return [...byId.values()];
};
