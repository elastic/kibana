/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { deanonymize } from './render_alert';

/**
 * Maps anonymization tokens in a discovery's text back to original values, over the same four
 * fields the product de-anonymizes (`getDiscoveriesWithOriginalValues` in elastic_assistant).
 * `alertIds` are never anonymized.
 */
export const deanonymizeDiscoveries = (
  discoveries: readonly AttackDiscovery[],
  replacements: Replacements
): AttackDiscovery[] =>
  discoveries.map((discovery) => ({
    ...discovery,
    title: deanonymize(discovery.title, replacements),
    summaryMarkdown: deanonymize(discovery.summaryMarkdown, replacements),
    detailsMarkdown: deanonymize(discovery.detailsMarkdown, replacements),
    ...(discovery.entitySummaryMarkdown !== undefined
      ? { entitySummaryMarkdown: deanonymize(discovery.entitySummaryMarkdown, replacements) }
      : {}),
  }));
