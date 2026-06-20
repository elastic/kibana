/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { introspectLogsCommonDefinition } from '../../common/step_types/introspect_logs';

type FieldProperties = Record<string, { type?: string; properties?: FieldProperties }>;

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

    // 3. Persist config to Elasticsearch
    try {
      await esClient.index(
        {
          index: configIndex,
          id: configDocId,
          document: {
            index: chosenIndex,
            categoryField: chosenField,
            updatedAt: new Date().toISOString(),
            docsCount,
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

    return { output: { index: chosenIndex, categoryField: chosenField, docsCount } };
  },
});
