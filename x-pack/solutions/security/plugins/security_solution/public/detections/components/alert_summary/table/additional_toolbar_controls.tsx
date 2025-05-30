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

const TABLE_ID = TableId.alertsOnAlertSummaryPage;
const MAX_GROUPING_LEVELS = 3;
const NO_OPTIONS = { options: [] };

export interface RenderAdditionalToolbarControlsProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
}

/**
 * Renders a button that when clicked shows a dropdown to allow selecting a group for the GroupedAlertTable.
 * Handles further communication with the kbn-grouping package via redux.
 */
export const AdditionalToolbarControls = memo(
  ({ dataView }: RenderAdditionalToolbarControlsProps) => {
    const dispatch = useDispatch();

    const onGroupChange = useCallback(
      (selectedGroups: string[]) =>
        dispatch(updateGroups({ activeGroups: selectedGroups, tableId: TABLE_ID })),
      [dispatch]
    );

    const groupId = useMemo(() => groupIdSelector(), []);
    const { options: defaultGroupingOptions } =
      useDeepEqualSelector((state) => groupId(state, TABLE_ID)) ?? NO_OPTIONS;

    const groupSelector = useGetGroupSelectorStateless({
      groupingId: TABLE_ID,
      onGroupChange,
      fields: dataView.fields,
      defaultGroupingOptions,
      maxGroupingLevels: MAX_GROUPING_LEVELS,
    });

    return <>{groupSelector}</>;
  }
);

AdditionalToolbarControls.displayName = 'AdditionalToolbarControls';
