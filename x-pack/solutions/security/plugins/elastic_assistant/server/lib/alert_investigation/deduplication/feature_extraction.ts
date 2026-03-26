/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

export interface AlertFeatures {
  readonly ruleName: string;
  readonly ruleDescription?: string;
  readonly severity?: string;
  readonly riskScore?: number;
  readonly mitreTactics: string[];
  readonly mitreTechniques: string[];
  readonly processName?: string;
  readonly processExecutable?: string;
  readonly processCommandLine?: string;
  readonly parentProcessName?: string;
  readonly hostName?: string;
  readonly userName?: string;
  readonly sourceIp?: string;
  readonly destinationIp?: string;
  readonly fileName?: string;
  readonly filePath?: string;
  readonly fileHash?: string;
  readonly eventCategory?: string;
  readonly eventAction?: string;
  readonly networkProtocol?: string;
  readonly dnsQuestionName?: string;
}

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  // Check flat dotted key first (ES returns alerts with flat keys like "host.name")
  if (path in obj) return obj[path];
  // Fall back to nested traversal (for properly nested objects)
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const normalizeString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).map(String).join(', ');
    return joined || undefined;
  }
  const str = String(value).trim();
  return str || undefined;
};

const extractMitreValues = (
  alert: Record<string, unknown>,
  basePath: string,
  field: string
): string[] => {
  const values: string[] = [];
  const topLevel = getNestedValue(alert, `${basePath}.${field}`);
  if (topLevel != null) {
    if (Array.isArray(topLevel)) {
      values.push(...topLevel.filter(Boolean).map(String));
    } else {
      values.push(String(topLevel));
    }
  }

  const nested = getNestedValue(alert, basePath);
  if (Array.isArray(nested)) {
    for (const item of nested) {
      if (item != null && typeof item === 'object') {
        const fieldParts = field.split('.');
        const lastPart = fieldParts[fieldParts.length - 1];
        const val = (item as Record<string, unknown>)[lastPart];
        if (val != null) {
          if (Array.isArray(val)) {
            values.push(...val.filter(Boolean).map(String));
          } else {
            values.push(String(val));
          }
        }
      }
    }
  }

  return [...new Set(values)];
};

export const extractAlertFeatures = (alert: Record<string, unknown>): AlertFeatures => {
  const tacticNames = [
    ...extractMitreValues(alert, 'kibana.alert.rule.threat', 'tactic.name'),
    ...extractMitreValues(alert, 'threat', 'tactic.name'),
  ];
  const techniqueNames = [
    ...extractMitreValues(alert, 'kibana.alert.rule.threat', 'technique.name'),
    ...extractMitreValues(alert, 'threat', 'technique.name'),
  ];

  return {
    ruleName: normalizeString(getNestedValue(alert, 'kibana.alert.rule.name')) ?? 'Unknown Rule',
    ruleDescription: normalizeString(getNestedValue(alert, 'kibana.alert.rule.description')),
    severity: normalizeString(getNestedValue(alert, 'kibana.alert.severity')),
    riskScore: getNestedValue(alert, 'kibana.alert.risk_score') as number | undefined,
    mitreTactics: [...new Set(tacticNames)],
    mitreTechniques: [...new Set(techniqueNames)],
    processName: normalizeString(getNestedValue(alert, 'process.name')),
    processExecutable: normalizeString(getNestedValue(alert, 'process.executable')),
    processCommandLine: normalizeString(getNestedValue(alert, 'process.command_line')),
    parentProcessName: normalizeString(getNestedValue(alert, 'process.parent.name')),
    hostName: normalizeString(getNestedValue(alert, 'host.name')),
    userName: normalizeString(getNestedValue(alert, 'user.name')),
    sourceIp: normalizeString(getNestedValue(alert, 'source.ip')),
    destinationIp: normalizeString(getNestedValue(alert, 'destination.ip')),
    fileName: normalizeString(getNestedValue(alert, 'file.name')),
    filePath: normalizeString(getNestedValue(alert, 'file.path')),
    fileHash: normalizeString(getNestedValue(alert, 'file.hash.sha256')),
    eventCategory: normalizeString(getNestedValue(alert, 'event.category')),
    eventAction: normalizeString(getNestedValue(alert, 'event.action')),
    networkProtocol: normalizeString(getNestedValue(alert, 'network.protocol')),
    dnsQuestionName: normalizeString(getNestedValue(alert, 'dns.question.name')),
  };
};

const composeKeyValueSection = (
  label: string,
  entries: Array<[string, string | undefined]>
): string | undefined => {
  const filled = entries.filter(([, v]) => v != null) as Array<[string, string]>;
  if (filled.length === 0) return undefined;
  return `${label}: ${filled.map(([k, v]) => `${k}=${v}`).join(', ')}.`;
};

const appendIfPresent = (parts: string[], label: string, value: string | undefined): void => {
  if (value) {
    parts.push(`${label}: ${value}.`);
  }
};

export const composeFeatureText = (features: AlertFeatures): string => {
  const parts: string[] = [`Rule: ${features.ruleName}.`];

  appendIfPresent(parts, 'Description', features.ruleDescription);
  appendIfPresent(parts, 'Severity', features.severity);

  if (features.mitreTactics.length > 0) {
    parts.push(`MITRE Tactics: ${features.mitreTactics.join(', ')}.`);
  }
  if (features.mitreTechniques.length > 0) {
    parts.push(`MITRE Techniques: ${features.mitreTechniques.join(', ')}.`);
  }

  const processSection = composeKeyValueSection('Process', [
    ['name', features.processName],
    ['exe', features.processExecutable],
    ['cmd', features.processCommandLine],
  ]);
  if (processSection) parts.push(processSection);

  appendIfPresent(parts, 'Parent Process', features.parentProcessName);
  appendIfPresent(parts, 'Host', features.hostName);
  appendIfPresent(parts, 'User', features.userName);

  const networkSection = composeKeyValueSection('Network', [
    ['src', features.sourceIp],
    ['dst', features.destinationIp],
    ['proto', features.networkProtocol],
  ]);
  if (networkSection) parts.push(networkSection);

  const fileSection = composeKeyValueSection('File', [
    ['name', features.fileName],
    ['path', features.filePath],
    ['sha256', features.fileHash],
  ]);
  if (fileSection) parts.push(fileSection);

  appendIfPresent(parts, 'DNS', features.dnsQuestionName);

  const eventSection = composeKeyValueSection('Event', [
    ['category', features.eventCategory],
    ['action', features.eventAction],
  ]);
  if (eventSection) parts.push(eventSection);

  return parts.join(' ');
};

export const hashFeatureText = (featureText: string): string =>
  createHash('sha256').update(featureText).digest('hex');
