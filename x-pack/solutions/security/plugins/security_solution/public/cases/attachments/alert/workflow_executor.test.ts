/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseAlertWorkflowOrigin } from './workflow_executor';

describe('getCaseAlertWorkflowOrigin', () => {
  it('returns a single-alert origin for one selected alert', () => {
    expect(
      getCaseAlertWorkflowOrigin('case-1', {
        workflowId: 'workflow-1',
        inputs: {
          event: {
            alertIds: [{ _id: 'alert-1', _index: '.alerts-security.alerts-default' }],
          },
        },
      })
    ).toEqual({
      type: 'cases.alert',
      id: 'alert-1',
    });
  });

  it('returns a case-scoped bulk-alert origin for multiple selected alerts', () => {
    expect(
      getCaseAlertWorkflowOrigin('case-1', {
        workflowId: 'workflow-1',
        inputs: {
          event: {
            alertIds: [
              { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
              { _id: 'alert-2', _index: '.alerts-security.alerts-default' },
            ],
          },
        },
      })
    ).toEqual({
      type: 'cases.alerts',
      id: 'case-1',
    });
  });
});
