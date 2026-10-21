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
import type { ResolvedDataView } from '../../../utils/data_view';
import { DEFAULT_SCHEMA, TIMESTAMP_FIELD } from '../../../../common/constants';
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

const exampleCustomMetric = {
  id: 'this-is-an-id',
  field: 'some.system.field',
  aggregation: 'rate',
  type: 'custom',
} as SnapshotCustomMetricInput;

const dataViewMock = dataViewPluginMocks.createStartContract();

describe('Expression', () => {
  async function setup(
    currentOptions: AlertContextMeta,
    options?: {
      id?: string;
      initialRuleParams?: Partial<{
        nodeType: InventoryItemType | undefined;
        schema: DataSchemaFormat | null;
      }>;
    }
  ) {
    const ruleParams: {
      criteria: unknown[];
      nodeType: InventoryItemType | undefined;
      filterQueryText: string;
      schema?: DataSchemaFormat | null;
    } = {
      criteria: [],
      nodeType: undefined,
      filterQueryText: '',
      ...options?.initialRuleParams,
    };
    const wrapper = mountWithIntl(
      <Expressions
        id={options?.id}
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

  const selectedSchema = (ruleParams: Partial<ExpressionsProps['ruleParams']>) =>
    renderShallow(ruleParams)
      .wrapper.find('[data-test-subj="schemaExpressionSelect"]')
      .prop('value');

  it('previews a pod rule on the stored schema without rewriting it', () => {
    const preview = previewSchema({ nodeType: 'pod', schema: 'semconv' });

    expect(preview.schema).toBe('semconv');
    expect(preview.storedSchema).toBe('semconv');
  });

  it('keeps a host preview on the saved schema', () => {
    expect(previewSchema({ nodeType: 'host', schema: 'semconv' }).schema).toBe('semconv');
  });

  it('leaves the preview schema omitted for a host rule that has none', () => {
    expect(previewSchema({ nodeType: 'host' }).schema).toBeUndefined();
  });

  describe('Schema control', () => {
    it('is shown for hosts', () => {
      expect(hasSchemaControl({ nodeType: 'host' })).toBe(true);
    });

    it('is shown for pods', () => {
      expect(hasSchemaControl({ nodeType: 'pod' })).toBe(true);
    });

    it('stays hidden for node types that have no schema selector', () => {
      expect(hasSchemaControl({ nodeType: 'container' })).toBe(false);
      expect(hasSchemaControl({ nodeType: 'awsEC2' })).toBe(false);
    });

    it('previews a pod rule on the selected schema', () => {
      expect(previewSchema({ nodeType: 'pod', schema: 'semconv' }).schema).toBe('semconv');
      expect(previewSchema({ nodeType: 'pod', schema: 'ecs' }).schema).toBe('ecs');
    });

    it('treats a pod rule without a stored schema like a host rule without one', () => {
      expect(selectedSchema({ nodeType: 'pod' })).toBe(DEFAULT_SCHEMA);
      expect(previewSchema({ nodeType: 'pod' }).schema).toBeUndefined();
    });

    it('shows the stored schema of a pod rule', () => {
      expect(selectedSchema({ nodeType: 'pod', schema: 'semconv' })).toBe('semconv');
      expect(selectedSchema({ nodeType: 'pod', schema: 'ecs' })).toBe('ecs');
    });

    it('falls back to the default schema for a host rule that has none', () => {
      expect(selectedSchema({ nodeType: 'host' })).toBe(DEFAULT_SCHEMA);
      expect(selectedSchema({ nodeType: 'host', schema: 'ecs' })).toBe('ecs');
    });

    it('stores the schema picked in the schema control for a pod rule', () => {
      const { wrapper, params } = renderShallow({ nodeType: 'pod', schema: 'semconv' });

      wrapper.find('[data-test-subj="schemaExpressionSelect"]').simulate('change', 'ecs');

      expect(params.schema).toBe('ecs');
      expect(params.nodeType).toBe('pod');
    });

    it('stores the schema picked in the schema control for a host rule that has none', () => {
      const { wrapper, params } = renderShallow({ nodeType: 'host' });

      wrapper.find('[data-test-subj="schemaExpressionSelect"]').simulate('change', 'semconv');

      expect(params.schema).toBe('semconv');
    });

    it('prefills a pod schema from the waffle', async () => {
      const { ruleParams } = await setup({
        nodeType: 'pod',
        schema: 'semconv',
      } as AlertContextMeta);

      expect(ruleParams.schema).toBe('semconv');
    });

    it('persists the default schema when creating a new host rule without touching the selector', async () => {
      const { ruleParams } = await setup({ nodeType: 'host' } as AlertContextMeta);

      expect(ruleParams.schema).toBe(DEFAULT_SCHEMA);
    });

    it('persists the default schema when creating a new pod rule without touching the selector', async () => {
      const { ruleParams } = await setup({ nodeType: 'pod' } as AlertContextMeta);

      expect(ruleParams.schema).toBe(DEFAULT_SCHEMA);
    });

    it('defaults the schema when opening an existing rule that has none', async () => {
      const { ruleParams } = await setup({} as AlertContextMeta, {
        id: 'existing-rule-id',
        initialRuleParams: { nodeType: 'host', schema: undefined },
      });

      expect(ruleParams.schema).toBe(DEFAULT_SCHEMA);
    });

    it('keeps the stored schema when opening an existing rule', async () => {
      const { ruleParams } = await setup({} as AlertContextMeta, {
        id: 'existing-rule-id',
        initialRuleParams: { nodeType: 'host', schema: 'ecs' },
      });

      expect(ruleParams.schema).toBe('ecs');
    });

    it('does not default the schema when opening an existing container rule that has none', async () => {
      const { ruleParams } = await setup({} as AlertContextMeta, {
        id: 'existing-rule-id',
        initialRuleParams: { nodeType: 'container', schema: undefined },
      });

      expect(ruleParams.schema).toBeUndefined();
    });

    const NON_SCHEMA_AWARE_NODE_TYPES: InventoryItemType[] = [
      'container',
      'awsEC2',
      'awsS3',
      'awsRDS',
      'awsSQS',
    ];

    it.each(NON_SCHEMA_AWARE_NODE_TYPES)(
      'omits the schema when rule is selected for: %s',
      (nodeType) => {
        const { wrapper, params } = renderShallow({ nodeType: 'host', schema: 'semconv' });

        wrapper.find('[data-test-subj="forExpressionSelect"]').simulate('change', nodeType);

        expect(params.nodeType).toBe(nodeType);
        expect(params.schema).not.toBeNull();
        expect(params.schema).toBeUndefined();
      }
    );

    it('keeps the schema when rule is selected For another node type that has a selector', () => {
      const { wrapper, params } = renderShallow({ nodeType: 'host', schema: 'semconv' });

      wrapper.find('[data-test-subj="forExpressionSelect"]').simulate('change', 'pod');

      expect(params.nodeType).toBe('pod');
      expect(params.schema).toBe('semconv');
    });
  });

  describe('Node type change', () => {
    const changeNodeType = async (
      wrapper: ReturnType<typeof renderShallow>['wrapper'],
      nodeType: string
    ) => {
      await act(async () => {
        wrapper.find('[data-test-subj="forExpressionSelect"]').simulate('change', nodeType);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    it('clears the metric when the node type changes', async () => {
      const { wrapper, params } = renderShallow({ nodeType: 'host' });

      await changeNodeType(wrapper, 'pod');

      expect(params.criteria[0].metric).toBeUndefined();
    });

    it('clears a custom metric too', async () => {
      const { wrapper, params } = renderShallow({
        nodeType: 'host',
        criteria: [
          {
            metric: 'custom',
            customMetric: exampleCustomMetric,
            timeSize: 1,
            timeUnit: 'm',
            threshold: [10],
            comparator: COMPARATORS.GREATER_THAN,
          },
        ],
      });

      await changeNodeType(wrapper, 'pod');

      expect(params.criteria[0].metric).toBeUndefined();
    });

    it('adds a new condition without a metric for non-host node types', () => {
      const { wrapper, params } = renderShallow({ nodeType: 'pod' });

      wrapper.find('[data-test-subj="infraExpressionsAddConditionButton"]').simulate('click');

      expect(params.criteria).toHaveLength(2);
      expect(params.criteria[1].metric).toBeUndefined();
    });

    it('adds a new condition with the default metric for hosts', () => {
      const { wrapper, params } = renderShallow({ nodeType: 'host' });

      wrapper.find('[data-test-subj="infraExpressionsAddConditionButton"]').simulate('click');

      expect(params.criteria).toHaveLength(2);
      expect(params.criteria[1].metric).toBe(defaultExpression.metric);
    });

    it('does not render the preview chart without a metric', () => {
      const { wrapper } = renderShallow({
        nodeType: 'pod',
        criteria: [
          {
            timeSize: 1,
            timeUnit: 'm',
            threshold: [10],
            comparator: COMPARATORS.GREATER_THAN,
            metric: undefined,
          },
        ],
      });

      expect(wrapper.exists('[data-test-subj="preview-chart"]')).toBe(false);
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
  async function setup(
    expression: Omit<InventoryMetricConditions, 'metric'> & {
      metric?: InventoryMetricConditions['metric'];
    },
    setRuleParams: () => void = () => {},
    nodeType: InventoryItemType = 'host'
  ) {
    const wrapper = mountWithIntl(
      <ExpressionRow
        nodeType={nodeType}
        canDelete={false}
        remove={() => {}}
        addExpression={() => {}}
        key={1}
        expressionId={1}
        setRuleParams={setRuleParams}
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
