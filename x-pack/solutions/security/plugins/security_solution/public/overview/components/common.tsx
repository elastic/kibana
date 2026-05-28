/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from './translations';
import { EntityAnalyticsLearnMoreLink } from '../../entity_analytics/components/entity_analytics_learn_more_link';

export const RiskScoreInfoTooltip: React.FC<{
  toolTipContent: React.ReactNode;
  toolTipTitle?: React.ReactNode;
  width?: number;
  anchorPosition?: EuiPopover['props']['anchorPosition'];
}> = ({ toolTipContent, toolTipTitle, width = 270, anchorPosition = 'leftCenter' }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const onClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition={anchorPosition}
      aria-labelledby={popoverTitleId}
      button={
        <EuiToolTip content={i18n.INFORMATION_ARIA_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            color="text"
            size="xs"
            iconSize="m"
            iconType="info"
            aria-label={i18n.INFORMATION_ARIA_LABEL}
            onClick={onClick}
          />
        </EuiToolTip>
      }
    >
      {toolTipTitle && <EuiPopoverTitle id={popoverTitleId}>{toolTipTitle}</EuiPopoverTitle>}
      <EuiText size="s" style={{ width: `${width}px` }}>
        {toolTipContent}
      </EuiText>
    </EuiPopover>
  );
};

export const RiskScoreDocTooltip = ({
  anchorPosition,
}: {
  anchorPosition?: React.ComponentProps<typeof RiskScoreInfoTooltip>['anchorPosition'];
}) => (
  <RiskScoreInfoTooltip
    anchorPosition={anchorPosition}
    toolTipContent={<EntityAnalyticsLearnMoreLink />}
  />
);
