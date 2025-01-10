/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type FieldSpec } from '@kbn/data-views-plugin/common';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { InventoryMetricConditions } from '../../../../common/alerting/metrics';
import type { AlertContextMeta } from './expression';
import { defaultExpression, ExpressionRow, Expressions } from './expression';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import type { SnapshotCustomMetricInput } from '../../../../common/http_api';
import { dataViewPluginMocks as mockDataViewPlugin } from '@kbn/data-views-plugin/public/mocks';
import { indexPatternEditorPluginMock as mockDataViewEditorPlugin } from '@kbn/data-view-editor-plugin/public/mocks';
import { dataPluginMock as mockDataPlugin } from '@kbn/data-plugin/public/mocks';
import { useKibana } from '@kbn/observability-plugin/public/utils/kibana_react';
import { kibanaStartMock } from '@kbn/observability-plugin/public/utils/kibana_react.mock';
import { chartPluginMock as mockChartPlugin } from '@kbn/charts-plugin/public/mocks';
import { ReloadRequestTimeProvider } from '../../../hooks/use_reload_request_time';

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: TIMESTAMP_FIELD,
  fields: [
    {
      name: 'some.system.field',
      type: 'bzzz',
      searchable: true,
      aggregatable: true,
    },
  ] as Partial<FieldSpec[]>,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as jest.Mocked<DataView>;

const mockToasts = {
  danger: jest.fn(),
  warning: jest.fn(),
};

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
      charts: mockChartPlugin.createStartContract(),
    },
    notifications: { toasts: mockToasts },
  }),
}));

jest.mock('@kbn/observability-plugin/public/utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    ...kibanaStartMock.startContract(),
  });
};

const exampleCustomMetric = {
  id: 'this-is-an-id',
  field: 'some.system.field',
  aggregation: 'rate',
  type: 'custom',
} as SnapshotCustomMetricInput;

describe('Expression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  async function setup(currentOptions: AlertContextMeta) {
    const ruleParams = {
      criteria: [],
      nodeType: undefined,
      filterQueryText: '',
      searchConfiguration: {
        index: 'mockedIndex',
        query: {
          query: '',
          language: 'kuery',
        },
      },
    };
    const wrapper = mountWithIntl(
      <ReloadRequestTimeProvider>
        <Expressions
          ruleInterval="1m"
          ruleThrottle="1m"
          alertNotifyWhen="onThrottleInterval"
          ruleParams={ruleParams as any}
          errors={{}}
          setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
          setRuleProperty={() => {}}
          metadata={{
            ...currentOptions,
            adHocDataViewList: [],
          }}
          onChangeMetaData={() => {}}
        />
      </ReloadRequestTimeProvider>
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
      filter: 'foo',
      nodeType: 'pod',
      customMetrics: [],
      options: { metric: { type: 'memory' } },
      adHocDataViewList: [],
    };
    const { ruleParams } = await setup(currentOptions as AlertContextMeta);
    expect(ruleParams.nodeType).toBe('pod');
    expect(ruleParams.filterQueryText).toBe('foo');
    expect(ruleParams.criteria).toEqual([
      {
        metric: 'memory',
        comparator: COMPARATORS.GREATER_THAN,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        customMetric: defaultExpression.customMetric,
      },
    ]);
  });

  it('should pass the elasticsearch query to the expression chart', async () => {
    const FILTER_QUERY =
      '{"bool":{"should":[{"match_phrase":{"host.name":"testHostName"}}],"minimum_should_match":1}}';

    const currentOptions = {
      filter: 'host.name: "testHostName"',
      nodeType: undefined,
      customMetrics: [],
      options: { metric: { type: 'memory' } },
      adHocDataViewList: [],
    };

    const { wrapper } = await setup(currentOptions as AlertContextMeta);

    const chart = wrapper.find('[data-test-subj="preview-chart"]');

    expect(chart.prop('filterQuery')).toBe(FILTER_QUERY);
  });

  describe('using custom metrics', () => {
    it('should prefill the alert using the context metadata', async () => {
      const currentOptions = {
        filter: '',
        nodeType: 'host',
        customMetrics: [exampleCustomMetric],
        options: { metric: exampleCustomMetric },
        adHocDataViewList: [],
      };
      const { ruleParams } = await setup(currentOptions as AlertContextMeta);
      expect(ruleParams.nodeType).toBe('host');
      expect(ruleParams.filterQueryText).toBe('');
      expect(ruleParams.criteria).toEqual([
        {
          metric: 'custom',
          comparator: COMPARATORS.GREATER_THAN,
          threshold: [],
          timeSize: 1,
          timeUnit: 'm',
          customMetric: exampleCustomMetric,
        },
      ]);
    });
  });
});

describe('ExpressionRow', () => {
  async function setup(expression: InventoryMetricConditions) {
    const wrapper = mountWithIntl(
      <ExpressionRow
        nodeType="host"
        canDelete={false}
        remove={() => {}}
        addExpression={() => {}}
        key={1}
        expressionId={1}
        setRuleParams={() => {}}
        errors={{
          aggField: [],
          timeSizeUnit: [],
          timeWindowSize: [],
          metric: [],
        }}
        expression={expression}
        dataView={mockDataView}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update };
  }
  const expression = {
    metric: 'custom',
    comparator: COMPARATORS.GREATER_THAN,
    threshold: [],
    timeSize: 1,
    timeUnit: 'm',
    customMetric: exampleCustomMetric,
  };

  it('loads custom metrics passed in through the expression, even with an empty context', async () => {
    const { wrapper } = await setup(expression as InventoryMetricConditions);
    const [valueMatch] =
      wrapper
        .html()
        .match(
          '<span class="euiExpression__value css-1lfq7nz-euiExpression__value">Rate of some.system.field</span>'
        ) ?? [];
    expect(valueMatch).toBeTruthy();
  });
});
