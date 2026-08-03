/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from './types';

/**
 * Builds the text handed to the inference endpoint for an entity.
 *
 * The name leads so that near-name queries still rank well, the tactic
 * shortnames give the model the behavioural context that distinguishes
 * otherwise similar techniques, and the description supplies the bulk of the
 * signal for the paraphrased, behaviour-describing queries that keyword search
 * handles worst. `semantic_text` chunks long values on its own, so the full
 * description is passed through rather than truncated here.
 */
export const buildSemanticText = (entity: MitreEntity): string => {
  const sections: string[] = [`${entity.name} (${entity.id})`];

  if ('tactics' in entity && entity.tactics.length > 0) {
    sections.push(`Tactics: ${entity.tactics.join(', ')}`);
  }

  if (entity.description.length > 0) {
    sections.push(entity.description);
  }

  return sections.join('\n\n');
};
