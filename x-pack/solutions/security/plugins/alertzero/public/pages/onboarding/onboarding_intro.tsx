/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SECURITY_APP_ID, SecurityPageName } from '@kbn/deeplinks-security';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { ONBOARDING_CONTENT_MAX_WIDTH } from './constants';
import { OnboardingContinueFooter } from './onboarding_continue_footer';
import { OnboardingIntroPromo } from './onboarding_intro_promo';
import { OnboardingUiPreview } from './onboarding_ui_preview';
import * as i18n from './translations';

interface Props {
  onContinue: () => void;
}

export const OnboardingIntro: React.FC<Props> = ({ onContinue }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<CoreStart>();

  return (
    <AlertZeroPageSection
      contentProps={{
        css: css`
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          padding-block: 0;
          width: 100%;
        `,
      }}
    >
      <div
        css={css`
          flex-grow: 1;
          align-self: center;
          max-width: ${ONBOARDING_CONTENT_MAX_WIDTH};
          padding-block: ${euiTheme.size.xxl};
          width: 100%;
        `}
      >
        <OnboardingIntroPromo />

        <EuiSpacer size="l" />

        <OnboardingUiPreview />

        <EuiSpacer size="l" />

        <EuiPanel hasBorder hasShadow={false} paddingSize="l">
          <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h2>{i18n.INTRO_SET_UP_DATA_TITLE}</h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <p>{i18n.INTRO_SET_UP_DATA_BODY}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="external"
                iconSide="right"
                onClick={() =>
                  application.navigateToApp(SECURITY_APP_ID, {
                    deepLinkId: SecurityPageName.landing,
                  })
                }
                data-test-subj="alertZeroOnboardingSetUpDataLink"
              >
                {i18n.INTRO_SET_UP_DATA_LINK}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </div>

      <OnboardingContinueFooter onContinue={onContinue} />
    </AlertZeroPageSection>
  );
};
