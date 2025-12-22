/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useAlertsGroupingState } from '@kbn/alerts-grouping';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';

interface GroupingToolbarControlsProps {
  groupingId: string;
  ruleTypeIds: string[];
  maxGroupingLevels?: number;
  services: {
    dataViews: DataViewsPublicPluginStart;
    http: HttpSetup;
    notifications: { toasts: ToastsStart };
  };
}

export const GroupingToolbarControls = React.memo<GroupingToolbarControlsProps>(
  ({ groupingId, ruleTypeIds, maxGroupingLevels = 3, services }) => {
    const { dataViews, http, notifications } = services;
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

    return useGetGroupSelectorStateless({
      groupingId,
      onGroupChange,
      fields: dataView?.fields ?? [],
      defaultGroupingOptions:
        grouping.options?.filter((option) => !grouping.activeGroups.includes(option.key)) ?? [],
      maxGroupingLevels,
    });
  }
);
