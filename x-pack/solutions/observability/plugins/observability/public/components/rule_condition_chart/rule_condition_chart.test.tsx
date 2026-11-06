/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { CustomThresholdSearchSourceFields } from '../../../common/custom_threshold_rule/types';
import { Aggregators } from '../../../common/custom_threshold_rule/types';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import type { RuleConditionChartExpressions } from './rule_condition_chart';
import { RuleConditionChart } from './rule_condition_chart';

jest.mock('../../utils/kibana_react');

const mockBuild = jest.fn().mockResolvedValue({
  title: '',
  visualizationType: 'lnsXY',
  state: {},
  references: [],
});

jest.mock('@kbn/lens-embeddable-utils', () => {
  const actual = jest.requireActual('@kbn/lens-embeddable-utils');
  return {
    ...actual,
    LensConfigBuilder: jest.fn().mockImplementation(() => ({
      build: mockBuild,
    })),
  };
});

const useKibanaMock = useKibana as jest.Mock;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    ...kibanaStartMock.startContract(),
  });
};

const expression: RuleConditionChartExpressions = {
  metrics: [
    {
      name: 'A',
      aggType: Aggregators.COUNT,
    },
  ],
  timeSize: 1,
  timeUnit: 'm',
  threshold: [1],
  comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
};

const dataView = {
  id: 'test-data-view',
  timeFieldName: '@timestamp',
  getIndexPattern: () => 'metrics-*',
} as unknown as DataView;

describe('Rule condition chart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  async function setup({
    groupBy = [],
    chartDataView,
  }: {
    groupBy?: string | string[];
    chartDataView?: DataView;
  } = {}) {
    const wrapper = mountWithIntl(
      <RuleConditionChart
        metricExpression={expression}
        dataView={chartDataView}
        searchConfiguration={{} as CustomThresholdSearchSourceFields}
        groupBy={groupBy}
        error={{}}
        timeRange={{ from: 'now-15m', to: 'now' }}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return { wrapper };
  }

  function getSeriesBreakdown() {
    expect(mockBuild).toHaveBeenCalled();
    const [config] = mockBuild.mock.calls[0];
    return config.layers.find((layer: { type: string }) => layer.type === 'series').breakdown;
  }

  it('should display no data message', async () => {
    const { wrapper } = await setup();
    expect(wrapper.find('[data-test-subj="thresholdRuleNoChartData"]').exists()).toBeTruthy();
  });

  it('should pass all group-by fields to the Lens breakdown via secondaryFields', async () => {
    await setup({
      chartDataView: dataView,
      groupBy: ['host.name', 'container.id', 'service.name'],
    });

    expect(getSeriesBreakdown()).toEqual({
      type: 'topValues',
      field: 'host.name',
      size: 3,
      secondaryFields: ['container.id', 'service.name'],
      accuracyMode: false,
      orderBy: expect.objectContaining({
        orderDirection: 'desc',
      }),
    });
  });

  it('should omit secondaryFields for a single group-by field', async () => {
    await setup({
      chartDataView: dataView,
      groupBy: ['host.name'],
    });

    expect(getSeriesBreakdown()).toEqual({
      type: 'topValues',
      field: 'host.name',
      size: 3,
      accuracyMode: false,
      orderBy: expect.objectContaining({
        orderDirection: 'desc',
      }),
    });
  });

  it('should pass all secondary group-by fields even beyond the Lens UI cap of 3', async () => {
    // Lens editor MAX_MULTI_FIELDS_SIZE = 3 secondary fields (4 total).
    // Custom threshold does not enforce that cap; chart config should still include all fields.
    await setup({
      chartDataView: dataView,
      groupBy: ['host.name', 'container.id', 'event.module', 'labels.groupId', 'labels.scenario'],
    });

    expect(getSeriesBreakdown()).toEqual({
      type: 'topValues',
      field: 'host.name',
      size: 3,
      secondaryFields: ['container.id', 'event.module', 'labels.groupId', 'labels.scenario'],
      accuracyMode: false,
      orderBy: expect.objectContaining({
        orderDirection: 'desc',
      }),
    });
  });
});
