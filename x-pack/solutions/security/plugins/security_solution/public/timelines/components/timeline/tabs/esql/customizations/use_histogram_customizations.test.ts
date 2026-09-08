/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../../../common/mock';
import type {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import { renderHook } from '@testing-library/react';
import type {
  ExtendedDiscoverStateContainer,
  UnifiedHistogramCustomization,
  DiscoverCustomization,
} from '@kbn/discover-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { WithPreventableEvent } from './use_histogram_customizations';
import { useHistogramCustomization } from './use_histogram_customizations';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { createStartServicesMock } from '../../../../../../common/lib/kibana/kibana_react.mock';
import {
  mockBrushEndCallbackEventData,
  mockOnMultiValueFilterCallbackEventData,
  mockOnSingleValueFilterCallbackEventData,
} from './mock.data';
import {
  getEventDataWithPreventableEvent,
  getMockCustomizationWithCustomSetFunction,
} from '../utils/test_utils';
import { useKibana } from '../../../../../../common/lib/kibana';
import { mockPreventDefault } from '../mocks';
import { SECURITY_ESQL_IN_TIMELINE_HISTOGRAM_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';

const mockDataService = dataPluginMock.createStartContract();

const mockUIActions = {
  ...uiActionsPluginMock.createStartContract(),
} as UiActionsStart;

jest.mock('../../../../../../common/lib/kibana');

const renderHookWithContext = () => {
  return renderHook(() => useHistogramCustomization(), {
    wrapper: TestProviders,
  });
};

const mockSetFunctionOnFilterCallbackWithSingleValueFilter = (
  histogramCustomization: DiscoverCustomization
) => {
  const { onFilter } = histogramCustomization as UnifiedHistogramCustomization;
  onFilter?.(
    getEventDataWithPreventableEvent(
      mockOnSingleValueFilterCallbackEventData as ClickTriggerEvent['data']
    )
  );
};

const mockSetFunctionOnFilterCallbackWithMultiValueFilter = (
  histogramCustomization: DiscoverCustomization
) => {
  const { onFilter } = histogramCustomization as UnifiedHistogramCustomization;
  onFilter?.(
    getEventDataWithPreventableEvent(
      mockOnMultiValueFilterCallbackEventData as MultiClickTriggerEvent['data']
    )
  );
};

const mockSetFunctionOnBrushEndCallback = (histogramCustomization: DiscoverCustomization) => {
  const { onBrushEnd } = histogramCustomization as UnifiedHistogramCustomization;
  onBrushEnd?.(
    getEventDataWithPreventableEvent(mockBrushEndCallbackEventData) as WithPreventableEvent<
      BrushTriggerEvent['data']
    >
  );
};

const mockStateContainer = {} as ExtendedDiscoverStateContainer;

describe('useHistogramCustomization', () => {
  const startServices = createStartServicesMock();
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...startServices,
        customDataService: mockDataService,
        uiActions: mockUIActions,
      },
    });
  });
  describe('onFilterCallback', () => {
    beforeEach(() => jest.clearAllMocks());
    it('should apply filter correctly, in case of single value click Trigger', async () => {
      (
        mockDataService.actions.createFiltersFromValueClickAction as jest.Mock
      ).mockResolvedValueOnce('some_filter');

      const renderHookResult = renderHookWithContext();

      const setHistogramCustomizationCallback = renderHookResult.result.current;

      const mockCustomization = getMockCustomizationWithCustomSetFunction(
        mockSetFunctionOnFilterCallbackWithSingleValueFilter
      );

      const callHistogramCustomization = async () => {
        setHistogramCustomizationCallback({
          customizations: mockCustomization,
          stateContainer: mockStateContainer,
        });
      };

      await callHistogramCustomization();

      expect(mockDataService.actions.createFiltersFromValueClickAction).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining(mockOnSingleValueFilterCallbackEventData)
      );

      expect(mockPreventDefault).toHaveBeenCalledTimes(1);

      expect(mockUIActions.executeTriggerActions).toHaveBeenCalledWith(
        SECURITY_ESQL_IN_TIMELINE_HISTOGRAM_TRIGGER,
        {
          filters: ['some_filter'],
        }
      );
    });

    it('should apply filter correctly, in case of multi value click Trigger', async () => {
      (
        mockDataService.actions.createFiltersFromMultiValueClickAction as jest.Mock
      ).mockResolvedValueOnce(['some_filter']);

      const renderHookResult = renderHookWithContext();

      const setHistogramCustomizationCallback = renderHookResult.result.current;

      const mockCustomization = getMockCustomizationWithCustomSetFunction(
        mockSetFunctionOnFilterCallbackWithMultiValueFilter
      );

      const callHistogramCustomization = async () => {
        setHistogramCustomizationCallback({
          customizations: mockCustomization,
          stateContainer: mockStateContainer,
        });
      };

      await callHistogramCustomization();

      expect(
        mockDataService.actions.createFiltersFromMultiValueClickAction
      ).toHaveBeenNthCalledWith(1, mockOnMultiValueFilterCallbackEventData);
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);

      expect(mockUIActions.executeTriggerActions).toHaveBeenCalledWith(
        SECURITY_ESQL_IN_TIMELINE_HISTOGRAM_TRIGGER,
        {
          filters: ['some_filter'],
        }
      );
    });
  });

  describe('onBrushEndCallback', () => {
    beforeEach(() => jest.clearAllMocks());
    it('should apply timerange in correctly in case of brush end event', async () => {
      const renderHookResult = renderHookWithContext();

      const setHistogramCustomizationCallback = renderHookResult.result.current;

      const mockCustomization = getMockCustomizationWithCustomSetFunction(
        mockSetFunctionOnBrushEndCallback
      );

      const callHistogramCustomization = async () => {
        setHistogramCustomizationCallback({
          customizations: mockCustomization,
          stateContainer: mockStateContainer,
        });
      };

      await callHistogramCustomization();

      expect(mockDataService.query.timefilter.timefilter.setTime).toHaveBeenNthCalledWith(1, {
        from: '2023-07-02T06:38:44.909Z',
        mode: 'absolute',
        to: '2023-08-17T01:00:58.529Z',
      });

      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });
  });
});
