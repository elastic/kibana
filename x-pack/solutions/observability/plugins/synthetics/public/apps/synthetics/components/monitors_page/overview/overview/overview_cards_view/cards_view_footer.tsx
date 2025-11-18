/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { useOverviewStatus } from '../../../hooks/use_overview_status';
import { selectOverviewState } from '../../../../../state';
import type { OverviewStatusMetaData } from '../../types';

const OVERVIEW_ROW_COUNT = 4;

export const CardsViewFooter = ({
  monitorsSortedByStatus,
  currentIndex,
}: {
  currentIndex: number;
  monitorsSortedByStatus: OverviewStatusMetaData[];
}) => {
  const {
    pageState: { perPage },
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const isUnGrouped = groupField === 'none';
  const { allConfigs, loaded } = useOverviewStatus({
    scopeStatusByLocation: true,
  });

  if (
    isUnGrouped &&
    loaded &&
    // display this footer when user scrolls to end of list
    currentIndex * OVERVIEW_ROW_COUNT + OVERVIEW_ROW_COUNT >= monitorsSortedByStatus.length
  ) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        {monitorsSortedByStatus.length === allConfigs.length && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{SHOWING_ALL_MONITORS_LABEL}</EuiText>
          </EuiFlexItem>
        )}
        {monitorsSortedByStatus.length === allConfigs.length &&
          monitorsSortedByStatus.length > perPage && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="syntheticsOverviewGridButton"
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                }}
                iconType="sortUp"
                iconSide="right"
                size="xs"
              >
                {SCROLL_TO_TOP_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
      </EuiFlexGroup>
    </>
  );
};

const SHOWING_ALL_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.overview.grid.showingAllMonitors.label',
  {
    defaultMessage: 'Showing all monitors',
  }
);

const SCROLL_TO_TOP_LABEL = i18n.translate('xpack.synthetics.overview.grid.scrollToTop.label', {
  defaultMessage: 'Back to top',
});
