/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCaseAlertFilter } from './build_case_alert_filter';

describe('buildCaseAlertFilter', () => {
  it('builds an ids filter for the provided alert IDs', () => {
    const result = buildCaseAlertFilter(['alert-1', 'alert-2', 'alert-3']);

    expect(result).toEqual({
      bool: {
        filter: [
          {
            ids: {
              values: ['alert-1', 'alert-2', 'alert-3'],
            },
          },
        ],
      },
    });
  });

  it('handles a single alert ID', () => {
    const result = buildCaseAlertFilter(['alert-1']);

    expect(result).toEqual({
      bool: {
        filter: [
          {
            ids: {
              values: ['alert-1'],
            },
          },
        ],
      },
    });
  });
});
