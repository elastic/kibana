/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, EuiTextColor, useEuiTheme } from '@elastic/eui';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

import { RISK_SEVERITY_COLOUR } from '../../../common/utils';
import { HoverPopover } from '../../../../common/components/hover_popover';
import {
  RiskSeverity,
  type RiskSeverity as RiskSeverityType,
} from '../../../../../common/search_strategy';

const RiskBadge = styled('div', {
  shouldForwardProp: (prop) => !['severity', 'hideBackgroundColor'].includes(prop),
})<{
  severity: RiskSeverityType;
  hideBackgroundColor: boolean;
}>`
  ${({ theme: { euiTheme }, color, severity, hideBackgroundColor }) => css`
    width: fit-content;
    padding-right: ${euiTheme.size.s};
    padding-left: ${euiTheme.size.xs};

    ${(severity === 'Critical' || severity === 'High') &&
    !hideBackgroundColor &&
    css`
      background-color: ${color};
      border-radius: 999px; // pill shaped
    `};
  `}
`;

const TooltipContainer = styled.div`
  padding: ${({ theme: { euiTheme } }) => euiTheme.size.s};
`;

export const RiskScoreLevel: React.FC<{
  severity: RiskSeverityType;
  hideBackgroundColor?: boolean;
  toolTipContent?: JSX.Element;
  ['data-test-subj']?: string;
}> = React.memo(
  ({ severity, hideBackgroundColor = false, toolTipContent, 'data-test-subj': dataTestSubj }) => {
    if (toolTipContent != null) {
      return (
        <HoverPopover hoverContent={<TooltipContainer>{toolTipContent}</TooltipContainer>}>
          <RiskScoreBadge
            severity={severity}
            hideBackgroundColor={hideBackgroundColor}
            data-test-subj={dataTestSubj}
          />
        </HoverPopover>
      );
    }

    return (
      <RiskScoreBadge
        severity={severity}
        hideBackgroundColor={hideBackgroundColor}
        data-test-subj={dataTestSubj}
      />
    );
  }
);
RiskScoreLevel.displayName = 'RiskScoreLevel';

const RiskScoreBadge: React.FC<{
  severity: RiskSeverityType;
  hideBackgroundColor?: boolean;
  ['data-test-subj']?: string;
}> = React.memo(({ severity, hideBackgroundColor = false, 'data-test-subj': dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  const healthColor =
    RISK_SEVERITY_COLOUR[severity as keyof typeof RISK_SEVERITY_COLOUR] ??
    RISK_SEVERITY_COLOUR[RiskSeverity.Unknown];
  return (
    <RiskBadge
      color={euiTheme.colors.backgroundBaseDanger}
      severity={severity}
      hideBackgroundColor={hideBackgroundColor}
      data-test-subj={dataTestSubj ?? 'risk-score'}
    >
      <EuiTextColor color="default">
        <EuiHealth
          className="eui-alignMiddle eui-textNoWrap"
          color={healthColor}
          textSize="inherit"
        >
          {severity}
        </EuiHealth>
      </EuiTextColor>
    </RiskBadge>
  );
});
RiskScoreBadge.displayName = 'RiskScoreBadge';
