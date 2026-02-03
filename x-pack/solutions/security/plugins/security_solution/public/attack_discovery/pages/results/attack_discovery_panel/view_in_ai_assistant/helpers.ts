/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';

/**
 * Swaps anonymized values with original values in an attack discovery.
 * This is used when sending attack discovery data to the agent builder,
 * so that the original values are used instead of anonymized placeholders.
 */
export const getAttackDiscoveryWithOriginalValues = ({
  attackDiscovery,
  replacements,
}: {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
}): AttackDiscovery => {
  if (!replacements) {
    return attackDiscovery;
  }

  return {
    ...attackDiscovery,
    detailsMarkdown: replaceAnonymizedValuesWithOriginalValues({
      messageContent: attackDiscovery.detailsMarkdown,
      replacements,
    }),
    entitySummaryMarkdown: attackDiscovery.entitySummaryMarkdown
      ? replaceAnonymizedValuesWithOriginalValues({
          messageContent: attackDiscovery.entitySummaryMarkdown,
          replacements,
        })
      : undefined,
    summaryMarkdown: replaceAnonymizedValuesWithOriginalValues({
      messageContent: attackDiscovery.summaryMarkdown,
      replacements,
    }),
    title: replaceAnonymizedValuesWithOriginalValues({
      messageContent: attackDiscovery.title,
      replacements,
    }),
  };
};
