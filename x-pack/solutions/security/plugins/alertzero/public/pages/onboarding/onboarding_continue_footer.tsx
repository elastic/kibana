/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ONBOARDING_CONTENT_MAX_WIDTH } from './constants';
import * as i18n from './translations';

interface Props {
  onContinue: () => void;
}

export const OnboardingContinueFooter: React.FC<Props> = ({ onContinue }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: sticky;
        inset-block-end: 0;
        padding-block: ${euiTheme.size.m};
        padding-inline: ${euiTheme.size.xl};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-top: ${euiTheme.border.thin};
      `}
    >
      <EuiFlexGroup
        justifyContent="flexEnd"
        gutterSize="m"
        responsive={false}
        css={css`
          max-width: ${ONBOARDING_CONTENT_MAX_WIDTH};
          margin-inline: auto;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="chevronSingleRight"
            iconSide="right"
            onClick={onContinue}
            data-test-subj="alertZeroOnboardingContinueButton"
          >
            {i18n.CONTINUE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
