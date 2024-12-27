/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';
import { waitFor, renderHook } from '@testing-library/react';
import { useLensAttributes } from './use_lens_attributes';
import { coreMock } from '@kbn/core/public/mocks';
import { type KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import type { InfraClientStartDeps } from '../types';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { FilterStateStore } from '@kbn/es-query';
import type { LensBaseLayer, LensConfig } from '@kbn/lens-embeddable-utils/config_builder';

import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';

jest.mock('@kbn/kibana-react-plugin/public');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
jest.mock('@kbn/lens-embeddable-utils/config_builder');
const LensConfigBuilderMock = LensConfigBuilder as jest.MockedClass<typeof LensConfigBuilder>;

const normalizedLoad1m: LensBaseLayer = {
  label: 'Normalized Load',
  value: 'average(system.load.1) / max(system.load.cores)',
  format: 'percent',
  decimals: 0,
};

const lensPluginMockStart = lensPluginMock.createStartContract();
const mockUseKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      dataViews: { ...dataViewPluginMocks.createStartContract() },
      lens: { ...lensPluginMockStart },
    } as Partial<CoreStart> & Partial<InfraClientStartDeps>,
  } as unknown as KibanaReactContextValue<Partial<CoreStart> & Partial<InfraClientStartDeps>>);
};

describe('useLensAttributes hook', () => {
  const params: LensConfig = {
    chartType: 'xy',
    layers: [
      {
        type: 'series',
        yAxis: [normalizedLoad1m],
        xAxis: '@timestamp',
        seriesType: 'line',
      },
      {
        type: 'reference',
        yAxis: [
          {
            value: '1',
          },
        ],
      },
    ],
    title: 'Injected Normalized Load',
    dataset: {
      index: 'mock-id',
    },
  };
  beforeEach(() => {
    mockUseKibana();
  });

  it('should return the basic lens attributes', async () => {
    renderHook(() => useLensAttributes(params));
    await waitFor(() =>
      expect(LensConfigBuilderMock.mock.instances[0].build).toHaveBeenCalledWith(params)
    );
  });

  it('should return extra actions', async () => {
    const { result } = renderHook(() => useLensAttributes(params));
    await waitFor(() => new Promise((resolve) => resolve(null)));

    const extraActions = result.current.getExtraActions({
      timeRange: {
        from: 'now-15m',
        to: 'now',
        mode: 'relative',
      },
      query: {
        language: 'kuery',
        query: '{term: { host.name: "a"}}',
      },
      filters: [
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            alias: null,
            disabled: false,
            index: 'c1ec8212-ecee-494a-80da-f6f33b3393f2',
            key: 'system.load.cores',
            negate: false,
            type: 'range',
            value: 'range',
          },
          query: { range: { 'system.load.cores': { gte: 0 } } },
        },
      ],
    });

    expect(extraActions).toHaveLength(1);
  });
});
