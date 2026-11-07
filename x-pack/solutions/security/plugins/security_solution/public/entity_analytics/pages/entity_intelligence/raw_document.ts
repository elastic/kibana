/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AlertSeverity } from './hooks/use_entity_relationships';

/**
 * Pure extraction of the human-relevant fields from a raw ES `_source` — either
 * a detection alert (`.alerts-security.alerts-*`, flattened `kibana.alert.*`
 * dotted keys) or an ECS event (`logs-*`, nested objects). The React view maps
 * the returned {@link RawDocumentModel} to titled sections; keeping the field
 * plucking here makes it deterministic and unit-testable, and resilient to
 * missing fields (every field is optional and simply omitted when absent).
 */

export type RawDocumentKind = 'alert' | 'event';

/**
 * Whether a field is a headline attribute (surfaced first) or verbose detail
 * (grouped behind a "Details" disclosure so the primary view stays scannable).
 */
export type RawFieldGroup = 'primary' | 'detail';

export interface RawField {
  /** Stable ECS-ish key, also used to look up the human label. */
  key: string;
  /** Human-friendly label (never the raw ECS key). */
  label: string;
  value: string;
  group: RawFieldGroup;
}

/**
 * Human-friendly labels for the ECS / `kibana.alert.*` fields we surface, so an
 * analyst never sees a raw dotted key. Keyed by the same `key` used on
 * {@link RawField}. Exported for reuse (and to keep labels testable).
 */
export const HUMAN_FIELD_LABELS: Readonly<Record<string, string>> = {
  'event.kind': 'Event kind',
  'event.category': 'Category',
  'event.action': 'Action',
  'event.outcome': 'Outcome',
  'event.dataset': 'Data source',
  'network.direction': 'Network direction',
  'host.name': 'Host',
  'host.ip': 'Host IP',
  'host.os.name': 'Operating system',
  'host.type': 'Host type',
  'user.name': 'User',
  'user.domain': 'User domain',
  'source.ip': 'Source',
  'destination.ip': 'Destination',
  'destination.domain': 'Destination domain',
  'process.name': 'Process',
  'process.pid': 'Process ID',
  'process.executable': 'Executable path',
  'process.command_line': 'Command line',
  'process.parent.name': 'Parent process',
  'file.name': 'File name',
  'file.path': 'File path',
  'file.hash.sha256': 'SHA-256 hash',
};

export interface RawThreatTechnique {
  id: string | undefined;
  name: string | undefined;
}

export interface RawThreat {
  tacticId: string | undefined;
  tacticName: string | undefined;
  techniques: RawThreatTechnique[];
}

export interface RawDocumentModel {
  kind: RawDocumentKind;
  /** ISO timestamp (`@timestamp`) if present. */
  timestamp: string | undefined;
  severity: AlertSeverity | undefined;
  riskScore: number | undefined;
  ruleName: string | undefined;
  reason: string | undefined;
  event: RawField[];
  host: RawField[];
  user: RawField[];
  source: RawField[];
  destination: RawField[];
  process: RawField[];
  file: RawField[];
  threats: RawThreat[];
}

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAlertSeverity = (value: unknown): value is AlertSeverity =>
  value === 'low' || value === 'medium' || value === 'high' || value === 'critical';

/**
 * Reads a value from a `_source` that may store the path either nested
 * (`{ host: { name } }`) or as a flattened dotted key (`'host.name'`) — alert
 * docs mix both. Tries the dotted key first, then walks the nested path.
 */
export const readPath = (source: Json, path: string): unknown => {
  if (path in source) return source[path];
  const segments = path.split('.');
  let current: unknown = source;
  for (const segment of segments) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
};

const toDisplay = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    const parts = value.map(toDisplay).filter((part): part is string => part !== undefined);
    return parts.length > 0 ? parts.join(', ') : undefined;
  }
  if (typeof value === 'object') return undefined;
  const asString = String(value);
  return asString.trim() === '' ? undefined : asString;
};

const humanLabel = (key: string): string => HUMAN_FIELD_LABELS[key] ?? key;

const field = (
  source: Json,
  path: string,
  key: string,
  group: RawFieldGroup
): RawField | undefined => {
  const value = toDisplay(readPath(source, path));
  return value === undefined ? undefined : { key, label: humanLabel(key), value, group };
};

const collect = (
  source: Json,
  specs: ReadonlyArray<{ path: string; key: string; group: RawFieldGroup }>
): RawField[] =>
  specs
    .map((spec) => field(source, spec.path, spec.key, spec.group))
    .filter((entry): entry is RawField => entry !== undefined);

/** Combines an ip + port into `ip:port`, tolerating a missing port. */
const ipPort = (source: Json, ipPath: string, portPath: string): string | undefined => {
  const ip = toDisplay(readPath(source, ipPath));
  if (ip === undefined) return undefined;
  const port = toDisplay(readPath(source, portPath));
  return port === undefined ? ip : `${ip}:${port}`;
};

const extractThreats = (source: Json): RawThreat[] => {
  const raw = readPath(source, 'kibana.alert.rule.threat');
  const list = Array.isArray(raw) ? raw : [];
  const threats: RawThreat[] = [];
  for (const entry of list) {
    if (isRecord(entry)) {
      const tactic = isRecord(entry.tactic) ? entry.tactic : undefined;
      const techniquesRaw = Array.isArray(entry.technique) ? entry.technique : [];
      const techniques: RawThreatTechnique[] = techniquesRaw.filter(isRecord).map((technique) => ({
        id: toDisplay(technique.id),
        name: toDisplay(technique.name),
      }));
      threats.push({
        tacticId: tactic ? toDisplay(tactic.id) : undefined,
        tacticName: tactic ? toDisplay(tactic.name) : undefined,
        techniques,
      });
    }
  }
  return threats;
};

/**
 * Detects whether a `_source` is a detection alert (has any `kibana.alert.*`
 * marker) versus a raw ECS event.
 */
export const detectRawDocumentKind = (source: Json): RawDocumentKind => {
  const eventKind = toDisplay(readPath(source, 'event.kind'));
  if (eventKind === 'signal') return 'alert';
  const hasAlertMarker =
    readPath(source, 'kibana.alert.rule.name') !== undefined ||
    readPath(source, 'kibana.alert.uuid') !== undefined ||
    readPath(source, 'kibana.alert.severity') !== undefined;
  return hasAlertMarker ? 'alert' : 'event';
};

/** Builds the structured, view-ready model from a raw `_source`. */
export const extractRawDocument = (rawSource: unknown): RawDocumentModel | undefined => {
  if (!isRecord(rawSource)) return undefined;
  const source = rawSource;
  const kind = detectRawDocumentKind(source);

  const severityRaw =
    readPath(source, 'kibana.alert.severity') ?? readPath(source, 'kibana.alert.rule.severity');
  const severity = isAlertSeverity(severityRaw) ? severityRaw : undefined;
  const riskScoreRaw =
    readPath(source, 'kibana.alert.risk_score') ?? readPath(source, 'kibana.alert.rule.risk_score');
  const riskScore = typeof riskScoreRaw === 'number' ? riskScoreRaw : undefined;

  const eventFields = collect(source, [
    { path: 'event.category', key: 'event.category', group: 'primary' },
    { path: 'event.action', key: 'event.action', group: 'primary' },
    { path: 'event.outcome', key: 'event.outcome', group: 'primary' },
    { path: 'network.direction', key: 'network.direction', group: 'primary' },
    { path: 'event.kind', key: 'event.kind', group: 'detail' },
    { path: 'event.dataset', key: 'event.dataset', group: 'detail' },
  ]);

  const hostFields = collect(source, [
    { path: 'host.name', key: 'host.name', group: 'primary' },
    { path: 'host.ip', key: 'host.ip', group: 'primary' },
    { path: 'host.os.name', key: 'host.os.name', group: 'detail' },
    { path: 'host.type', key: 'host.type', group: 'detail' },
  ]);

  const userFields = collect(source, [
    { path: 'user.name', key: 'user.name', group: 'primary' },
    { path: 'user.domain', key: 'user.domain', group: 'detail' },
  ]);

  const sourceEndpoint: RawField[] = [];
  const sourceIp = ipPort(source, 'source.ip', 'source.port');
  if (sourceIp) {
    sourceEndpoint.push({
      key: 'source.ip',
      label: humanLabel('source.ip'),
      value: sourceIp,
      group: 'primary',
    });
  }

  const destinationEndpoint: RawField[] = [];
  const destIp = ipPort(source, 'destination.ip', 'destination.port');
  if (destIp) {
    destinationEndpoint.push({
      key: 'destination.ip',
      label: humanLabel('destination.ip'),
      value: destIp,
      group: 'primary',
    });
  }
  const destDomain = field(source, 'destination.domain', 'destination.domain', 'primary');
  if (destDomain) destinationEndpoint.push(destDomain);

  const processFields = collect(source, [
    { path: 'process.name', key: 'process.name', group: 'primary' },
    { path: 'process.command_line', key: 'process.command_line', group: 'primary' },
    { path: 'process.parent.name', key: 'process.parent.name', group: 'primary' },
    { path: 'process.executable', key: 'process.executable', group: 'detail' },
    { path: 'process.pid', key: 'process.pid', group: 'detail' },
  ]);

  const fileFields = collect(source, [
    { path: 'file.name', key: 'file.name', group: 'primary' },
    { path: 'file.path', key: 'file.path', group: 'primary' },
    { path: 'file.hash.sha256', key: 'file.hash.sha256', group: 'detail' },
  ]);

  return {
    kind,
    timestamp: toDisplay(readPath(source, '@timestamp')),
    severity,
    riskScore,
    ruleName: toDisplay(readPath(source, 'kibana.alert.rule.name')),
    reason: toDisplay(readPath(source, 'kibana.alert.reason')),
    event: eventFields,
    host: hostFields,
    user: userFields,
    source: sourceEndpoint,
    destination: destinationEndpoint,
    process: processFields,
    file: fileFields,
    threats: extractThreats(source),
  };
};

const fieldValue = (fields: readonly RawField[], key: string): string | undefined =>
  fields.find((entry) => entry.key === key)?.value;

/**
 * Builds a plain-language, one-line description of what an alert/event IS, from
 * the already-extracted model — so a non-expert grasps it without reading ECS
 * fields. Pure and i18n'd; resilient to whichever fields are present.
 *
 * Examples:
 *  - Alert: "Alert: Untrusted Container Image Deployed — critical severity, MITRE Initial Access (T1195.002)."
 *  - Event: "powershell.exe was launched on LAPTOP-FIN03 by alex.chen and connected to 185.220.101.5:443."
 */
export const buildPlainSummary = (model: RawDocumentModel): string => {
  const host = fieldValue(model.host, 'host.name');
  const user = fieldValue(model.user, 'user.name');

  if (model.kind === 'alert') {
    const threat = model.threats[0];
    const technique = threat?.techniques[0];
    const mitre =
      threat?.tacticName !== undefined
        ? technique?.id !== undefined
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryMitreWithTechnique',
              {
                defaultMessage: ', MITRE {tactic} ({technique})',
                values: { tactic: threat.tacticName, technique: technique.id },
              }
            )
          : i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryMitreTactic',
              { defaultMessage: ', MITRE {tactic}', values: { tactic: threat.tacticName } }
            )
        : '';
    const severity =
      model.severity !== undefined
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummarySeverity',
            { defaultMessage: '{severity} severity', values: { severity: model.severity } }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryDetection',
            { defaultMessage: 'detection alert' }
          );
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryAlert',
      {
        defaultMessage: 'Alert: {rule} — {severity}{mitre}.',
        values: {
          rule:
            model.ruleName ??
            i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryUnknownRule',
              { defaultMessage: 'Unnamed detection' }
            ),
          severity,
          mitre,
        },
      }
    );
  }

  // Event: pick the most salient subject (process → file → generic activity).
  const process = fieldValue(model.process, 'process.name');
  const file = fieldValue(model.file, 'file.path') ?? fieldValue(model.file, 'file.name');
  const destination =
    fieldValue(model.destination, 'destination.ip') ??
    fieldValue(model.destination, 'destination.domain');
  const category = fieldValue(model.event, 'event.category');

  const subject =
    process ??
    file ??
    category ??
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryActivity',
      {
        defaultMessage: 'Activity',
      }
    );

  const onHost = host
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryOnHost',
        {
          defaultMessage: ' on {host}',
          values: { host },
        }
      )
    : '';
  const byUser = user
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryByUser',
        {
          defaultMessage: ' by {user}',
          values: { user },
        }
      )
    : '';
  const toDest = destination
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryToDestination',
        { defaultMessage: ' and connected to {destination}', values: { destination } }
      )
    : '';

  // Plain-language verb by category, so we don't surface raw action codes
  // like "ProcessRollup2" or "NetworkConnectIP4" to the analyst.
  const verb =
    category === 'process'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryVerbProcess',
          { defaultMessage: 'was launched' }
        )
      : category === 'network'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryVerbNetwork',
          { defaultMessage: 'made a network connection' }
        )
      : category === 'authentication'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryVerbAuth',
          { defaultMessage: 'authenticated' }
        )
      : category === 'file'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryVerbFile',
          { defaultMessage: 'was accessed' }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryObserved',
          { defaultMessage: 'was observed' }
        );

  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSummaryEvent',
    {
      defaultMessage: '{subject} {verb}{onHost}{byUser}{toDest}.',
      values: { subject, verb, onHost, byUser, toDest },
    }
  );
};
