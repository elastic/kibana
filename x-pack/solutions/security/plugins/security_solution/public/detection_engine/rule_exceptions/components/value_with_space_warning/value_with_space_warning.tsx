/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FC } from 'react';
import { EuiIconTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useValueWithSpaceWarning } from './use_value_with_space_warning';
interface ValueWithSpaceWarningProps {
  value: string[] | string;
  tooltipIconType?: string;
  tooltipIconText?: string;
}
export const ValueWithSpaceWarning: FC<ValueWithSpaceWarningProps> = ({
  value,
  tooltipIconType = 'info',
  tooltipIconText,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerStyles = css`
    display: inline;
    margin-left: ${euiTheme.size.xs};
  `;
  const { showSpaceWarningIcon, warningText } = useValueWithSpaceWarning({
    value,
    tooltipIconText,
  });
  if (!showSpaceWarningIcon || !value) return null;
  return (
    <div css={containerStyles}>
      <EuiIconTip
        content={warningText}
        position="top"
        iconProps={{
          'data-test-subj': 'value_with_space_warning_tooltip',
        }}
        type={tooltipIconType}
        color="warning"
      />
    </div>
  );
};
