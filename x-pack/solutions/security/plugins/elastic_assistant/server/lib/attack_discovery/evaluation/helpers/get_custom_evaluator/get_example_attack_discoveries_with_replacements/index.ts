/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscoveries, Replacements } from '@kbn/elastic-assistant-common';
import type { Example } from 'langsmith/schemas';

import { getDiscoveriesWithOriginalValues } from '../../get_discoveries_with_original_values';

export const getExampleAttackDiscoveriesWithReplacements = (
  example: Example | undefined
): AttackDiscoveries => {
  const exampleAttackDiscoveries = example?.outputs?.attackDiscoveries;
  const exampleReplacements = example?.outputs?.replacements ?? {};

  // NOTE: calls to `parse` throw an error if the Example input is invalid
  const validatedAttackDiscoveries = AttackDiscoveries.parse(exampleAttackDiscoveries);
  const validatedReplacements = Replacements.parse(exampleReplacements);

  const withReplacements = getDiscoveriesWithOriginalValues({
    attackDiscoveries: validatedAttackDiscoveries,
    replacements: validatedReplacements,
  });

  return withReplacements;
};
