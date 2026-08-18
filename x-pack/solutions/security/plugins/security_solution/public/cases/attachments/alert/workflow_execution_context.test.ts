/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseAlertWorkflowExecutionContextResolver } from './workflow_execution_context';

describe('createCaseAlertWorkflowExecutionContextResolver', () => {
  const resolveExecutionContext = createCaseAlertWorkflowExecutionContextResolver('case-1');

  it('uses a single alert as the primary context', () => {
    expect(resolveExecutionContext([{ _id: 'alert-1', _index: 'alerts-index' }])).toEqual({
      type: 'cases.alert',
      id: 'alert-1',
      parent: {
        type: 'cases.case',
        id: 'case-1',
      },
    });
  });

  it('uses the alerts collection context for multiple alerts', () => {
    expect(
      resolveExecutionContext([
        { _id: 'alert-1', _index: 'alerts-index' },
        { _id: 'alert-2', _index: 'alerts-index' },
      ])
    ).toEqual({
      type: 'cases.alerts',
      id: 'case-1',
      parent: {
        type: 'cases.case',
        id: 'case-1',
      },
    });
  });
});
