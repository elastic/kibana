/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Props } from './chart_context_menu';
import { MetricsExplorerChartContextMenu } from './chart_context_menu';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { options, timeRange, chartOptions } from '../../../../utils/fixtures/metrics_explorer';
import type { Capabilities } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { MetricsDataViewProvider, SourceProvider } from '../../../../containers/metrics_source';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ResolvedDataView } from '../../../../utils/data_view';

const coreStartMock = coreMock.createStart();

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: TIMESTAMP_FIELD,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as jest.Mocked<DataView>;

const series = { id: 'example-01', rows: [], columns: [] };
const uiCapabilities: Capabilities = {
  navLinks: { show: false },
  management: { fake: { show: false } },
  catalogue: { show: false },
  visualize_v2: { show: true },
  infrastructure: { save: true },
};

jest.mock('../../../../containers/metrics_source', () => ({
  SourceProvider: jest.fn(({ children }) => <>{children}</>),
  MetricsDataViewProvider: jest.fn(({ children }) => <>{children}</>),
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

const getTestSubject = (component: ReactWrapper, name: string) => {
  return component.find(`[data-test-subj="${name}"]`).hostNodes();
};

const mountComponentWithProviders = (props: Props): ReactWrapper => {
  return mount(
    <KibanaContextProvider services={{ ...coreStartMock }}>
      <SourceProvider sourceId="default">
        <MetricsDataViewProvider>
          <MetricsExplorerChartContextMenu {...props} />
        </MetricsDataViewProvider>
      </SourceProvider>
    </KibanaContextProvider>
  );
};

jest.mock(
  '@kbn/metrics-data-access-plugin/public/pages/link_to/use_asset_details_redirect',
  () => ({
    useAssetDetailsRedirect: jest.fn(() => ({
      getAssetDetailUrl: jest.fn(() => ({
        onClick: jest.fn(),
        href: '/ftw/app/r?l=ASSET_DETAILS_LOCATOR&v=8.15.0&lz=N4IghgzhCmAuAicwEsA2EQC5gF8A0IA%2BmFqLMgLbSkgBmATgPYVYgCMA7GwCwAMArADZB3NgCZBADhAFYjVpx69BvMaInSc%2BcFDgAVAJ4AHaphAALRhFgydMWAEkAJqwBUt62FinQjesgBzZAA7AEEjI2dWKlh%2FAGMMAj9AkIBlaDB6OPNWAH4Y%2BIgAUQAPI1Q%2FaHoAXgAKbMzYAHkjckZgiExazziAa0wAQlo8WGNoTFQQ6DwDUJLkCABZRidxhmYALSrGAEo8Rlbkds7asACA%2BmgAryPgzDAANwC8AuQEwdrT88vrtrvH55xRgVeiYIEg3h4WjIaCoJyYCAGazQCgAOjiRgArqi5LAwKhUcE%2FGijHFYHsvhcrjd2vcnnhwX4wcC%2FGwoTC4ZhepiAEZVYJwaAQVFGFborGozEQM7QQkrWWk8l4Sk%2FGn%2FemM0GasTs2HwpyMPpVcXY3H4kVknZ7CCMTFZcarWhgTGoJXkKj0MDBALjWrrCiYIkAdwAtGxzHgQt56A98ZgAKQAZiKSfgbF4EBGjEDjCDVoAZK8EqVypV6AA1GFB5zVADkvFrtmSQWCAAUvOZgmAqKwAPTQMogqogLRAA%3D',
      })),
    })),
  })
);

describe('MetricsExplorerChartContextMenu', () => {
  describe('component', () => {
    it('should just work', async () => {
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        series,
        options,
        onFilter,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(1);
      expect(getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').length).toBe(1);
      expect(getTestSubject(component, 'metricsExplorerAction-ViewNodeMetrics').length).toBe(1);
    });

    it('should not display View metrics for incompatible groupBy', async () => {
      const customOptions = { ...options, groupBy: 'system.network.name' };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        series,
        options: customOptions,
        onFilter,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-ViewNodeMetrics').length).toBe(0);
    });

    it('should not display "Add Filter" without onFilter', async () => {
      const component = mountComponentWithProviders({
        timeRange,
        series,
        options,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(0);
    });

    it('should not display "Add Filter" without options.groupBy', async () => {
      const customOptions = { ...options, groupBy: void 0 };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        series,
        options: customOptions,
        onFilter,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(0);
    });

    it('should disable "Open in Visualize" when options.metrics is empty', async () => {
      const customOptions = { ...options, metrics: [] };
      const component = mountComponentWithProviders({
        timeRange,
        series,
        options: customOptions,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(
        getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').prop('disabled')
      ).toBeTruthy();
    });

    it('should not display "Open in Visualize" when unavailble in uiCapabilities', async () => {
      const customUICapabilities = { ...uiCapabilities, visualize_v2: { show: false } };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        series,
        options,
        onFilter,
        uiCapabilities: customUICapabilities,
        chartOptions,
      });

      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').length).toBe(0);
    });

    it('should not display anything when Visualize is disabled and there are no group bys.', async () => {
      const customUICapabilities = { ...uiCapabilities, visualize_v2: { show: false } };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const customOptions = { ...options, groupBy: void 0 };
      const component = mountComponentWithProviders({
        timeRange,
        series,
        options: customOptions,
        onFilter,
        uiCapabilities: customUICapabilities,
        chartOptions,
      });
      expect(component.find('button').length).toBe(1);
    });
  });
});
