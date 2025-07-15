/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../../common/utils/normalize_time_range';

interface TakeActionProps {
  kqlQuery: string;
  isDisabled?: boolean;
}

/*
 * This component is used to investigate a host|user|entity using Timeline from Flyout
 */
export const TakeAction = ({ kqlQuery, isDisabled }: TakeActionProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const closePopover = () => {
    setPopoverOpen(false);
  };

  const last30MinRange = normalizeTimeRange({
    kind: 'absolute',
    from: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes in milliseconds
    to: new Date(Date.now()).toISOString(),
  });

  const { investigateInTimeline } = useInvestigateInTimeline();
  const openTimelineCallback = useCallback(async () => {
    investigateInTimeline({
      timeRange: {
        from: last30MinRange.from,
        to: last30MinRange.to,
        kind: 'absolute',
      },
      keepDataView: true, // it will reset to the Security default data view
      query: {
        language: 'kuery',
        query: kqlQuery,
      },
    });
  }, [kqlQuery, last30MinRange, investigateInTimeline]);

  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const button = (
    <EuiButton
      isLoading={isLoading}
      isDisabled={isDisabled}
      fill
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
    >
      <FormattedMessage
        id="xpack.securitySolution.flyout.takeActionButton"
        defaultMessage="Take action"
      />
    </EuiButton>
  );
  const actionsItems = [
    <InvestigateInTimeline
      key="investigateInTimeline"
      investigateInTimelineFn={openTimelineCallback}
      setIsLoading={setIsLoading}
      closePopover={closePopover}
    />,
  ];

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      data-test-subj="take-action-button"
    >
      <EuiContextMenuPanel size="s" items={actionsItems} />
    </EuiPopover>
  );
};

const InvestigateInTimeline = ({
  investigateInTimelineFn,
  setIsLoading,
  closePopover,
}: {
  investigateInTimelineFn: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  closePopover: () => void;
}) => {
  return (
    <EuiContextMenuItem
      key="investigateInTimeline"
      onClick={async () => {
        closePopover();
        setIsLoading(true);
        await investigateInTimelineFn();
        setIsLoading(false);
      }}
      data-test-subj="investigate-in-timeline-take-action-button"
    >
      <FormattedMessage
        defaultMessage="Investigate in Timeline"
        id="xpack.securitySolution.flyout.investigateInTimelineButton"
      />
    </EuiContextMenuItem>
  );
};
