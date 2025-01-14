/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { MetricsExplorerMetric } from '../../../../common/http_api/metrics_explorer';
import { Expressions } from './expression';
import { dataViewPluginMocks as mockDataViewPlugin } from '@kbn/data-views-plugin/public/mocks';
import { indexPatternEditorPluginMock as mockDataViewEditorPlugin } from '@kbn/data-view-editor-plugin/public/mocks';
import { dataPluginMock as mockDataPlugin } from '@kbn/data-plugin/public/mocks';
import { useKibana } from '@kbn/observability-plugin/public/utils/kibana_react';
import { kibanaStartMock } from '@kbn/observability-plugin/public/utils/kibana_react.mock';
import { MetricsExplorerGroupBy } from '../../../pages/metrics/metrics_explorer/components/group_by';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      ...mockCoreMock.createStart(),
      data: mockDataPlugin.createStartContract(),
      dataViews: {
        ...mockDataViewPlugin.createStartContract(),
        getIds: jest.fn().mockImplementation(() => ['test-data-view-id']),
        get: jest.fn().mockReturnValue(Promise.resolve({ isPersisted: jest.fn() })),
      },
      dataViewEditor: mockDataViewEditorPlugin.createStartContract(),
    },
  }),
}));

jest.mock('@kbn/observability-plugin/public/utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    ...kibanaStartMock.startContract(),
  });
};

jest.mock('../../../pages/metrics/metrics_explorer/components/kuery_bar');
jest.mock('../../../pages/metrics/metrics_explorer/components/group_by');

const mockedMetricsExplorerKueryBar = jest.fn(() => (
  <div data-test-subj="MetricsExplorerKueryBar" />
));
(MetricsExplorerKueryBar as jest.Mock).mockImplementation(mockedMetricsExplorerKueryBar);

const mockedMetricsExplorerGroupBy = jest.fn(() => <div data-test-subj="MetricsExplorerGroupBy" />);
(MetricsExplorerGroupBy as jest.Mock).mockImplementation(mockedMetricsExplorerGroupBy);

describe('Expression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  async function setup(currentOptions: {
    metrics?: MetricsExplorerMetric[];
    filterQuery?: string;
    groupBy?: string;
  }) {
    const ruleParams = {
      criteria: [],
      groupBy: undefined,
      filterQueryText: '',
      sourceId: '',
      searchConfiguration: {
        index: 'mockedIndex',
        query: {
          query: '',
          language: 'kuery',
        },
      },
    };
    const wrapper = mountWithIntl(
      <Expressions
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams}
        errors={{}}
        setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
        setRuleProperty={() => {}}
        metadata={{
          currentOptions,
          adHocDataViewList: [],
        }}
        onChangeMetaData={() => {}}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update, ruleParams };
  }

  it('should prefill the alert using the context metadata', async () => {
    const currentOptions = {
      groupBy: 'host.hostname',
      filterQuery: 'foo',
      metrics: [
        { aggregation: 'avg', field: 'system.load.1' },
        { aggregation: 'cardinality', field: 'system.cpu.user.pct' },
      ] as MetricsExplorerMetric[],
    };
    const { ruleParams } = await setup(currentOptions);
    expect(ruleParams.groupBy).toBe('host.hostname');
    expect(ruleParams.filterQueryText).toBe('foo');
    expect(ruleParams.criteria).toEqual([
      {
        metric: 'system.load.1',
        comparator: COMPARATORS.GREATER_THAN,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        aggType: 'avg',
      },
      {
        metric: 'system.cpu.user.pct',
        comparator: COMPARATORS.GREATER_THAN,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        aggType: 'cardinality',
      },
    ]);
  });
});
