/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ONBOARDING_READ_MORE_URL } from './constants';
import * as i18n from './translations';

export const OnboardingIntroPromo: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj="alertZeroOnboardingIntroPromo"
    >
      <EuiFlexGroup gutterSize="none" alignItems="stretch" responsive>
        <EuiFlexItem
          css={css`
            justify-content: center;
            padding: ${euiTheme.size.l};
          `}
        >
          <EuiTitle size="xs">
            <h2>{i18n.INTRO_PROMO_LEAD}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>{i18n.INTRO_PROMO_BODY}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <div>
            {/* Outlined rather than filled: EUI has no outline variant, so an empty button carries the border. */}
            <EuiButtonEmpty
              size="s"
              href={ONBOARDING_READ_MORE_URL}
              target="_blank"
              iconType="external"
              iconSide="right"
              css={css`
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
              `}
              data-test-subj="alertZeroOnboardingReadMoreLink"
            >
              {i18n.INTRO_READ_MORE}
            </EuiButtonEmpty>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
