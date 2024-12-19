/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { OverviewStatusMetaData } from '../../../../../../../common/runtime_types';

export const GridScrollFooter = ({
  groupField,
  loaded,
  monitorsSortedByStatus,
  totalConfigs,
  perPage,
}: {
  groupField: string;
  loaded: boolean;
  monitorsSortedByStatus: OverviewStatusMetaData[];
  totalConfigs: number;
  perPage: number;
}) => {
  if (groupField !== 'none' || !loaded) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        {monitorsSortedByStatus.length === totalConfigs && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{SHOWING_ALL_MONITORS_LABEL}</EuiText>
          </EuiFlexItem>
        )}
        {monitorsSortedByStatus.length === totalConfigs &&
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
