/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getManagedWorkflowDefinition,
  PND_RULE_CREATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';

describe('rule_creation workflow approval gate', () => {
  let yaml: string;

  beforeAll(() => {
    const definition = getManagedWorkflowDefinition(PND_RULE_CREATION_WORKFLOW_ID);
    if (!definition?.yaml) {
      throw new Error(`Managed workflow ${PND_RULE_CREATION_WORKFLOW_ID} has no yaml definition`);
    }
    yaml = definition.yaml;
  });

  it('has a create_rule step', () => {
    expect(yaml).toContain('name: create_rule');
  });

  it('guards create_rule with the approval condition', () => {
    const createRuleBlock = yaml.slice(yaml.indexOf('name: create_rule'));
    expect(createRuleBlock).toMatch(
      /steps\.review_creation\.output\.response\.approved\s*==\s*true/
    );
  });
});
