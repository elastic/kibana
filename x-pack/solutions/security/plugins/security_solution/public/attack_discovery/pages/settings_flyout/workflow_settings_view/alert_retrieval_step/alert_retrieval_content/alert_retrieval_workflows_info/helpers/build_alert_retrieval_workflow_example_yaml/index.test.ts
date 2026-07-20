/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertRetrievalWorkflowExampleYaml } from '.';

describe('buildAlertRetrievalWorkflowExampleYaml', () => {
  const singleLineQuery = 'FROM .alerts-security.alerts-default | LIMIT 100';

  const multiLineQuery = [
    'FROM .alerts-security.alerts-default',
    '    METADATA _id',
    '  | WHERE @timestamp >= NOW() - 24 hours',
    '  | LIMIT 100',
  ].join('\n');

  it('includes the manual trigger', () => {
    const yaml = buildAlertRetrievalWorkflowExampleYaml({ esqlQuery: singleLineQuery });

    expect(yaml).toContain('triggers:\n  - type: manual');
  });

  it('uses the elasticsearch.esql.query step type', () => {
    const yaml = buildAlertRetrievalWorkflowExampleYaml({ esqlQuery: singleLineQuery });

    expect(yaml).toContain('type: elasticsearch.esql.query');
  });

  it('embeds the query as a literal block scalar', () => {
    const yaml = buildAlertRetrievalWorkflowExampleYaml({ esqlQuery: singleLineQuery });

    expect(yaml).toContain('query: |');
  });

  it('indents the single-line query under the block scalar', () => {
    const yaml = buildAlertRetrievalWorkflowExampleYaml({ esqlQuery: singleLineQuery });

    expect(yaml).toContain(`        ${singleLineQuery}`);
  });

  it('preserves the relative indentation of a multi-line query', () => {
    const yaml = buildAlertRetrievalWorkflowExampleYaml({ esqlQuery: multiLineQuery });

    expect(yaml).toContain(
      [
        '        FROM .alerts-security.alerts-default',
        '            METADATA _id',
        '          | WHERE @timestamp >= NOW() - 24 hours',
        '          | LIMIT 100',
      ].join('\n')
    );
  });

  it('places the query step as the last step', () => {
    const yaml = buildAlertRetrievalWorkflowExampleYaml({ esqlQuery: singleLineQuery });

    expect(yaml.trimEnd().endsWith(`        ${singleLineQuery}`)).toBe(true);
  });

  it('declares the workflow version', () => {
    const yaml = buildAlertRetrievalWorkflowExampleYaml({ esqlQuery: singleLineQuery });

    expect(yaml.startsWith("version: '1'")).toBe(true);
  });
});
