/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock as mockUnifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { InventoryMetricConditions } from '../../../../common/alerting/metrics';
import type { AlertContextMeta } from './expression';
import { defaultExpression, ExpressionRow, Expressions, type ExpressionsProps } from './expression';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { useIsPodSchemaSelectorEnabled } from '../../../hooks/use_is_pod_schema_selector_enabled';
import type { ResolvedDataView } from '../../../utils/data_view';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import type { SnapshotCustomMetricInput } from '../../../../common/http_api';

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

jest.mock('../../../containers/metrics_source', () => ({
  withSourceProvider: () => jest.fn,
  useSourceContext: () => ({
    source: { id: 'default' },
  }),
  useMetricsDataViewContext: () => ({
    metricsView: {
      indices: 'metricbeat-*',
      timeFieldName: mockDataView.timeFieldName,
      fields: mockDataView.fields,
      dataViewReference: mockDataView,
    } as ResolvedDataView,
    loading: false,
    error: undefined,
  }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      ...mockCoreMock.createStart(),
      unifiedSearch: mockUnifiedSearchPluginMock.createStartContract(),
    },
  }),
}));

jest.mock('../../../hooks/use_is_pod_schema_selector_enabled', () => ({
  useIsPodSchemaSelectorEnabled: jest.fn(() => false),
}));
const exampleCustomMetric = {
  id: 'this-is-an-id',
  field: 'some.system.field',
  aggregation: 'rate',
  type: 'custom',
} as SnapshotCustomMetricInput;

const dataViewMock = dataViewPluginMocks.createStartContract();

const mockedUseIsPodSchemaSelectorEnabled = useIsPodSchemaSelectorEnabled as jest.MockedFunction<
  typeof useIsPodSchemaSelectorEnabled
>;

describe('Expression', () => {
  beforeEach(() => {
    mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(false);
  });

  async function setup(currentOptions: AlertContextMeta) {
    const ruleParams: {
      criteria: unknown[];
      nodeType: InventoryItemType | undefined;
      filterQueryText: string;
      schema?: DataSchemaFormat | null;
    } = {
      criteria: [],
      nodeType: undefined,
      filterQueryText: '',
    };
    const wrapper = mountWithIntl(
      <Expressions
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams as any}
        errors={{}}
        setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
        setRuleProperty={() => {}}
        metadata={currentOptions}
        dataViews={dataViewMock}
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
      filter: 'foo',
      nodeType: 'pod',
      customMetrics: [],
      options: { metric: { type: 'memory' } },
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
    const ruleParams = {
      criteria: [
        {
          metric: 'cpuV2',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [10],
          comparator: COMPARATORS.GREATER_THAN,
        },
      ],
      nodeType: undefined,
      filterQueryText: 'host.name: "testHostName"',
      filterQuery:
        '{"bool":{"should":[{"match_phrase":{"host.name":"testHostName"}}],"minimum_should_match":1}}',
    };

    const wrapper = shallowWithIntl(
      <Expressions
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams as any}
        errors={{}}
        setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
        setRuleProperty={() => {}}
        metadata={{}}
        dataViews={dataViewMock}
      />
    );

    const chart = wrapper.find('[data-test-subj="preview-chart"]');

    expect(chart.prop('kuery')).toBe(ruleParams.filterQueryText);
  });

  function renderShallow(ruleParams: Partial<ExpressionsProps['ruleParams']>) {
    const params: ExpressionsProps['ruleParams'] = {
      criteria: [
        {
          metric: 'cpuV2',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [10],
          comparator: COMPARATORS.GREATER_THAN,
        },
      ],
      filterQueryText: '',
      sourceId: 'default',
      ...ruleParams,
    } as ExpressionsProps['ruleParams'];

    const wrapper = shallowWithIntl(
      <Expressions
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={params}
        errors={{}}
        setRuleParams={(key, value) => Reflect.set(params, key, value)}
        setRuleProperty={() => {}}
        metadata={{}}
        dataViews={dataViewMock}
      />
    );

    return { wrapper, params };
  }

  function previewSchema(ruleParams: Pick<ExpressionsProps['ruleParams'], 'nodeType' | 'schema'>) {
    const { wrapper, params } = renderShallow(ruleParams);

    return {
      schema: wrapper.find('[data-test-subj="preview-chart"]').prop('schema'),
      storedSchema: params.schema,
    };
  }

  const hasSchemaControl = (ruleParams: Partial<ExpressionsProps['ruleParams']>) =>
    renderShallow(ruleParams).wrapper.exists('[data-test-subj="schemaExpressionSelect"]');

  it('previews a pod rule as ecs without rewriting a stored semconv schema', () => {
    const preview = previewSchema({ nodeType: 'pod', schema: 'semconv' });

    expect(preview.schema).toBe('ecs');
    expect(preview.storedSchema).toBe('semconv');
  });

  it('keeps a host preview on the saved schema', () => {
    expect(previewSchema({ nodeType: 'host', schema: 'semconv' }).schema).toBe('semconv');
  });

  it('does not invent a schema for a host rule that has none', () => {
    expect(previewSchema({ nodeType: 'host' }).schema).toBeUndefined();
  });

  describe('Schema control', () => {
    it('is shown for hosts regardless of the pod flag', () => {
      expect(hasSchemaControl({ nodeType: 'host' })).toBe(true);

      mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);
      expect(hasSchemaControl({ nodeType: 'host' })).toBe(true);
    });

    it('is hidden for pods while the pod flag is off', () => {
      expect(hasSchemaControl({ nodeType: 'pod' })).toBe(false);
    });

    it('is shown for pods once the pod flag is on', () => {
      mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);

      expect(hasSchemaControl({ nodeType: 'pod' })).toBe(true);
    });

    it('stays hidden for node types that have no schema selector', () => {
      mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);

      expect(hasSchemaControl({ nodeType: 'container' })).toBe(false);
      expect(hasSchemaControl({ nodeType: 'awsEC2' })).toBe(false);
    });

    it('previews a pod rule on the selected schema once the pod flag is on', () => {
      mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);

      expect(previewSchema({ nodeType: 'pod', schema: 'semconv' }).schema).toBe('semconv');
      expect(previewSchema({ nodeType: 'pod', schema: 'ecs' }).schema).toBe('ecs');
    });

    it('prefills a pod schema from the waffle once the pod flag is on', async () => {
      mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);

      const { ruleParams } = await setup({
        nodeType: 'pod',
        schema: 'semconv',
      } as AlertContextMeta);

      expect(ruleParams.schema).toBe('semconv');
    });

    it('does not prefill a pod schema while the pod flag is off', async () => {
      const { ruleParams } = await setup({
        nodeType: 'pod',
        schema: 'semconv',
      } as AlertContextMeta);

      expect(ruleParams.schema).toBeUndefined();
    });

    it('drops the schema when For moves to a node type without a selector', () => {
      mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);

      const { wrapper, params } = renderShallow({ nodeType: 'host', schema: 'semconv' });

      wrapper.find('[data-test-subj="forExpressionSelect"]').simulate('change', 'container');

      expect(params.nodeType).toBe('container');
      expect(params.schema).toBeNull();
    });

    it('keeps the schema when For moves between node types that both have a selector', () => {
      mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);

      const { wrapper, params } = renderShallow({ nodeType: 'host', schema: 'semconv' });

      wrapper.find('[data-test-subj="forExpressionSelect"]').simulate('change', 'pod');

      expect(params.nodeType).toBe('pod');
      expect(params.schema).toBe('semconv');
    });
  });

  describe('using custom metrics', () => {
    it('should prefill the alert using the context metadata', async () => {
      const currentOptions = {
        filter: '',
        nodeType: 'tx',
        customMetrics: [exampleCustomMetric],
        options: { metric: exampleCustomMetric },
      };
      const { ruleParams, update } = await setup(currentOptions as AlertContextMeta);
      await update();
      expect(ruleParams.nodeType).toBe('tx');
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

  it('should include inclusive range comparators in threshold options', async () => {
    const { wrapper, update } = await setup(expression as InventoryMetricConditions);
    wrapper.find('button[data-test-subj="thresholdPopover"]').simulate('click');
    await update();

    const comparatorOptionValues = wrapper
      .find('select[data-test-subj="comparatorOptionsComboBox"] option')
      .map((option) => option.prop('value'));

    expect(comparatorOptionValues).toContain(COMPARATORS.BETWEEN_INCLUSIVE);
    expect(comparatorOptionValues).toContain(COMPARATORS.NOT_BETWEEN_INCLUSIVE);
  });
});
