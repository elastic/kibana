/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import { NewTimelineButton } from '../actions/new_timeline_button';
import { OpenTimelineButton } from '../actions/open_timeline_button';
import { InspectButton } from '../../../../common/components/inspect';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import * as i18n from '../translations';
import { TimelinePanel, autoOverflowXCSS, whiteSpaceNoWrapCSS } from './styles';
import { useTimelineModalHeaderData } from './use_timeline_modal_header_data';
import { useIsInspectDisabled } from './use_is_inspect_disabled';
import type { TimelineModalHeaderBaseProps } from './types';

export const SuperTimelineModalHeader = React.memo<TimelineModalHeaderBaseProps>(
  ({ timelineId, openToggleRef }) => {
    const { title, activeTab, timelineType, closeTimeline } = useTimelineModalHeaderData(
      timelineId,
      openToggleRef
    );
    const isInspectDisabled = useIsInspectDisabled(timelineId);

    return (
      <TimelinePanel
        grow={false}
        paddingSize="s"
        hasShadow={false}
        data-test-subj="timeline-modal-header-panel"
      >
        <EuiFlexGroup
          className="eui-scrollBar"
          alignItems="center"
          gutterSize="s"
          responsive={false}
          justifyContent="spaceBetween"
          css={autoOverflowXCSS}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText
                  grow={false}
                  data-test-subj="timeline-modal-header-title"
                  css={whiteSpaceNoWrapCSS}
                >
                  <h3>{title}</h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="timeline-modal-super-timeline-badge">
                  {i18n.SUPER_TIMELINE_READONLY_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="xs"
              responsive={false}
              data-test-subj="timeline-modal-header-actions"
            >
              <EuiFlexItem>
                <NewTimelineButton timelineId={timelineId} />
              </EuiFlexItem>
              <EuiFlexItem>
                <OpenTimelineButton />
              </EuiFlexItem>
              <EuiFlexItem>
                <InspectButton
                  queryId={`${timelineId}-${activeTab}`}
                  inputId={InputsModelId.timeline}
                  isDisabled={isInspectDisabled}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.CLOSE_TIMELINE_OR_TEMPLATE(
                    timelineType === TimelineTypeEnum.default
                  )}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    aria-label={i18n.CLOSE_TIMELINE_OR_TEMPLATE(
                      timelineType === TimelineTypeEnum.default
                    )}
                    iconType="cross"
                    data-test-subj="timeline-modal-header-close-button"
                    onClick={closeTimeline}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </TimelinePanel>
    );
  }
);

SuperTimelineModalHeader.displayName = 'SuperTimelineModalHeader';
