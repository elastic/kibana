/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getAlertsTableLensAttributes } from './alerts_table';

interface VisualizationState {
  visualization: { columns: {} };
  datasourceStates: {
    formBased: { layers: Record<string, { columns: {}; columnOrder: string[] }> };
  };
}

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('mockLayerId')
    .mockReturnValueOnce('mockTopValuesOfStackByFieldColumnId')
    .mockReturnValueOnce('mockCountColumnId')
    .mockReturnValueOnce('mockTopValuesOfBreakdownFieldColumnId'),
}));

jest.mock('../../../../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
    selectedPatterns: ['signal-index'],
    sourcererDataView: {},
  }),
}));

jest.mock('../../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      pageName: 'alerts',
    },
  ]),
}));

describe('getAlertsTableLensAttributes', () => {
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

    expect(state.datasourceStates.formBased.layers.mockLayerId.columnOrder).toMatchInlineSnapshot(`
      Array [
        "mockTopValuesOfStackByFieldColumnId",
        "mockTopValuesOfBreakdownFieldColumnId",
        "mockCountColumnId",
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
          "columnId": "mockTopValuesOfStackByFieldColumnId",
          "isTransposed": false,
          "width": 362,
        },
        Object {
          "columnId": "mockCountColumnId",
          "isTransposed": false,
        },
      ]
    `);

    expect(state.datasourceStates.formBased.layers.mockLayerId.columnOrder).toMatchInlineSnapshot(`
      Array [
        "mockTopValuesOfStackByFieldColumnId",
        "mockCountColumnId",
      ]
    `);
  });
});
