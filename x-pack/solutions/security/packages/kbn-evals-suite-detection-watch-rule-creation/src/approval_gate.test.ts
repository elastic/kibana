/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { readFileSync } = jest.requireActual<typeof import('fs')>('fs');

const WORKFLOW_YAML_PATH = `${__dirname}/../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/rule_creation.yaml`;

describe('rule_creation workflow approval gate', () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(WORKFLOW_YAML_PATH, 'utf-8');
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
