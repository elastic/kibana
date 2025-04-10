/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useSecurityContext } from '../../../hooks/use_security_context';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import { BUTTON_ICON_LABEL } from './translations';
import { indicatorToEcsCompliantRecord } from '../utils/indicator_to_ecs';

export interface InvestigateInTimelineProps {
  /**
   * Value passed to the timeline. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator;
  /**
   * Click event to close the popover in the parent component
   */
  onClick?: () => void;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * This component renders an {@link EuiContextMenu} with investigate in timeline action.
 *
 * @returns investigate in timeline for a context menu
 */
export const InvestigateInTimelineContextMenu: FC<InvestigateInTimelineProps> = ({
  data,
  onClick,
  'data-test-subj': dataTestSub,
}) => {
  const { investigateInTimelineActionItems } = useInvestigateInTimeline({
    ecsRowData: indicatorToEcsCompliantRecord(data),
    onInvestigateInTimelineAlertClick: onClick,
  });
  const securitySolutionContext = useSecurityContext();

  if (!securitySolutionContext?.hasAccessToTimeline || !investigateInTimelineActionItems.length) {
    return null;
  }

  return investigateInTimelineActionItems.map((itemConfig) => {
    return (
      <EuiContextMenuItem {...itemConfig} data-test-subj={dataTestSub}>
        <FormattedMessage
          defaultMessage="Investigate in Timeline"
          id="xpack.threatIntelligence.investigateInTimelineButton"
        />
      </EuiContextMenuItem>
    );
  });
};

/**
 * This component renders an {@link EuiButtonIcon}.
 *
 * @returns add to timeline button icon
 */
export const InvestigateInTimelineButtonIcon: FC<InvestigateInTimelineProps> = ({
  data,
  'data-test-subj': dataTestSub,
}) => {
  const { investigateInTimelineActionItems } = useInvestigateInTimeline({
    ecsRowData: indicatorToEcsCompliantRecord(data),
  });
  const securitySolutionContext = useSecurityContext();

  if (!securitySolutionContext?.hasAccessToTimeline || !investigateInTimelineActionItems.length) {
    return null;
  }

  const [action] = investigateInTimelineActionItems;

  return (
    <EuiToolTip content={BUTTON_ICON_LABEL}>
      <EuiButtonIcon
        aria-label={BUTTON_ICON_LABEL}
        iconType="timeline"
        iconSize="s"
        size="xs"
        color="primary"
        onClick={action.onClick}
        data-test-subj={dataTestSub}
      />
    </EuiToolTip>
  );
};
