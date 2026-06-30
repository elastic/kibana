/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';

import { PageScope } from '../../../../../../data_view_manager/constants';
import { InputsModelId } from '../../../../../../common/store/inputs/constants';
import { TimelineTabs } from '../../../../../../../common/types/timeline';
import { ExitFullScreen } from '../../../../../../common/components/exit_full_screen';
import { SuperDatePicker } from '../../../../../../common/components/super_date_picker';
import { TimelineDatePickerLock } from '../../../date_picker_lock';
import type { TimelineFullScreen } from '../../../../../../common/containers/use_full_screen';
import { EqlQueryBarTimeline } from '../../../query_bar/eql';
import { StyledEuiFlyoutHeader, TabHeaderContainer } from '../../shared/layout';
import { DataViewPicker } from '../../../../../../data_view_manager/components/data_view_picker';

export type EqlTabHeaderProps = {
  activeTab: TimelineTabs;
  timelineId: string;
} & TimelineFullScreen;

export const EqlTabHeader = memo(
  ({ activeTab, setTimelineFullScreen, timelineFullScreen, timelineId }: EqlTabHeaderProps) => (
    <>
      <EuiFlexItem grow={false}>
        <StyledEuiFlyoutHeader data-test-subj={`${activeTab}-tab-flyout-header`} hasBorder={false}>
          <EuiFlexGroup
            className="euiScrollBar"
            alignItems="flexStart"
            gutterSize="s"
            data-test-subj="timeline-date-picker-container"
            responsive={false}
          >
            {timelineFullScreen && setTimelineFullScreen != null && (
              <ExitFullScreen
                fullScreen={timelineFullScreen}
                setFullScreen={setTimelineFullScreen}
              />
            )}
            <EuiFlexItem grow={false}>
              {activeTab === TimelineTabs.eql && <DataViewPicker scope={PageScope.timeline} />}
            </EuiFlexItem>
            <EuiFlexItem>
              <SuperDatePicker
                compressed={true}
                id={InputsModelId.timeline}
                timelineId={timelineId}
                width="auto"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TimelineDatePickerLock />
            </EuiFlexItem>
          </EuiFlexGroup>
        </StyledEuiFlyoutHeader>
      </EuiFlexItem>
      <TabHeaderContainer data-test-subj="timelineHeader">
        <EqlQueryBarTimeline timelineId={timelineId} />
      </TabHeaderContainer>
    </>
  )
);

EqlTabHeader.displayName = 'EqlTabHeader';
