/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { introspectLogsCommonDefinition } from '../../common/step_types/introspect_logs';

type FieldProperties = Record<string, { type?: string; properties?: FieldProperties }>;

const SEVERITY_THRESHOLD = 0.1;
const ERROR_VOCABULARY = 'error OR exception OR fatal OR fail* OR traceback OR panic OR warn*';
const DEFAULT_LOG_LEVELS = ['ERROR', 'FATAL', 'WARN'];

const collectTextFields = (properties: FieldProperties, prefix = ''): Set<string> => {
  const textFields = new Set<string>();
  for (const [name, config] of Object.entries(properties)) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (config.type === 'text') {
      textFields.add(path);
    }
    if (config.properties) {
      for (const f of collectTextFields(config.properties, path)) {
        textFields.add(f);
      }
    }
  }
  return textFields;
};

export const introspectLogsStepDefinition = createServerStepDefinition({
  ...introspectLogsCommonDefinition,
  handler: async (context) => {
    const {
      candidateIndexPatterns,
      preferredCategoryFields,
      lookbackDays,
      configIndex,
      configDocId,
    } = context.input;
    const esClient = context.contextManager.getScopedEsClient();

    // 1. Find first candidate index pattern with recent data
    let chosenIndex = candidateIndexPatterns[0];
    let docsCount = 0;

    for (const pattern of candidateIndexPatterns) {
      try {
        const resp = await esClient.count(
          {
            index: pattern,
            query: { range: { '@timestamp': { gte: `now-${lookbackDays}d` } } },
          },
          { signal: context.abortSignal }
        );
        if (resp.count > 0) {
          chosenIndex = pattern;
          docsCount = resp.count;
          break;
        }
      } catch {
        // Index doesn't exist or isn't reachable — try next candidate
      }
    }

    context.logger.debug(
      `error-sentry.introspectLogs: chosen index "${chosenIndex}" (${docsCount} recent docs)`
    );

    // 2. Find best category field from mappings
    let chosenField = preferredCategoryFields[0];

    try {
      const mappingResp = await esClient.indices.getMapping(
        { index: chosenIndex },
        { signal: context.abortSignal }
      );

      const textFields = new Set<string>();
      for (const indexState of Object.values(mappingResp)) {
        if (indexState.mappings?.properties) {
          for (const f of collectTextFields(indexState.mappings.properties as FieldProperties)) {
            textFields.add(f);
          }
        }
      }

      let found = false;
      for (const field of preferredCategoryFields) {
        if (textFields.has(field)) {
          chosenField = field;
          found = true;
          break;
        }
      }

      if (!found && textFields.size > 0) {
        chosenField = textFields.values().next().value!;
      }
    } catch (err) {
      context.logger.warn(
        `error-sentry.introspectLogs: could not inspect mappings for "${chosenIndex}": ${err}. Keeping default field "${chosenField}".`
      );
    }

    context.logger.debug(`error-sentry.introspectLogs: chosen category field "${chosenField}"`);

    // 3. Run probes in parallel: severity field coverage, text filter, and k8s sample
    type EsqlJsonResponse = { values?: unknown[][] };

    const [severityProbeResult, textProbeResult, sampleResult] = await Promise.allSettled([
      esClient.esql.query(
        {
          query: `FROM ${chosenIndex} | WHERE @timestamp > NOW() - ${lookbackDays} days | STATS total = COUNT(*), log_level_count = COUNT(\`log.level\`), severity_text_count = COUNT(severity_text), severity_number_count = COUNT(severity_number)`,
          format: 'json',
        } as Parameters<typeof esClient.esql.query>[0],
        { signal: context.abortSignal }
      ),
      esClient.search(
        {
          index: chosenIndex,
          size: 0,
          track_total_hits: true,
          query: {
            bool: {
              filter: [{ range: { '@timestamp': { gte: `now-${lookbackDays}d`, lte: 'now' } } }],
              must: [
                {
                  simple_query_string: {
                    default_operator: 'OR' as const,
                    fields: [chosenField],
                    query: ERROR_VOCABULARY,
                  },
                },
              ],
            },
          },
        },
        { signal: context.abortSignal }
      ),
      esClient.search(
        {
          index: chosenIndex,
          size: 1,
          sort: [{ '@timestamp': { order: 'desc' } }],
          _source: true,
          query: { match_all: {} },
        },
        { signal: context.abortSignal }
      ),
    ]);

    // 4. Parse severity probe
    let totalDocs7d = 0;
    let logLevelCount = 0;
    let severityTextCount = 0;
    let severityNumberCount = 0;

    if (severityProbeResult.status === 'fulfilled') {
      const row = (severityProbeResult.value as unknown as EsqlJsonResponse).values?.[0];
      if (row) {
        totalDocs7d = (row[0] as number) ?? 0;
        logLevelCount = (row[1] as number) ?? 0;
        severityTextCount = (row[2] as number) ?? 0;
        severityNumberCount = (row[3] as number) ?? 0;
      }
    } else {
      context.logger.warn(
        `error-sentry.introspectLogs: severity ESQL probe failed: ${severityProbeResult.reason}`
      );
    }

    // 5. Parse text filter probe
    let errorMatchingDocs7d = 0;

    if (textProbeResult.status === 'fulfilled') {
      const total = textProbeResult.value.hits.total;
      errorMatchingDocs7d = typeof total === 'number' ? total : (total?.value ?? 0);
    } else {
      context.logger.warn(
        `error-sentry.introspectLogs: text filter probe failed: ${textProbeResult.reason}`
      );
    }

    // 6. Detect k8s attribute keys from sampled document
    type K8sKeys = {
      podKey?: string;
      namespaceKey?: string;
      deploymentKey?: string;
      hostKey?: string;
      serviceKey?: string;
    };
    let k8s: K8sKeys = {};

    if (sampleResult.status === 'fulfilled') {
      const source = sampleResult.value.hits.hits[0]?._source as
        | Record<string, unknown>
        | undefined;
      const attrs = (source?.resource as Record<string, unknown> | undefined)?.attributes as
        | Record<string, unknown>
        | undefined;
      if (attrs) {
        const key = (k: string): string | undefined =>
          attrs[k] !== undefined && attrs[k] !== '' ? k : undefined;
        k8s = {
          podKey: key('k8s.pod.name'),
          namespaceKey: key('k8s.namespace.name'),
          deploymentKey: key('k8s.deployment.name'),
          hostKey: key('host.name'),
          serviceKey: key('service.name'),
        };
      }
    } else {
      context.logger.warn(
        `error-sentry.introspectLogs: k8s sample probe failed: ${sampleResult.reason}`
      );
    }

    // 7. Compute severity strategy
    const logLevelRatio = totalDocs7d > 0 ? logLevelCount / totalDocs7d : 0;
    const severityTextRatio = totalDocs7d > 0 ? severityTextCount / totalDocs7d : 0;
    const severityNumberRatio = totalDocs7d > 0 ? severityNumberCount / totalDocs7d : 0;

    let severityStrategy: 'severity' | 'text';
    let severityField: string | undefined;
    let logLevels: string[];
    let textFilter: string | undefined;

    if (logLevelRatio >= SEVERITY_THRESHOLD) {
      severityStrategy = 'severity';
      severityField = 'log.level';
      logLevels = DEFAULT_LOG_LEVELS;
    } else if (severityTextRatio >= SEVERITY_THRESHOLD) {
      severityStrategy = 'severity';
      severityField = 'severity_text';
      logLevels = DEFAULT_LOG_LEVELS;
    } else if (severityNumberRatio >= SEVERITY_THRESHOLD) {
      severityStrategy = 'severity';
      severityField = 'severity_number';
      logLevels = DEFAULT_LOG_LEVELS;
    } else {
      severityStrategy = 'text';
      logLevels = [];
      textFilter = ERROR_VOCABULARY;
    }

    context.logger.debug(
      `error-sentry.introspectLogs: strategy="${severityStrategy}", field="${severityField ?? 'none'}", k8s=${JSON.stringify(k8s)}`
    );

    // 8. Write full enriched config
    try {
      await esClient.index(
        {
          index: configIndex,
          id: configDocId,
          document: {
            index: chosenIndex,
            categoryField: chosenField,
            severityStrategy,
            severityField,
            logLevels,
            textFilter,
            k8s,
            totalDocs7d,
            errorMatchingDocs7d,
            updatedAt: new Date().toISOString(),
          },
          refresh: true,
        },
        { signal: context.abortSignal }
      );
    } catch (err) {
      context.logger.error(
        `error-sentry.introspectLogs: failed to write config to "${configIndex}": ${err}`
      );
    }

    return {
      output: {
        index: chosenIndex,
        categoryField: chosenField,
        docsCount,
        severityStrategy,
        severityField,
        logLevels,
        textFilter,
        k8s,
        totalDocs7d,
        errorMatchingDocs7d,
      },
    };
  },
});
