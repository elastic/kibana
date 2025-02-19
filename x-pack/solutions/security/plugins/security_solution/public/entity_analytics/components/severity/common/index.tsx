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
import type { RiskSeverity } from '../../../../../common/search_strategy';

const RiskBadge = styled('div', {
  shouldForwardProp: (prop) => !['severity', 'hideBackgroundColor'].includes(prop),
})<{
  severity: RiskSeverity;
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
  severity: RiskSeverity;
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
  severity: RiskSeverity;
  hideBackgroundColor?: boolean;
  ['data-test-subj']?: string;
}> = React.memo(({ severity, hideBackgroundColor = false, 'data-test-subj': dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  // TODO: use riskSeverity hook when palette agreed.
  // https://github.com/elastic/security-team/issues/11516 hook - https://github.com/elastic/kibana/pull/206276
  return (
    <RiskBadge
      color={euiTheme.colors.backgroundBaseDanger}
      severity={severity}
      hideBackgroundColor={hideBackgroundColor}
      data-test-subj={dataTestSubj ?? 'risk-score'}
    >
      <EuiTextColor color="default">
        <EuiHealth className="eui-alignMiddle" color={RISK_SEVERITY_COLOUR[severity]}>
          {severity}
        </EuiHealth>
      </EuiTextColor>
    </RiskBadge>
  );
});
RiskScoreBadge.displayName = 'RiskScoreBadge';
