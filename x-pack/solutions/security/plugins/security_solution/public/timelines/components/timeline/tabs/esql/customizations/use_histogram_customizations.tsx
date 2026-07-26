/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import type { CustomizationCallback } from '@kbn/discover-plugin/public';
import type { UseUnifiedHistogramProps } from '@kbn/unified-histogram';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import { useCallback } from 'react';
import { SECURITY_ESQL_IN_TIMELINE_HISTOGRAM_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { useKibana } from '../../../../../../common/lib/kibana';

export type WithPreventableEvent<T> = T & {
  preventDefault(): void;
};

export type ClickTriggerEventData = ClickTriggerEvent['data'] | MultiClickTriggerEvent['data'];

type CustomClickTriggerEvent = WithPreventableEvent<ClickTriggerEventData>;

const isClickTriggerEvent = (
  e: CustomClickTriggerEvent
): e is WithPreventableEvent<ClickTriggerEvent['data']> => {
  return Array.isArray(e.data) && 'column' in e.data[0];
};

const isMultiValueTriggerEvent = (
  e: CustomClickTriggerEvent
): e is WithPreventableEvent<MultiClickTriggerEvent['data']> => {
  return Array.isArray(e.data) && 'cells' in e.data[0];
};

export const useHistogramCustomization = () => {
  const {
    services: { customDataService: discoverDataService, uiActions },
  } = useKibana();

  const onFilterCallback: UseUnifiedHistogramProps['onFilter'] = useCallback(
    async (eventData: WithPreventableEvent<CustomClickTriggerEvent>) => {
      if (eventData.preventDefault) eventData.preventDefault();
      let filters;

      if (isClickTriggerEvent(eventData)) {
        filters = await discoverDataService.actions.createFiltersFromValueClickAction({
          data: eventData.data,
          negate: eventData.negate ?? false,
        });
      } else if (isMultiValueTriggerEvent(eventData)) {
        filters = await discoverDataService.actions.createFiltersFromMultiValueClickAction({
          data: eventData.data,
          negate: eventData.negate,
        });
      } else {
        // no-op
        return;
      }

      if (filters && !Array.isArray(filters)) {
        filters = [filters];
      }

      if (filters && filters.length > 0) {
        await uiActions.executeTriggerActions(SECURITY_ESQL_IN_TIMELINE_HISTOGRAM_TRIGGER, {
          filters,
          timeFieldName: eventData.timeFieldName,
        });
      }
    },
    [uiActions, discoverDataService.actions]
  );

  const onBrushEndCallback: UseUnifiedHistogramProps['onBrushEnd'] = useCallback(
    (data: WithPreventableEvent<BrushTriggerEvent['data']>) => {
      discoverDataService.query.timefilter.timefilter.setTime({
        from: new Date(data.range[0]).toISOString(),
        to: new Date(data.range[1]).toISOString(),
        mode: 'absolute',
      });
      if (data.preventDefault) data.preventDefault();
    },
    [discoverDataService.query.timefilter.timefilter]
  );

  const setHistogramCustomizationCallback: CustomizationCallback = useCallback(
    ({ customizations }) => {
      customizations.set({
        id: 'unified_histogram',
        onFilter: onFilterCallback,
        onBrushEnd: onBrushEndCallback,
        withDefaultActions: false,
        disabledActions: [ACTION_GLOBAL_APPLY_FILTER],
      });
    },
    [onFilterCallback, onBrushEndCallback]
  );

  return setHistogramCustomizationCallback;
};
