/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed/definitions/alertzero';
import { buildFpTpExampleWorld, FP_TP_EXAMPLES } from '.';

/** Host `sub_type`s the managed prompt names as a management server, MDM, or jump box. */
const NEUTRAL_HOST_SUB_TYPES = new Set(['sccm_distribution_point', 'mdm_management', 'jump_box']);

const hostSubType = (exampleId: string): string | undefined =>
  buildFpTpExampleWorld(exampleId, 'run1')
    .entities.map(({ source }) => source.entity as { type?: string; sub_type?: string })
    .find(({ type }) => type === 'host')?.sub_type;

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe('entity_role gold and the managed prompt', () => {
  it('still tells the model a management server, MDM, or jump box is neutral', () => {
    const workflow = parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml) as {
      steps: Array<{ name: string; with?: { message?: string } }>;
    };
    const message = workflow.steps.find(({ name }) => name === 'analyze')?.with?.message ?? '';

    // If this sentence changes, review every `entityRole` gold in the suite before updating it.
    expect(collapseWhitespace(message)).toContain(
      'A management server, MDM, jump box, or service account is neutral, not contradicts'
    );
  });

  it.each(
    FP_TP_EXAMPLES.filter(({ checks }) => checks).map(({ id, checks }) => [id, checks?.entityRole])
  )('returns a %s entityRole that follows the prompt for its seeded host', (id, entityRole) => {
    const subType = hostSubType(id as string);

    if (subType !== undefined && NEUTRAL_HOST_SUB_TYPES.has(subType)) {
      expect(entityRole).not.toBe('contradicts');
    }
  });

  it('returns at least one example seeded with a management host', () => {
    expect(
      FP_TP_EXAMPLES.filter(({ id }) => NEUTRAL_HOST_SUB_TYPES.has(hostSubType(id) ?? ''))
    ).not.toHaveLength(0);
  });
});
