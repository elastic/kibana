/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import { Metric, LIGHT_THEME } from '@elastic/charts';
import { render } from '@testing-library/react';
import React from 'react';
import type { Props } from './threshold';
import { Threshold } from './threshold';

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Metric: jest.fn(() => 'mocked Metric'),
  };
});

describe('Threshold', () => {
  const renderComponent = (props: Partial<Props> = {}) => {
    const defaultProps: Props = {
      chartProps: { baseTheme: LIGHT_THEME },
      comparator: COMPARATORS.GREATER_THAN,
      id: 'componentId',
      thresholds: [90],
      title: 'Threshold breached',
      value: 93,
      valueFormatter: (d) => `${d}%`,
    };

    return render(
      <div
        style={{
          height: '160px',
          width: '240px',
        }}
      >
        <Threshold {...defaultProps} {...props} />
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows component', () => {
    const component = renderComponent();
    expect(component.queryByTestId('threshold-90-93')).toBeTruthy();
  });

  it('shows warning message', () => {
    renderComponent({
      thresholds: [7],
      comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
      warning: {
        thresholds: [3, 7],
        comparator: COMPARATORS.BETWEEN,
      },
    });

    expect((Metric as jest.Mock).mock.calls[0][0].data[0][0]).toMatchInlineSnapshot(`
      Object {
        "color": "#FFE8E5",
        "extra": <React.Fragment>
          Alert when &gt;= 7%
          <br />
          Warn when between 3% - 7%
        </React.Fragment>,
        "icon": [Function],
        "title": "Threshold breached",
        "value": 93,
        "valueFormatter": [Function],
      }
    `);
  });
});
