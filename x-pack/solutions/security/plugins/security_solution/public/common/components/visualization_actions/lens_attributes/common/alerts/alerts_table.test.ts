/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getAlertsTableLensAttributes } from './alerts_table';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../../../data_view_manager/hooks/__mocks__/use_data_view';

interface VisualizationState {
  visualization: { columns: {} };
  datasourceStates: {
    formBased: { layers: Record<string, { columns: {}; columnOrder: string[] }> };
  };
}

jest.mock('uuid', () => ({
  ...jest.requireActual('uuid'),
  v4: jest.fn().mockReturnValue('generated-uuid'),
}));

jest.mock('../../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      pageName: 'alerts',
    },
  ]),
}));

describe('getAlertsTableLensAttributes', () => {
  beforeAll(() => {
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['signal-index'], 'security-solution-my-test'));
  });

  it('should render without extra options', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getAlertsTableLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render with extra options - filters', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: {
            filters: [
              {
                meta: {
                  type: 'phrases',
                  key: '_index',
                  params: ['.alerts-security.alerts-default'],
                  alias: null,
                  negate: false,
                  disabled: false,
                },
                query: {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          _index: '.alerts-security.alerts-default',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
            ],
          },
          getLensAttributes: getAlertsTableLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render with extra options - breakdownField', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: { breakdownField: 'agent.type' },
          getLensAttributes: getAlertsTableLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    const state = result?.current?.state as VisualizationState;
    expect(result?.current).toMatchSnapshot();

    expect(state.datasourceStates.formBased.layers['layer-id-generated-uuid'].columnOrder)
      .toMatchInlineSnapshot(`
      Array [
        "top-values-of-stack-by-field-column-id-generated-uuid",
        "top-values-of-breakdown-field-column-id-generated-uuid",
        "count-column-id-generated-uuid",
      ]
    `);
  });

  it('should render Without extra options - breakdownField', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: { breakdownField: '' },
          getLensAttributes: getAlertsTableLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    const state = result?.current?.state as VisualizationState;
    expect(state.visualization?.columns).toMatchInlineSnapshot(`
      Array [
        Object {
          "columnId": "top-values-of-stack-by-field-column-id-generated-uuid",
          "isTransposed": false,
          "width": 362,
        },
        Object {
          "columnId": "count-column-id-generated-uuid",
          "isTransposed": false,
        },
      ]
    `);

    expect(state.datasourceStates.formBased.layers['layer-id-generated-uuid'].columnOrder)
      .toMatchInlineSnapshot(`
      Array [
        "top-values-of-stack-by-field-column-id-generated-uuid",
        "count-column-id-generated-uuid",
      ]
    `);
  });
});
