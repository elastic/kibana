/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ONBOARDING_CONTENT_MAX_WIDTH } from './constants';
import * as i18n from './translations';

const CONTINUE_DISABLED_REASON_ID = 'alertZeroOnboardingContinueDisabledReason';

interface Props {
  onContinue: () => void;
  /** When set, Continue is disabled and this explanation is shown next to it. */
  disabledReason?: string;
}

export const OnboardingContinueFooter: React.FC<Props> = ({ onContinue, disabledReason }) => {
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
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={css`
          max-width: ${ONBOARDING_CONTENT_MAX_WIDTH};
          margin-inline: auto;
        `}
      >
        {disabledReason ? (
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              color="subdued"
              id={CONTINUE_DISABLED_REASON_ID}
              data-test-subj="alertZeroOnboardingContinueDisabledReason"
            >
              {disabledReason}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="chevronSingleRight"
            iconSide="right"
            onClick={onContinue}
            isDisabled={Boolean(disabledReason)}
            aria-describedby={disabledReason ? CONTINUE_DISABLED_REASON_ID : undefined}
            data-test-subj="alertZeroOnboardingContinueButton"
          >
            {i18n.CONTINUE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
