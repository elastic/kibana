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
import { unifiedSearchPluginMock as mockUnifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { MetricsExplorerMetric } from '../../../../common/http_api/metrics_explorer';
import { Expressions, getNoDataBehaviorValue } from './expression';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import type { ResolvedDataView } from '../../../utils/data_view';

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: TIMESTAMP_FIELD,
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

describe('Expression', () => {
  async function setup(currentOptions: {
    metrics?: MetricsExplorerMetric[];
    filterQuery?: string;
    groupBy?: string;
  }) {
    const ruleParams = {
      criteria: [],
      groupBy: undefined,
      filterQueryText: '',
      sourceId: 'default',
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
        }}
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

describe('getNoDataBehaviorValue', () => {
  const baseRuleParams = {
    criteria: [],
    groupBy: undefined,
    filterQueryText: '',
    sourceId: 'default',
  };

  describe('when noDataBehavior is set', () => {
    it('should return the noDataBehavior value', () => {
      expect(
        getNoDataBehaviorValue({ ...baseRuleParams, noDataBehavior: 'alertOnNoData' }, false)
      ).toBe('alertOnNoData');
      expect(getNoDataBehaviorValue({ ...baseRuleParams, noDataBehavior: 'recover' }, true)).toBe(
        'recover'
      );
      expect(
        getNoDataBehaviorValue({ ...baseRuleParams, noDataBehavior: 'remainActive' }, false)
      ).toBe('remainActive');
    });

    it('should ignore legacy params when noDataBehavior is set', () => {
      expect(
        getNoDataBehaviorValue(
          { ...baseRuleParams, noDataBehavior: 'recover', alertOnNoData: true },
          false
        )
      ).toBe('recover');
      expect(
        getNoDataBehaviorValue(
          { ...baseRuleParams, noDataBehavior: 'alertOnNoData', alertOnGroupDisappear: false },
          true
        )
      ).toBe('alertOnNoData');
      expect(
        getNoDataBehaviorValue(
          {
            ...baseRuleParams,
            noDataBehavior: 'remainActive',
            alertOnNoData: true,
            alertOnGroupDisappear: true,
          },
          true
        )
      ).toBe('remainActive');
      expect(
        getNoDataBehaviorValue(
          {
            ...baseRuleParams,
            noDataBehavior: 'remainActive',
            alertOnNoData: false,
            alertOnGroupDisappear: false,
          },
          false
        )
      ).toBe('remainActive');
      expect(
        getNoDataBehaviorValue(
          {
            ...baseRuleParams,
            noDataBehavior: 'recover',
            alertOnNoData: true,
            alertOnGroupDisappear: true,
          },
          true
        )
      ).toBe('recover');
      expect(
        getNoDataBehaviorValue(
          {
            ...baseRuleParams,
            noDataBehavior: 'alertOnNoData',
            alertOnNoData: false,
            alertOnGroupDisappear: true,
          },
          false
        )
      ).toBe('alertOnNoData');
      expect(
        getNoDataBehaviorValue(
          {
            ...baseRuleParams,
            noDataBehavior: 'alertOnNoData',
            alertOnNoData: false,
            alertOnGroupDisappear: false,
          },
          true
        )
      ).toBe('alertOnNoData');
    });
  });

  describe('when noDataBehavior is not set (legacy params)', () => {
    describe('with groupBy', () => {
      it('should return alertOnNoData when alertOnGroupDisappear is true', () => {
        expect(
          getNoDataBehaviorValue({ ...baseRuleParams, alertOnGroupDisappear: true }, true)
        ).toBe('alertOnNoData');
      });

      it('should return recover when alertOnGroupDisappear is false', () => {
        expect(
          getNoDataBehaviorValue({ ...baseRuleParams, alertOnGroupDisappear: false }, true)
        ).toBe('recover');
      });

      it('should return recover when alertOnGroupDisappear is undefined', () => {
        expect(getNoDataBehaviorValue({ ...baseRuleParams }, true)).toBe('recover');
      });

      it('should return alertOnNoData when alertOnGroupDisappear is true and alertOnNoData is true', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnGroupDisappear: true, alertOnNoData: true },
            true
          )
        ).toBe('alertOnNoData');
      });

      it('should return alertOnNoData when alertOnGroupDisappear is true and alertOnNoData is false', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnGroupDisappear: true, alertOnNoData: false },
            true
          )
        ).toBe('alertOnNoData');
      });

      it('should return recover when alertOnGroupDisappear is false and alertOnNoData is true', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnGroupDisappear: false, alertOnNoData: true },
            true
          )
        ).toBe('recover');
      });

      it('should return recover when alertOnGroupDisappear and alertOnNoData are undefined', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnGroupDisappear: undefined, alertOnNoData: undefined },
            true
          )
        ).toBe('recover');
      });
    });

    describe('without groupBy', () => {
      it('should return alertOnNoData when alertOnNoData is true', () => {
        expect(getNoDataBehaviorValue({ ...baseRuleParams, alertOnNoData: true }, false)).toBe(
          'alertOnNoData'
        );
      });

      it('should return recover when alertOnNoData is false', () => {
        expect(getNoDataBehaviorValue({ ...baseRuleParams, alertOnNoData: false }, false)).toBe(
          'recover'
        );
      });

      it('should return recover when alertOnNoData is undefined', () => {
        expect(getNoDataBehaviorValue({ ...baseRuleParams }, false)).toBe('recover');
      });

      it('should return alertOnNoData when alertOnNoData is true and alertOnGroupDisappear is true', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnNoData: true, alertOnGroupDisappear: true },
            false
          )
        ).toBe('alertOnNoData');
      });

      it('should return recover when alertOnNoData is false and alertOnGroupDisappear is true', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnNoData: false, alertOnGroupDisappear: true },
            false
          )
        ).toBe('recover');
      });

      it('should return recover when alertOnNoData is true and alertOnGroupDisappear is false', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnNoData: true, alertOnGroupDisappear: false },
            false
          )
        ).toBe('alertOnNoData');
      });

      it('should return recover when alertOnNoData and alertOnGroupDisappear are undefined', () => {
        expect(
          getNoDataBehaviorValue(
            { ...baseRuleParams, alertOnNoData: undefined, alertOnGroupDisappear: undefined },
            false
          )
        ).toBe('recover');
      });
    });
  });
});
