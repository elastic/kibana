/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiIllustration, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { securityLock } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import React from 'react';
import { LOCKED_DESCRIPTION, LOCKED_TITLE } from './translations';

export const DetectionOnboardingLocked = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="nightshiftDetectionOnboardingLocked">
      <EuiEmptyPrompt
        layout="vertical"
        color="transparent"
        paddingSize="l"
        css={css`
          max-inline-size: none;
        `}
        icon={
          <EuiIllustration
            type={securityLock}
            alt=""
            css={css`
              max-inline-size: ${euiTheme.base * 10}px;
              margin-inline: auto;
            `}
          />
        }
        title={<h2>{LOCKED_TITLE}</h2>}
        titleSize="xs"
        body={
          <EuiText size="s">
            <p>{LOCKED_DESCRIPTION}</p>
          </EuiText>
        }
      />
    </EuiPanel>
  );
};
