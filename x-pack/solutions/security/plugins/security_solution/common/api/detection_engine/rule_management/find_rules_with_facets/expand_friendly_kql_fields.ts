/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps user-facing friendly field names to the full saved-object attribute
 * paths expected by the KQL filter layer. Callers can use either form;
 * `expandFriendlyKqlFields` rewrites the short names before the filter
 * reaches the saved-objects client.
 */
export const KQL_FRIENDLY_FIELD_MAP: Readonly<Record<string, string>> = {
  name: 'alert.attributes.name',
  enabled: 'alert.attributes.enabled',
  tags: 'alert.attributes.tags',
  type: 'alert.attributes.params.type',
  ruleType: 'alert.attributes.alertTypeId',
  immutable: 'alert.attributes.params.immutable',
  isCustomized: 'alert.attributes.params.ruleSource.isCustomized',
  createdBy: 'alert.attributes.createdBy',
  updatedBy: 'alert.attributes.updatedBy',
  createdAt: 'alert.attributes.createdAt',
  updatedAt: 'alert.attributes.updatedAt',
  lastRunOutcome: 'alert.attributes.lastRun.outcome',
  lastRunStatus: 'alert.attributes.lastRun.status',
  index: 'alert.attributes.params.index',
  tacticId: 'alert.attributes.params.threat.tactic.id',
  tacticName: 'alert.attributes.params.threat.tactic.name',
  techniqueId: 'alert.attributes.params.threat.technique.id',
  techniqueName: 'alert.attributes.params.threat.technique.name',
  subtechniqueId: 'alert.attributes.params.threat.technique.subtechnique.id',
  subtechniqueName: 'alert.attributes.params.threat.technique.subtechnique.name',
};

// Sort entries longest-first so that e.g. "subtechniqueName" is matched before
// "techniqueName" and "ruleType" before "type".
const sortedEntries = Object.entries(KQL_FRIENDLY_FIELD_MAP).sort(
  ([a], [b]) => b.length - a.length
);

// Build a single regex that matches any friendly name at a KQL field position:
// start of string, after `(`, or after whitespace.  The name must be followed
// by optional whitespace then `:` (the KQL field-value separator), and must NOT
// be preceded by a `.` (which would indicate it is a sub-path of an already
// expanded field like `alert.attributes.name`).
const friendlyNamesPattern = sortedEntries.map(([name]) => name).join('|');
const FIELD_POSITION_RE = new RegExp(`(^|[\\s(])(?<!\\.)(${friendlyNamesPattern})(\\s*:)`, 'g');

/**
 * Expands friendly field names in a KQL filter string to their full
 * `alert.attributes.*` paths.  Fields that are already fully qualified
 * are left untouched.
 */
export const expandFriendlyKqlFields = (filter: string): string => {
  return filter.replace(FIELD_POSITION_RE, (_match, prefix, fieldName, colon) => {
    const expanded = KQL_FRIENDLY_FIELD_MAP[fieldName];
    return expanded ? `${prefix}${expanded}${colon}` : _match;
  });
};
