/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TINES_MIGRATION_WORKFLOW_TAG } from '../../../../common/siem_migrations/workflows/constants';
import { prepareYamlForWorkflowsSave } from './workflows_management';

jest.mock('../../../common/lib/kibana', () => ({
  KibanaServices: {
    get: () => ({
      http: {},
    }),
  },
}));

describe('prepareYamlForWorkflowsSave', () => {
  it('enables the workflow and adds the tines-migration tag', () => {
    const yaml = [
      'version: "1"',
      'name: Sample',
      'enabled: false',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: noop',
      '    type: console',
      '    with:',
      '      message: hi',
    ].join('\n');

    const prepared = prepareYamlForWorkflowsSave(yaml);

    expect(prepared).toContain('enabled: true');
    expect(prepared).toContain(TINES_MIGRATION_WORKFLOW_TAG);
    expect(prepared).toContain('name: Sample');
  });

  it('does not duplicate the migration tag', () => {
    const yaml = [
      'version: "1"',
      'name: Sample',
      'enabled: true',
      `tags: [${TINES_MIGRATION_WORKFLOW_TAG}]`,
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: noop',
      '    type: console',
      '    with:',
      '      message: hi',
    ].join('\n');

    const prepared = prepareYamlForWorkflowsSave(yaml);
    const tagMatches = prepared.match(new RegExp(TINES_MIGRATION_WORKFLOW_TAG, 'g')) ?? [];
    expect(tagMatches).toHaveLength(1);
  });
});
