/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ONBOARDING_CONTENT_MAX_WIDTH } from './constants';
import * as i18n from './translations';

interface Props {
  selectedCount: number;
  totalCount: number;
  isSaving: boolean;
  isEnableDisabled: boolean;
  onEnable: () => void;
  onNotNow: () => void;
}

export const OnboardingEnableFooter: React.FC<Props> = ({
  selectedCount,
  totalCount,
  isSaving,
  isEnableDisabled,
  onEnable,
  onNotNow,
}) => {
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
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={css`
          max-width: ${ONBOARDING_CONTENT_MAX_WIDTH};
          margin-inline: auto;
        `}
      >
        <EuiFlexItem>
          <EuiLink
            onClick={isSaving ? undefined : onNotNow}
            disabled={isSaving}
            data-test-subj="alertZeroOnboardingNotNowLink"
          >
            {i18n.NOT_NOW} &rarr;
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="alertZeroOnboardingSelectedCount">
            {i18n.workersSelectedCount(selectedCount, totalCount)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="chevronSingleRight"
            iconSide="right"
            isLoading={isSaving}
            disabled={isEnableDisabled}
            onClick={onEnable}
            data-test-subj="alertZeroOnboardingEnableButton"
          >
            {i18n.ENABLE_AND_RUN}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
