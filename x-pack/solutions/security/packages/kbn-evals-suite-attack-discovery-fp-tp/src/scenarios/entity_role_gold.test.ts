/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed/definitions/alertzero';
import { buildFpTpExampleWorld, FP_TP_EXAMPLES } from '.';

/** The only roles the prompt reads as supporting; any other seeded role is context, so neutral. */
const ORDINARY_SUB_TYPES: Readonly<Record<string, string>> = {
  host: 'employee_workstation',
  user: 'employee',
};

/** The seeded records whose role is not ordinary: management hosts, jump boxes, service accounts. */
const nonOrdinaryRoles = (exampleId: string): string[] =>
  buildFpTpExampleWorld(exampleId, 'run1').entities.flatMap(({ source }) => {
    const { type = '', sub_type: subType } = source.entity as { type?: string; sub_type?: string };
    return subType !== undefined && subType !== ORDINARY_SUB_TYPES[type]
      ? [`${type}:${subType}`]
      : [];
  });

const applicable = FP_TP_EXAMPLES.flatMap(({ id, checks }) => {
  const roles = nonOrdinaryRoles(id);
  return checks && roles.length > 0 ? [[id, roles.join(', '), checks.entityRole] as const] : [];
});

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe('entity_role gold and the managed prompt', () => {
  it('still tells the model a management server, MDM, jump box, or service account is neutral', () => {
    const workflow = parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml) as {
      steps: Array<{ name: string; with?: { message?: string } }>;
    };
    const message = workflow.steps.find(({ name }) => name === 'analyze')?.with?.message ?? '';

    // If this sentence changes, review every `entityRole` gold in the suite before updating it.
    expect(collapseWhitespace(message)).toContain(
      'A management server, MDM, jump box, or service account is neutral, not contradicts'
    );
  });

  it('applies to at least one example', () => {
    expect(applicable.length).toBeGreaterThan(0);
  });

  it.each(applicable)(
    'returns a %s entityRole other than contradicts for seeded %s',
    (_id, _roles, entityRole) => {
      expect(entityRole).not.toBe('contradicts');
    }
  );
});
