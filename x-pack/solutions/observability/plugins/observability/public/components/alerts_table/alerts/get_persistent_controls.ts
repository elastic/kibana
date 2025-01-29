/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { type AlertsGroupingProps, useAlertsGroupingState } from '@kbn/alerts-grouping';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import { AlertsByGroupingAgg } from '../types';

interface GetPersistentControlsParams {
  groupingId: string;
  ruleTypeIds: string[];
  maxGroupingLevels?: number;
  services: Pick<
    AlertsGroupingProps<AlertsByGroupingAgg>['services'],
    'dataViews' | 'http' | 'notifications'
  >;
}

export const getPersistentControlsHook =
  ({
    groupingId,
    ruleTypeIds,
    maxGroupingLevels = 3,
    services: { dataViews, http, notifications },
  }: GetPersistentControlsParams) =>
  () => {
    const { grouping, updateGrouping } = useAlertsGroupingState(groupingId);

    const onGroupChange = useCallback(
      (selectedGroups: string[]) => {
        updateGrouping({
          activeGroups:
            grouping.activeGroups?.filter((g) => g !== 'none').concat(selectedGroups) ?? [],
        });
      },
      [grouping, updateGrouping]
    );

    const { dataView } = useAlertsDataView({
      ruleTypeIds,
      dataViewsService: dataViews,
      http,
      toasts: notifications.toasts,
    });

    const groupSelector = useGetGroupSelectorStateless({
      groupingId,
      onGroupChange,
      fields: dataView?.fields ?? [],
      defaultGroupingOptions:
        grouping.options?.filter((option) => !grouping.activeGroups.includes(option.key)) ?? [],
      maxGroupingLevels,
    });

    return useMemo(() => {
      return {
        right: groupSelector,
      };
    }, [groupSelector]);
  };
