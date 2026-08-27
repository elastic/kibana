/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETONATE_COMPLETED_WORKER,
  DETONATE_TABLE_LIMIT,
  DETONATE_TASKS_INDEX,
} from '../../common/detonate';

/**
 * Only tasks that reached the summary worker carry denormalized alert counts, so every query
 * starts from the same completed-task base. `timestamp` is the tasks index time field; the global
 * ES|QL filter helpers cannot be reused here because they hardcode `@timestamp`.
 */
const COMPLETED_TASKS = `FROM ${DETONATE_TASKS_INDEX}
| WHERE timestamp >= ?_tstart AND timestamp < ?_tend
| WHERE task.last_worker_name.keyword == "${DETONATE_COMPLETED_WORKER}"
| EVAL endpointAlertsCount = COALESCE(task.production_endpoint_alerts_count, 0::long)
| EVAL detectionAlertsCount = COALESCE(task.production_detection_alerts_count, 0::long)`;

const WITH_ALERTS = `| WHERE endpointAlertsCount > 0 OR detectionAlertsCount > 0`;

const RULE_NAMES_FIELD = 'task.production_endpoint_alert_groups.rule_name.keyword';
const EVENT_CODES_FIELD = 'task.production_endpoint_alert_groups.event_code.keyword';

/** Values reach the query as string literals, so quotes and backslashes have to be neutralised. */
const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Searches for the longest run of hex in whatever was pasted.
 *
 * Hashes arrive wrapped in prefixes and separators such as `sha256:<hash>`, and taking the longest
 * run picks the hash out of those without letting the prefix's own hex digits corrupt the pattern.
 * Non-hex characters never reach the query, so `*` and `?` cannot widen the `LIKE`. A search with
 * no hex at all matches nothing, which is clearer than falling back to every detonation.
 */
const toHashPattern = (hash: string): string | null => {
  if (hash.trim().length === 0) {
    return null;
  }

  const runs = hash.toLowerCase().match(/[0-9a-f]+/g) ?? [];
  const longest = runs.reduce((best, run) => (run.length > best.length ? run : best), '');

  return longest.length > 0 ? `TO_LOWER(task.sample_hash.keyword) LIKE "*${longest}*"` : 'false';
};

/**
 * `MV_CONTAINS` rather than `==`: alert-group fields are multivalued, and a plain comparison
 * against a multivalue silently matches only the single-valued documents.
 */
const anyOf = (field: string, values: string[]): string =>
  values.map((value) => `MV_CONTAINS(${field}, "${escapeEsqlString(value)}")`).join(' OR ');

const inList = (field: string, values: string[]): string =>
  `${field} IN (${values.map((value) => `"${escapeEsqlString(value)}"`).join(', ')})`;

/** Selections within one filter are OR-ed, and the filters are AND-ed together. */
export interface DetonationQueryFilters {
  onlyWithAlerts: boolean;
  hash: string;
  protections: string[];
  platforms: string[];
  sources: string[];
  /**
   * Signature rule names to match, resolved by the client-side parser: the rule names of the
   * selected families, or of every family when only named threats are wanted. `null` means
   * neither is active; an empty array means the selection resolved to nothing and should
   * therefore match nothing.
   */
  familyRuleNames: string[] | null;
}

/** The dimension a breakdown groups by, and therefore the one filter it leaves out. */
export type DetonationDimension = 'family' | 'protection' | 'platform' | 'source';

const toPredicates = (
  filters: DetonationQueryFilters,
  groupedBy?: DetonationDimension
): string[] => {
  const { hash, protections, platforms, sources, familyRuleNames } = filters;

  return [
    toHashPattern(hash),
    groupedBy === 'protection' || protections.length === 0
      ? null
      : `(${anyOf(EVENT_CODES_FIELD, protections)})`,
    groupedBy === 'family' || familyRuleNames === null
      ? null
      : familyRuleNames.length > 0
      ? `(${anyOf(RULE_NAMES_FIELD, familyRuleNames)})`
      : 'false',
    groupedBy === 'platform' || platforms.length === 0
      ? null
      : inList('task.vm_os_family.keyword', platforms),
    groupedBy === 'source' || sources.length === 0
      ? null
      : inList('task.sample_source.keyword', sources),
  ].filter((predicate): predicate is string => predicate !== null);
};

/**
 * Completed tasks in range, narrowed by the active filters. Every query on the page builds on
 * this, so the charts describe the same detonations as the table.
 *
 * A breakdown names the dimension it groups by, which drops that one filter. Its bars then show
 * the values that could be selected instead of the one already chosen, which is what keeps them
 * usable as filter controls rather than collapsing to the single selected bar.
 */
const filteredTasks = (filters: DetonationQueryFilters, groupedBy?: DetonationDimension): string =>
  [
    COMPLETED_TASKS,
    ...(filters.onlyWithAlerts ? [WITH_ALERTS] : []),
    ...toPredicates(filters, groupedBy).map((predicate) => `| WHERE ${predicate}`),
  ].join('\n');

/**
 * Rows for the detonations table. Alert groups are plain objects, so ES|QL returns their
 * `rule_name` and `event_code` as two independent multivalues; the page never pairs them, it only
 * needs the distinct families and the distinct protections.
 *
 * Filters run here rather than over the fetched rows so that the row cap applies to matches
 * across the whole range, instead of hiding matches behind the most recent page of detonations.
 */
export const getDetonationsQuery = (filters: DetonationQueryFilters): string =>
  `${filteredTasks(filters)}
| RENAME task.id.keyword AS taskId,
         task.sample_hash.keyword AS sampleHash,
         task.sample_ext.keyword AS sampleExtension,
         task.vm_os_family.keyword AS osFamily,
         task.vm_architecture.keyword AS architecture,
         task.elastic_agent_id.keyword AS agentId,
         task.agent_version.keyword AS agentVersion,
         task.sample_source.keyword AS source,
         task.tags.keyword AS tags,
         task.production_endpoint_alert_groups.rule_name.keyword AS ruleNames,
         task.production_endpoint_alert_groups.event_code.keyword AS eventCodes,
         task.production_detection_alert_groups.kibana_alert_rule_parameters_severity.keyword AS severities
| KEEP timestamp, taskId, sampleHash, sampleExtension, osFamily, architecture, agentId,
       agentVersion, source, tags, endpointAlertsCount, detectionAlertsCount, ruleNames,
       eventCodes, severities
| SORT timestamp DESC
| LIMIT ${DETONATE_TABLE_LIMIT}`;

/**
 * Header figures for the whole selected range. Deliberately not narrowed by the filters: these
 * state the reach of the detonation programme itself, which is the page's opening claim.
 */
export const getDetonationKpisQuery = (): string =>
  `${COMPLETED_TASKS}
| STATS totalDetonations = COUNT(*),
        endpointAlerts = SUM(endpointAlertsCount),
        detectionAlerts = SUM(detectionAlertsCount)`;

/**
 * Counts per signature rule name. Families are parsed client-side with the unit-tested parser
 * rather than in ES|QL, because prose behaviour rule names such as `Suspicious PowerShell Script
 * with .NET Reflection` also contain dots and a GROK or SPLIT pattern would mistake them for
 * signatures.
 *
 * These rows are also what the family and "named threats only" filters resolve through, so the
 * limit bounds how many families the page can filter on. It is an order of magnitude above the
 * distinct rule names seen so far.
 */
export const getRuleNameCountsQuery = (filters: DetonationQueryFilters): string =>
  `${filteredTasks(filters, 'family')}
| MV_EXPAND task.production_endpoint_alert_groups.rule_name.keyword
| RENAME task.production_endpoint_alert_groups.rule_name.keyword AS ruleName
| WHERE ruleName IS NOT NULL
| STATS count = COUNT(*) BY ruleName
| SORT count DESC
| LIMIT 1000`;

/**
 * Detonations per endpoint protection. A task's alert groups can name the same protection more
 * than once, so this counts distinct tasks rather than groups: the bars read as "detonations this
 * protection caught", and they deliberately do not sum to the total because several protections
 * usually fire on the same sample.
 */
export const getProtectionCountsQuery = (filters: DetonationQueryFilters): string =>
  `${filteredTasks(filters, 'protection')}
| RENAME task.id.keyword AS taskId
| MV_EXPAND task.production_endpoint_alert_groups.event_code.keyword
| RENAME task.production_endpoint_alert_groups.event_code.keyword AS eventCode
| WHERE eventCode IS NOT NULL
| STATS count = COUNT_DISTINCT(taskId) BY eventCode
| SORT count DESC`;

/** Detonations per operating system. */
export const getPlatformCountsQuery = (filters: DetonationQueryFilters): string =>
  `${filteredTasks(filters, 'platform')}
| RENAME task.vm_os_family.keyword AS osFamily
| WHERE osFamily IS NOT NULL
| STATS count = COUNT(*) BY osFamily
| SORT count DESC`;

/** Detonations per ingest source, which feeds the source picker. */
export const getSourceCountsQuery = (filters: DetonationQueryFilters): string =>
  `${filteredTasks(filters, 'source')}
| RENAME task.sample_source.keyword AS source
| WHERE source IS NOT NULL
| STATS count = COUNT(*) BY source
| SORT count DESC`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Task ids are UUIDs, so they are validated rather than escaped into the query. */
export const isValidTaskId = (taskId: string): boolean => UUID_RE.test(taskId);

/**
 * A single detonation for the detail page. Not time-bounded: the detail page is reached by id and
 * a task may fall outside the range the landing page happened to be showing.
 */
export const getDetonationByIdQuery = (taskId: string): string => {
  if (!isValidTaskId(taskId)) {
    throw new Error(`Invalid Detonate task id: ${taskId}`);
  }

  return `FROM ${DETONATE_TASKS_INDEX}
| WHERE task.id.keyword == "${taskId}"
| EVAL endpointAlertsCount = COALESCE(task.production_endpoint_alerts_count, 0::long)
| EVAL detectionAlertsCount = COALESCE(task.production_detection_alerts_count, 0::long)
| RENAME task.id.keyword AS taskId,
         task.sample_hash.keyword AS sampleHash,
         task.sample_ext.keyword AS sampleExtension,
         task.sample_filename.keyword AS sampleFilename,
         task.vm_os_family.keyword AS osFamily,
         task.vm_architecture.keyword AS architecture,
         task.elastic_agent_id.keyword AS agentId,
         task.agent_version.keyword AS agentVersion,
         task.sample_source.keyword AS source,
         task.tags.keyword AS tags,
         task.last_worker_status.keyword AS workerStatus,
         task.production_endpoint_alert_groups.rule_name.keyword AS ruleNames,
         task.production_endpoint_alert_groups.event_code.keyword AS eventCodes,
         task.production_detection_alert_groups.kibana_alert_rule_name.keyword AS detectionRuleNames,
         task.production_detection_alert_groups.kibana_alert_rule_parameters_severity.keyword AS severities
| KEEP timestamp, taskId, sampleHash, sampleExtension, sampleFilename, osFamily, architecture,
       agentId, agentVersion, source, tags, workerStatus, endpointAlertsCount,
       detectionAlertsCount, ruleNames, eventCodes, detectionRuleNames, severities
| LIMIT 1`;
};
