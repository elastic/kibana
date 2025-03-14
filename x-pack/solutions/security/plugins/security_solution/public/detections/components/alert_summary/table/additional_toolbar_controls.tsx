/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TableId } from '@kbn/securitysolution-data-table';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import { useDispatch } from 'react-redux';
import { groupIdSelector } from '../../../../common/store/grouping/selectors';
import { updateGroups } from '../../../../common/store/grouping/actions';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

export interface RenderAdditionalToolbarControlsProps {
  /**
   *
   */
  dataView: DataView;
}

export const AdditionalToolbarControls = memo(
  ({ dataView }: RenderAdditionalToolbarControlsProps) => {
    const dispatch = useDispatch();

    const onGroupChange = useCallback(
      (selectedGroups: string[]) =>
        dispatch(
          updateGroups({ activeGroups: selectedGroups, tableId: TableId.alertsOnAlertSummaryPage })
        ),
      [dispatch]
    );
    const groupId = useMemo(() => groupIdSelector(), []);
    const { options: defaultGroupingOptions } = useDeepEqualSelector((state) =>
      groupId(state, TableId.alertsOnAlertSummaryPage)
    ) ?? {
      options: [],
    };
    const groupSelector = useGetGroupSelectorStateless({
      groupingId: TableId.alertsOnAlertSummaryPage,
      onGroupChange,
      fields: dataView.fields,
      defaultGroupingOptions,
      maxGroupingLevels: 3,
    });

    return <>{groupSelector}</>;
  }
);

AdditionalToolbarControls.displayName = 'AdditionalToolbarControls';
