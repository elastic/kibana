/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerRuleExecutionRowEnricher } from '@kbn/alerting-v2-plugin/server';
import { set } from '@kbn/safer-lodash-set';
import type { Logger } from '@kbn/logging';

import type { DetectionAlertLatest } from '../../../../common/api/detection_engine/model/alerts';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { enrichEvents } from '../rule_types/utils/enrichments';
import type { AlertEnrichmentLogger } from '../rule_types/utils/enrichments/types';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

/**
 * ES|QL row payloads use flat dotted keys (e.g. `{ "host.name": "host-a" }`).
 * The Security enrichers walk nested paths via `lodash.get` and `euid.getEuidFromObject`,
 * which expect `{ host: { name: "host-a" } }`. Expand dotted keys into a nested object so
 * enrichment lookups (EUID, risk, criticality) can locate `host.name`, `user.name`, etc.
 */
const expandDottedKeys = (row: Record<string, unknown>): Record<string, unknown> => {
  const expanded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.includes('.')) {
      set(expanded, key, value);
    } else {
      expanded[key] = value;
    }
  }
  return expanded;
};

/**
 * Flattens enriched alert source back into ES|QL-style flat dotted keys, since downstream
 * `.rule-events` `data` consumers (and `group_hash` computation) read flat keys.
 */
const flattenToDottedKeys = (
  source: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> => {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      Object.assign(flat, flattenToDottedKeys(value as Record<string, unknown>, next));
    } else {
      flat[next] = value;
    }
  }
  return flat;
};

const createRowEnrichmentLogger = (base: Logger, ruleId: string): AlertEnrichmentLogger => ({
  debug: (message: string) => {
    base.debug(`[alertingV2][rowEnrichment][rule:${ruleId}] ${message}`);
  },
  info: (message: string) => {
    base.info(`[alertingV2][rowEnrichment][rule:${ruleId}] ${message}`);
  },
  error: (message: string) => {
    base.error(`[alertingV2][rowEnrichment][rule:${ruleId}] ${message}`);
  },
});

/**
 * Wires Security Solution detection enrichments into alerting v2 rule execution so ES|QL
 * row payloads are merged with risk and asset criticality fields before `.rule-events`
 * documents are built.
 */
export const registerSecuritySolutionAlertingV2RowEnricher = (params: {
  logger: Logger;
  getStartServices: SecuritySolutionPluginCoreSetupDependencies['getStartServices'];
  getExperimentalFeatures: () => ExperimentalFeatures;
}): void => {
  const { logger, getStartServices, getExperimentalFeatures } = params;

  registerRuleExecutionRowEnricher(async (ctx) => {
    if (ctx.rows.length === 0) {
      return ctx.rows;
    }

    const [, startPlugins] = await getStartServices();
    const experimentalFeatures = getExperimentalFeatures();

    const entityStoreCrudClient = experimentalFeatures.entityAnalyticsEntityStoreV2
      ? startPlugins.entityStore.createCRUDClient(
          ctx.scopedClusterClient.asCurrentUser,
          ctx.spaceId
        )
      : undefined;

    const events = ctx.rows.map((row, index) => ({
      _id: `alerting-v2-enrichment:${ctx.rule.id}:${index}`,
      _source: expandDottedKeys(row) as unknown as DetectionAlertLatest,
    }));

    const enrichmentLogger = createRowEnrichmentLogger(logger, ctx.rule.id);

    const enriched = await enrichEvents({
      services: { scopedClusterClient: ctx.scopedClusterClient },
      logger: enrichmentLogger,
      events,
      spaceId: ctx.spaceId,
      experimentalFeatures,
      entityStoreCrudClient,
    });

    return enriched.map((event) =>
      flattenToDottedKeys(event._source as unknown as Record<string, unknown>)
    );
  });
};
