/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import React, { memo } from 'react';
import { useTimelineSelectAlertsOnlyDataView } from '../hooks/use_timeline_select_alerts_only_data_view';
import { useAddAlertsOnlyFilter } from '../hooks/use_add_alerts_only_filter';
import * as i18n from './translations';

export const CALLOUT_TEST_ID = 'timelineAlertsOnlyCallOut';
export const ALERTS_ONLY_DATA_VIEW_BUTTON_TEST_ID = 'timelineAlertsOnlyDataViewButton';
export const ADD_ALERTS_FILTER_BUTTON_TEST_ID = 'timelineAddAlertsFitlerButton';

export interface MigrationMessageProps {
  /**
   * Id of the timeline the callout is being displayed in
   */
  timelineId: string;
}

/**
 * Callout message displayed in timelines to inform users that with the new data view picker
 * we don't support the "show detection alerts only" option we had with sourcerer.
 * So their option is to either swithc to use the alerts data view
 * or use the default data view and add an alerts-only filter.
 */
export const MigrationMessageCallout = memo(({ timelineId }: MigrationMessageProps) => {
  const selectAlertsDataView = useTimelineSelectAlertsOnlyDataView();
  const addAlertsFilter = useAddAlertsOnlyFilter({ timelineId });

  return (
    <EuiCallOut
      announceOnMount={false}
      color="warning"
      data-test-subj={CALLOUT_TEST_ID}
      iconType="warning"
      size="m"
      title={i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_TITLE}
    >
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">{i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_CONTENT}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                aria-label={i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_SWITCH_BUTTON}
                color="text"
                data-test-subj={ALERTS_ONLY_DATA_VIEW_BUTTON_TEST_ID}
                onClick={selectAlertsDataView}
                size="s"
              >
                {i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_SWITCH_BUTTON}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label={i18n.CALL_OUT_FILTER_FOR_ALERTS_BUTTON}
                color="warning"
                data-test-subj={ADD_ALERTS_FILTER_BUTTON_TEST_ID}
                fill
                onClick={addAlertsFilter}
                size="s"
              >
                {i18n.CALL_OUT_FILTER_FOR_ALERTS_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
});

MigrationMessageCallout.displayName = 'MigrationMessageCallout';
