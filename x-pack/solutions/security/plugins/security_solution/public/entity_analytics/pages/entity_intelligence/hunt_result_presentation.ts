/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IntelligenceEntity } from './common';
import type {
  AlertHuntArtifact,
  EntityHuntArtifact,
  EvidenceHuntArtifact,
  HuntArtifact,
  RelationshipHuntArtifact,
  VerdictHuntArtifact,
} from './hunt_artifacts';

export type HuntSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceValueKind = 'text' | 'date' | 'entity' | 'ip' | 'code';
export type SecondaryView = 'activity_path' | 'timeline' | 'risk' | 'sessions';

export interface Verdict {
  title: string;
  summary: string;
  severity?: HuntSeverity;
  confidence?: number;
}

export interface KeyTakeaway {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface HumanizedEvidenceField {
  label: string;
  value: string;
  kind: EvidenceValueKind;
}

export interface HumanizedEvidenceSection {
  id: string;
  title: string;
  fields: HumanizedEvidenceField[];
}

export interface HumanizedEvidence {
  title: string;
  sections: HumanizedEvidenceSection[];
  raw: Record<string, unknown>;
  rawInitiallyOpen: false;
}

export interface Finding {
  id: string;
  title: string;
  explanation: string;
  whyItMatters?: string;
  severity?: HuntSeverity;
  entities: string[];
  timestamp?: string;
  evidenceCount: number;
  evidence: HumanizedEvidence;
  entity?: IntelligenceEntity;
  canInvestigate?: boolean;
  score: number;
}

export interface ActivityPath {
  id: string;
  source: string;
  action: string;
  destination: string;
  count: number;
  severity?: HuntSeverity;
  firstSeen?: string;
  lastSeen?: string;
  sentence: string;
  evidence: HumanizedEvidence;
}

export interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  severity?: HuntSeverity;
  evidence: HumanizedEvidence;
}

export interface RiskBucket {
  severity: HuntSeverity;
  count: number;
}

export interface SessionEntity {
  id: string;
  name: string;
  type?: string;
  eventCount: number;
  alertCount: number;
  severity?: HuntSeverity;
  lastSeen?: string;
}

export interface HuntPresentation {
  verdict: Verdict;
  takeaways: KeyTakeaway[];
  findings: Finding[];
  activityPaths: ActivityPath[];
  timeline: TimelineItem[];
  riskBuckets: RiskBucket[];
  sessions: SessionEntity[];
  secondaryViews: SecondaryView[];
  queries: Array<{ id: string; query: string; toolId: string }>;
  unknownArtifacts: HuntArtifact[];
  recommendations: string[];
  affectedEntities: IntelligenceEntity[];
}

const severityWeight: Record<HuntSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const isPresent = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false;
  return !Array.isArray(value) || value.length > 0;
};

const isRecordRow = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const scalar = (value: unknown): string | undefined => {
  const candidate = Array.isArray(value) ? value.find(isPresent) : value;
  if (typeof candidate === 'string' && candidate.trim() !== '') return candidate;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
  if (typeof candidate === 'boolean') return String(candidate);
};

const valueFrom = (row: Record<string, unknown>, fields: string[]): string | undefined => {
  for (const field of fields) {
    const value = scalar(row[field]);
    if (value) return value;
  }
};

const numberFrom = (row: Record<string, unknown>, fields: string[]): number | undefined => {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
};

const severityFrom = (row: Record<string, unknown>): HuntSeverity | undefined => {
  const value = valueFrom(row, [
    'kibana.alert.severity',
    'event.severity_label',
    'severity',
    'entity.risk.calculated_level',
    'calculated_level',
  ])?.toLowerCase();
  if (value === 'moderate') return 'medium';
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'
    ? value
    : undefined;
};

const timestampFrom = (row: Record<string, unknown>): string | undefined =>
  valueFrom(row, ['@timestamp', 'event.created', 'kibana.alert.start', 'timestamp']);

const formatTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
};

const field = (
  label: string,
  value: string | undefined,
  kind: EvidenceValueKind = 'text'
): HumanizedEvidenceField | undefined => (value ? { label, value, kind } : undefined);

const section = (
  id: string,
  title: string,
  fields: Array<HumanizedEvidenceField | undefined>
): HumanizedEvidenceSection | undefined => {
  const presentFields = fields.filter(
    (candidate): candidate is HumanizedEvidenceField => candidate !== undefined
  );
  return presentFields.length > 0 ? { id, title, fields: presentFields } : undefined;
};

const evidenceTitle = (row: Record<string, unknown>): string => {
  const process = valueFrom(row, ['process.name', 'process.executable']);
  const destination = valueFrom(row, ['destination.domain', 'destination.ip', 'target_entity']);
  if (process && destination) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.processEvidenceTitle',
      {
        defaultMessage: '{process} activity involving {destination}',
        values: { process, destination },
      }
    );
  }
  return (
    valueFrom(row, ['kibana.alert.rule.name', 'rule.name', 'message', 'event.action']) ??
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.activityEvidenceTitle',
      { defaultMessage: 'Observed security activity' }
    )
  );
};

export const humanizeEvidence = (row: Record<string, unknown>): HumanizedEvidence => {
  const timestamp = timestampFrom(row);
  const sections = [
    section(
      'what',
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.whatHappenedTitle',
        { defaultMessage: 'What happened' }
      ),
      [
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.ruleLabel',
            { defaultMessage: 'Rule' }
          ),
          valueFrom(row, ['kibana.alert.rule.name', 'rule.name'])
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.actionLabel',
            { defaultMessage: 'Action' }
          ),
          valueFrom(row, ['event.action', 'event.type', 'event.category'])
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.messageLabel',
            { defaultMessage: 'Description' }
          ),
          valueFrom(row, ['message', 'event.reason'])
        ),
      ]
    ),
    section(
      'when',
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.whenTitle',
        { defaultMessage: 'When' }
      ),
      [
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.timestampLabel',
            { defaultMessage: 'Time' }
          ),
          timestamp ? formatTimestamp(timestamp) : undefined,
          'date'
        ),
      ]
    ),
    section(
      'entities',
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.entitiesTitle',
        { defaultMessage: 'User and host' }
      ),
      [
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.userLabel',
            { defaultMessage: 'User' }
          ),
          valueFrom(row, ['user.name', 'user.id']),
          'entity'
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.hostLabel',
            { defaultMessage: 'Host' }
          ),
          valueFrom(row, ['host.name', 'host.id']),
          'entity'
        ),
      ]
    ),
    section(
      'process',
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.processTitle',
        { defaultMessage: 'Process' }
      ),
      [
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.processNameLabel',
            { defaultMessage: 'Process' }
          ),
          valueFrom(row, ['process.name', 'process.executable']),
          'code'
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.commandLabel',
            { defaultMessage: 'Command' }
          ),
          valueFrom(row, ['process.command_line']),
          'code'
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.parentProcessLabel',
            { defaultMessage: 'Parent process' }
          ),
          valueFrom(row, ['process.parent.name', 'process.parent.executable']),
          'code'
        ),
      ]
    ),
    section(
      'network',
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.networkTitle',
        { defaultMessage: 'Network' }
      ),
      [
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.sourceIpLabel',
            { defaultMessage: 'Source' }
          ),
          valueFrom(row, ['source.ip', 'client.ip', 'source_entity']),
          'ip'
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.destinationIpLabel',
            { defaultMessage: 'Destination' }
          ),
          valueFrom(row, ['destination.domain', 'destination.ip', 'server.ip', 'target_entity']),
          'ip'
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.destinationPortLabel',
            { defaultMessage: 'Port' }
          ),
          valueFrom(row, ['destination.port', 'server.port'])
        ),
      ]
    ),
    section(
      'assessment',
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.assessmentTitle',
        { defaultMessage: 'Assessment' }
      ),
      [
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.severityLabel',
            { defaultMessage: 'Severity' }
          ),
          severityFrom(row)
        ),
        field(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.statusLabel',
            { defaultMessage: 'Status' }
          ),
          valueFrom(row, ['kibana.alert.workflow_status', 'event.outcome', 'status'])
        ),
      ]
    ),
  ].filter((candidate): candidate is HumanizedEvidenceSection => candidate !== undefined);

  return { title: evidenceTitle(row), sections, raw: row, rawInitiallyOpen: false };
};

const conciseTitleFromPrompt = (prompt: string): string => {
  const lower = prompt.toLowerCase();
  const knownTitles: Array<[RegExp, string]> = [
    [
      /dormant account/,
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.dormantAccountsTitle',
        { defaultMessage: 'Dormant account reactivation' }
      ),
    ],
    [
      /lateral movement/,
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.lateralMovementTitle',
        { defaultMessage: 'Lateral movement investigation' }
      ),
    ],
    [
      /impossible travel/,
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.impossibleTravelTitle',
        { defaultMessage: 'Impossible travel investigation' }
      ),
    ],
    [
      /privilege escalation/,
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.privilegeEscalationTitle',
        { defaultMessage: 'Privilege escalation investigation' }
      ),
    ],
    [
      /data staging/,
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.dataStagingTitle',
        { defaultMessage: 'Data staging investigation' }
      ),
    ],
    [
      /service account/,
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.serviceAccountsTitle',
        { defaultMessage: 'Service account anomalies' }
      ),
    ],
  ];
  const matched = knownTitles.find(([pattern]) => pattern.test(lower));
  if (matched) return matched[1];
  const cleaned = prompt
    .replace(/^(identify|find|hunt for|look for|show me|investigate)\s+/i, '')
    .split(/[.:\n]/)[0]
    .trim();
  if (cleaned.length <= 60) return cleaned;
  return `${cleaned.slice(0, 57).trim()}…`;
};

const conciseTitle = (title: string): string =>
  title.length <= 60 ? title : `${title.slice(0, 57).trim()}…`;

const conciseSummary = (summary: string): string => {
  const sentences = summary.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [summary];
  const firstTwo = sentences.slice(0, 2).join(' ').trim();
  return firstTwo.length <= 360 ? firstTwo : `${firstTwo.slice(0, 357).trim()}…`;
};

const entityValuesFromRow = (row: Record<string, unknown>): string[] =>
  [
    valueFrom(row, ['user.name', 'user.id']),
    valueFrom(row, ['host.name', 'host.id']),
    valueFrom(row, ['source.ip']),
    valueFrom(row, ['destination.ip', 'destination.domain']),
  ].filter((value): value is string => value !== undefined);

const rowFinding = (
  row: Record<string, unknown>,
  index: number,
  prompt: string
): Finding | undefined => {
  const user = valueFrom(row, ['user.name', 'user.id']);
  const host = valueFrom(row, ['host.name', 'host.id']);
  const source = valueFrom(row, ['source.ip', 'source_entity']);
  const destination = valueFrom(row, ['destination.domain', 'destination.ip', 'target_entity']);
  const process = valueFrom(row, ['process.name', 'process.executable']);
  const action = valueFrom(row, ['event.action', 'event.type']);
  const rule = valueFrom(row, ['kibana.alert.rule.name', 'rule.name']);
  const severity = severityFrom(row);
  const timestamp = timestampFrom(row);
  const evidenceCount =
    numberFrom(row, ['event_count', 'alert_count', 'count', 'doc_count', 'total_events']) ?? 1;

  let title: string | undefined;
  let explanation: string | undefined;
  let whyItMatters: string | undefined;

  if (source && process && destination) {
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.directedProcessFindingTitle',
      {
        defaultMessage: '{source} used {process} to reach {destination}',
        values: { source, process, destination },
      }
    );
    explanation = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.directedProcessFindingDescription',
      {
        defaultMessage:
          '{count, plural, one {# supporting event links} other {# supporting events link}} the source, process, and destination.',
        values: { count: evidenceCount },
      }
    );
    whyItMatters = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.remoteProcessWhyDescription',
      { defaultMessage: 'Remote process activity can indicate administrative or lateral movement.' }
    );
  } else if (/dormant account/i.test(prompt) && user) {
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.reactivatedAccountFindingTitle',
      {
        defaultMessage: 'Reactivated account {user} showed new activity',
        values: { user },
      }
    );
    explanation = host
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.reactivatedAccountHostDescription',
          {
            defaultMessage:
              'Activity for this account was observed on {host} with {count, plural, one {# supporting event} other {# supporting events}}.',
            values: { host, count: evidenceCount },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.reactivatedAccountDescription',
          {
            defaultMessage:
              '{count, plural, one {# supporting event was} other {# supporting events were}} returned for this account.',
            values: { count: evidenceCount },
          }
        );
    whyItMatters = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.dormantAccountWhyDescription',
      { defaultMessage: 'Unexpected reuse of an inactive account warrants identity review.' }
    );
  } else if (rule) {
    title = rule;
    explanation = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.alertFindingDescription',
      {
        defaultMessage:
          '{count, plural, one {# alert record supports} other {# alert records support}} this finding.',
        values: { count: evidenceCount },
      }
    );
  } else if (user && action && host) {
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.userActionFindingTitle',
      {
        defaultMessage: '{user} performed {action} on {host}',
        values: { user, action, host },
      }
    );
    explanation = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.userActionFindingDescription',
      {
        defaultMessage:
          '{count, plural, one {# supporting event was} other {# supporting events were}} observed.',
        values: { count: evidenceCount },
      }
    );
  } else if (process && host) {
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.processHostFindingTitle',
      {
        defaultMessage: '{process} activity occurred on {host}',
        values: { process, host },
      }
    );
    explanation = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.processHostFindingDescription',
      {
        defaultMessage:
          '{count, plural, one {# supporting event was} other {# supporting events were}} observed.',
        values: { count: evidenceCount },
      }
    );
  } else {
    const identifier = user ?? host ?? source ?? destination;
    if (!identifier) return;
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.unusualActivityFindingTitle',
      {
        defaultMessage: 'Unusual activity involving {identifier}',
        values: { identifier },
      }
    );
    explanation = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.unusualActivityFindingDescription',
      {
        defaultMessage:
          '{count, plural, one {# structured evidence record was} other {# structured evidence records were}} returned.',
        values: { count: evidenceCount },
      }
    );
  }

  return {
    id: `row:${index}:${title}`,
    title,
    explanation,
    whyItMatters,
    severity,
    entities: entityValuesFromRow(row),
    timestamp,
    evidenceCount,
    evidence: humanizeEvidence(row),
    score: (severity ? severityWeight[severity] * 1000 : 0) + evidenceCount,
  };
};

const findingsFromArtifacts = (
  entities: EntityHuntArtifact[],
  alerts: AlertHuntArtifact[],
  relationships: RelationshipHuntArtifact[]
): Finding[] => [
  ...alerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    explanation: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.attachmentAlertDescription',
      {
        defaultMessage: 'A validated alert involves {entities}.',
        values: {
          entities:
            alert.entities.join(', ') ||
            i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.unknownEntityDetail',
              { defaultMessage: 'an unidentified entity' }
            ),
        },
      }
    ),
    severity: alert.severity,
    entities: alert.entities,
    timestamp: alert.timestamp,
    evidenceCount: 1,
    evidence: humanizeEvidence({
      'kibana.alert.rule.name': alert.title,
      'kibana.alert.severity': alert.severity,
      '@timestamp': alert.timestamp,
    }),
    score: (alert.severity ? severityWeight[alert.severity] * 1000 : 0) + 1,
  })),
  ...entities.map((artifact) => ({
    id: artifact.id,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.riskyEntityFindingTitle',
      {
        defaultMessage: '{entity} requires review',
        values: { entity: artifact.entity.name },
      }
    ),
    explanation: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.riskyEntityFindingDescription',
      {
        defaultMessage: 'The entity has a {riskLevel} risk level.',
        values: { riskLevel: artifact.entity.riskLevel.toLowerCase() },
      }
    ),
    severity:
      artifact.entity.riskLevel === 'Critical'
        ? ('critical' as const)
        : artifact.entity.riskLevel === 'High'
        ? ('high' as const)
        : artifact.entity.riskLevel === 'Moderate'
        ? ('medium' as const)
        : artifact.entity.riskLevel === 'Low'
        ? ('low' as const)
        : undefined,
    entities: [artifact.entity.name],
    timestamp: artifact.entity.lastSeen,
    evidenceCount: artifact.alertCount ?? 1,
    evidence: humanizeEvidence({
      'entity.name': artifact.entity.name,
      'entity.risk.calculated_level': artifact.entity.riskLevel,
      '@timestamp': artifact.entity.lastSeen,
    }),
    entity: artifact.entity,
    canInvestigate: artifact.canInvestigate,
    score: (artifact.entity.riskScoreNorm ?? 0) * 10 + (artifact.alertCount ?? 1),
  })),
  ...relationships.map((relationship) => ({
    id: relationship.id,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.relationshipFindingTitle',
      {
        defaultMessage: '{source} is linked to {target}',
        values: { source: relationship.source, target: relationship.target },
      }
    ),
    explanation: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.relationshipFindingDescription',
      {
        defaultMessage: 'The observed relationship is {relation}.',
        values: { relation: relationship.relation },
      }
    ),
    entities: [relationship.source, relationship.target],
    evidenceCount: relationship.evidenceCount ?? 1,
    evidence: humanizeEvidence({
      source_entity: relationship.source,
      relation: relationship.relation,
      target_entity: relationship.target,
    }),
    score: relationship.evidenceCount ?? 1,
  })),
];

const mergeFindings = (findings: Finding[]): Finding[] => {
  const merged = new Map<string, Finding>();
  findings.forEach((finding) => {
    const key = `${finding.title}|${finding.entities.join('|')}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, finding);
      return;
    }
    merged.set(key, {
      ...existing,
      evidenceCount: existing.evidenceCount + finding.evidenceCount,
      score: existing.score + finding.evidenceCount,
      timestamp: existing.timestamp ?? finding.timestamp,
    });
  });
  return [...merged.values()].sort((left, right) => right.score - left.score);
};

const activityPathsFromRows = (rows: Array<Record<string, unknown>>): ActivityPath[] => {
  const grouped = new Map<
    string,
    {
      source: string;
      action: string;
      destination: string;
      count: number;
      severity?: HuntSeverity;
      timestamps: string[];
      evidence: HumanizedEvidence;
    }
  >();
  rows.forEach((row) => {
    const source = valueFrom(row, [
      'source.ip',
      'source.name',
      'source_entity',
      'user.name',
      'host.name',
    ]);
    const destination = valueFrom(row, [
      'destination.domain',
      'destination.ip',
      'target_entity',
      'related.entity.name',
    ]);
    if (!source || !destination || source === destination) return;
    const action =
      valueFrom(row, [
        'process.name',
        'process.executable',
        'event.action',
        'threat.technique.name',
        'relation',
      ]) ??
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.observedActionLabel',
        { defaultMessage: 'observed activity' }
      );
    const key = `${source}|${action}|${destination}`;
    const existing = grouped.get(key);
    const count =
      numberFrom(row, ['event_count', 'alert_count', 'count', 'doc_count', 'total_events']) ?? 1;
    const timestamp = timestampFrom(row);
    const severity = severityFrom(row);
    if (!existing) {
      grouped.set(key, {
        source,
        action,
        destination,
        count,
        severity,
        timestamps: timestamp ? [timestamp] : [],
        evidence: humanizeEvidence(row),
      });
      return;
    }
    existing.count += count;
    if (timestamp) existing.timestamps.push(timestamp);
    if (
      severity &&
      (!existing.severity || severityWeight[severity] > severityWeight[existing.severity])
    ) {
      existing.severity = severity;
    }
  });
  return [...grouped.entries()]
    .map(([id, path]) => {
      const sortedTimestamps = path.timestamps.sort(
        (left, right) => Date.parse(left) - Date.parse(right)
      );
      return {
        id,
        source: path.source,
        action: path.action,
        destination: path.destination,
        count: path.count,
        severity: path.severity,
        firstSeen: sortedTimestamps[0],
        lastSeen: sortedTimestamps[sortedTimestamps.length - 1],
        sentence: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.activityPathDescription',
          {
            defaultMessage:
              '{source} used {action} to reach {destination} ({count, plural, one {# event} other {# events}}{severitySuffix}).',
            values: {
              source: path.source,
              action: path.action,
              destination: path.destination,
              count: path.count,
              severitySuffix: path.severity ? `, ${path.severity} severity` : '',
            },
          }
        ),
        evidence: path.evidence,
      };
    })
    .sort((left, right) => right.count - left.count);
};

const timelineFromRows = (rows: Array<Record<string, unknown>>): TimelineItem[] =>
  rows
    .flatMap((row, index) => {
      const timestamp = timestampFrom(row);
      if (!timestamp || Number.isNaN(Date.parse(timestamp))) return [];
      return [
        {
          id: `timeline:${index}:${timestamp}`,
          timestamp,
          title: evidenceTitle(row),
          severity: severityFrom(row),
          evidence: humanizeEvidence(row),
        },
      ];
    })
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));

/**
 * Groups the real evidence rows by entity (user/host/service) into "sessions":
 * per-entity event/alert counts, worst observed severity, and last-seen. Purely
 * derived from the collected rows so it is grounded and unit-testable.
 */
const sessionsFromRows = (rows: Array<Record<string, unknown>>): SessionEntity[] => {
  const byEntity = new Map<string, SessionEntity>();
  const entityFieldGroups: Array<{ keys: string[]; type: string }> = [
    { keys: ['user.name', 'user.id'], type: 'user' },
    { keys: ['host.name', 'host.id'], type: 'host' },
    { keys: ['service.name'], type: 'service' },
  ];
  rows.forEach((row) => {
    const severity = severityFrom(row);
    const timestamp = timestampFrom(row);
    const isAlert = valueFrom(row, ['kibana.alert.rule.name', 'rule.name']) !== undefined;
    entityFieldGroups.forEach(({ keys, type }) => {
      const name = valueFrom(row, keys);
      if (!name) return;
      const key = `${type}:${name}`;
      const existing = byEntity.get(key);
      if (!existing) {
        byEntity.set(key, {
          id: key,
          name,
          type,
          eventCount: 1,
          alertCount: isAlert ? 1 : 0,
          severity,
          lastSeen: timestamp,
        });
        return;
      }
      existing.eventCount += 1;
      if (isAlert) existing.alertCount += 1;
      if (
        severity &&
        (!existing.severity || severityWeight[severity] > severityWeight[existing.severity])
      ) {
        existing.severity = severity;
      }
      if (
        timestamp &&
        (!existing.lastSeen || Date.parse(timestamp) > Date.parse(existing.lastSeen))
      ) {
        existing.lastSeen = timestamp;
      }
    });
  });
  return [...byEntity.values()].sort((left, right) => {
    const leftWeight = left.severity ? severityWeight[left.severity] : 0;
    const rightWeight = right.severity ? severityWeight[right.severity] : 0;
    if (leftWeight !== rightWeight) return rightWeight - leftWeight;
    return right.eventCount - left.eventCount;
  });
};

const riskBucketsFromFindings = (findings: Finding[]): RiskBucket[] => {
  const counts = new Map<HuntSeverity, number>();
  findings.forEach(({ severity }) => {
    if (severity) counts.set(severity, (counts.get(severity) ?? 0) + 1);
  });
  return (['critical', 'high', 'medium', 'low'] as const).flatMap((severity) => {
    const count = counts.get(severity);
    return count ? [{ severity, count }] : [];
  });
};

const uniqueRowValues = (rows: Array<Record<string, unknown>>, fields: string[]): Set<string> => {
  const values = new Set<string>();
  rows.forEach((row) => {
    const value = valueFrom(row, fields);
    if (value) values.add(value);
  });
  return values;
};

const buildTakeaways = (
  rows: Array<Record<string, unknown>>,
  findings: Finding[],
  entities: EntityHuntArtifact[],
  alerts: AlertHuntArtifact[]
): KeyTakeaway[] => {
  const users = uniqueRowValues(rows, ['user.name', 'user.id']);
  const hosts = uniqueRowValues(rows, ['host.name', 'host.id']);
  const ips = new Set([
    ...uniqueRowValues(rows, ['source.ip', 'client.ip']),
    ...uniqueRowValues(rows, ['destination.ip', 'server.ip']),
  ]);
  const highPriority = findings.filter(
    ({ severity }) => severity === 'high' || severity === 'critical'
  ).length;
  const candidates: Array<KeyTakeaway | undefined> = [
    highPriority > 0
      ? {
          id: 'priority',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.priorityTakeawayLabel',
            { defaultMessage: 'High priority' }
          ),
          value: String(highPriority),
          icon: 'warning',
        }
      : undefined,
    users.size > 0
      ? {
          id: 'users',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.usersTakeawayLabel',
            { defaultMessage: 'Affected users' }
          ),
          value: String(users.size),
          icon: 'user',
        }
      : undefined,
    hosts.size > 0
      ? {
          id: 'hosts',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.hostsTakeawayLabel',
            { defaultMessage: 'Affected hosts' }
          ),
          value: String(hosts.size),
          icon: 'storage',
        }
      : undefined,
    ips.size > 0
      ? {
          id: 'ips',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.ipsTakeawayLabel',
            { defaultMessage: 'IP addresses' }
          ),
          value: String(ips.size),
          icon: 'globe',
        }
      : undefined,
    alerts.length > 0
      ? {
          id: 'alerts',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.alertsTakeawayLabel',
            { defaultMessage: 'Validated alerts' }
          ),
          value: String(alerts.length),
          icon: 'bell',
        }
      : undefined,
    entities.length > 0 && users.size === 0 && hosts.size === 0
      ? {
          id: 'entities',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.entitiesTakeawayLabel',
            { defaultMessage: 'Affected entities' }
          ),
          value: String(entities.length),
          icon: 'vectorTriangle',
        }
      : undefined,
  ];
  return candidates
    .filter((candidate): candidate is KeyTakeaway => candidate !== undefined)
    .slice(0, 4);
};

const buildVerdict = ({
  prompt,
  structuredVerdict,
  findings,
  rows,
  takeaways,
}: {
  prompt: string;
  structuredVerdict?: VerdictHuntArtifact;
  findings: Finding[];
  rows: Array<Record<string, unknown>>;
  takeaways: KeyTakeaway[];
}): Verdict => {
  const title = conciseTitle(structuredVerdict?.title ?? conciseTitleFromPrompt(prompt));
  if (structuredVerdict) {
    return {
      title,
      summary: conciseSummary(structuredVerdict.summary),
      severity: structuredVerdict.severity,
      confidence: structuredVerdict.confidence,
    };
  }
  const users = takeaways.find(({ id }) => id === 'users')?.value;
  const hosts = takeaways.find(({ id }) => id === 'hosts')?.value;
  const priority = takeaways.find(({ id }) => id === 'priority')?.value;
  if (/dormant account/i.test(prompt) && users) {
    return {
      title,
      summary: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.dormantVerdictDescription',
        {
          defaultMessage:
            '{users, plural, one {# recently active account was} other {# recently active accounts were}} observed{hostSuffix}.{prioritySuffix}',
          values: {
            users: Number(users),
            hostSuffix: hosts ? ` across ${hosts} hosts` : '',
            prioritySuffix: priority ? ` ${priority} have high-priority supporting signals.` : '',
          },
        }
      ),
      severity: findings[0]?.severity,
    };
  }
  if (findings.length > 0) {
    return {
      title,
      summary: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.findingsVerdictDescription',
        {
          defaultMessage:
            '{findingCount, plural, one {# prioritized finding was} other {# prioritized findings were}} identified from validated investigation data. Review the highest-ranked activity first.',
          values: { findingCount: findings.length },
        }
      ),
      severity: findings[0]?.severity,
    };
  }
  return {
    title,
    summary:
      rows.length > 0
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.unconfirmedVerdictDescription',
            {
              defaultMessage:
                'Structured activity was returned, but it was not sufficient to identify a prioritized suspicious finding.',
            }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.presentation.noFindingsVerdictDescription',
            { defaultMessage: 'No structured suspicious finding was confirmed by this hunt.' }
          ),
  };
};

export const buildHuntPresentation = ({
  prompt,
  artifacts,
}: {
  prompt: string;
  artifacts: HuntArtifact[];
}): HuntPresentation => {
  const evidence = artifacts.filter(
    (artifact): artifact is EvidenceHuntArtifact => artifact.type === 'evidence'
  );
  const entities = artifacts.filter(
    (artifact): artifact is EntityHuntArtifact => artifact.type === 'entity'
  );
  const alerts = artifacts.filter(
    (artifact): artifact is AlertHuntArtifact => artifact.type === 'alert'
  );
  const relationships = artifacts.filter(
    (artifact): artifact is RelationshipHuntArtifact => artifact.type === 'relationship'
  );
  const structuredVerdict = artifacts.find(
    (artifact): artifact is VerdictHuntArtifact => artifact.type === 'verdict'
  );
  const rows = evidence
    .flatMap(({ rows: evidenceRows }) => (Array.isArray(evidenceRows) ? evidenceRows : []))
    .filter((row): row is Record<string, unknown> => isRecordRow(row));
  const findings = mergeFindings([
    ...rows.flatMap((row, index) => {
      const finding = rowFinding(row, index, prompt);
      return finding ? [finding] : [];
    }),
    ...findingsFromArtifacts(entities, alerts, relationships),
  ]);
  const activityPaths = activityPathsFromRows(rows);
  const timeline = timelineFromRows(rows);
  const riskBuckets = riskBucketsFromFindings(findings);
  const sessions = sessionsFromRows(rows);
  const takeaways = buildTakeaways(rows, findings, entities, alerts);
  const secondaryViews: SecondaryView[] = [
    ...(activityPaths.length > 0 ? (['activity_path'] as const) : []),
    ...(timeline.length >= 2 ? (['timeline'] as const) : []),
    ...(sessions.length >= 2 ? (['sessions'] as const) : []),
    ...(riskBuckets.length >= 2 ? (['risk'] as const) : []),
  ];
  const recommendations = artifacts.flatMap((artifact) =>
    artifact.type === 'recommended_action' ? [artifact.title] : []
  );
  return {
    verdict: buildVerdict({ prompt, structuredVerdict, findings, rows, takeaways }),
    takeaways,
    findings,
    activityPaths,
    timeline,
    riskBuckets,
    sessions,
    secondaryViews,
    queries: evidence.flatMap(({ id, query, toolId }) => (query ? [{ id, query, toolId }] : [])),
    unknownArtifacts: artifacts.filter((artifact) => artifact.type === 'tool_result'),
    recommendations,
    affectedEntities: entities.map(({ entity }) => entity),
  };
};
