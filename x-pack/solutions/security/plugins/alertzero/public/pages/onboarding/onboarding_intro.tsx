/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { ONBOARDING_CONTENT_MAX_WIDTH } from './constants';
import { OnboardingContinueFooter } from './onboarding_continue_footer';
import { OnboardingIntroPromo } from './onboarding_intro_promo';
import { OnboardingSetUpDataPanel } from './onboarding_set_up_data_panel';
import { OnboardingUiPreview } from './onboarding_ui_preview';
import * as i18n from './translations';

interface Props {
  onContinue: () => void;
  continueDisabledReason?: string;
}

export const OnboardingIntro: React.FC<Props> = ({ onContinue, continueDisabledReason }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <AlertZeroPageSection
      grow
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
        <AlertZeroPageHeader
          greeting={i18n.ONBOARDING_INTRO_GREETING}
          title={i18n.ONBOARDING_INTRO_HEADING}
        />

        <EuiSpacer size="l" />

        <OnboardingIntroPromo />

        <EuiSpacer size="l" />

        <OnboardingUiPreview />

        <EuiSpacer size="l" />

        <OnboardingSetUpDataPanel />
      </div>

      <OnboardingContinueFooter onContinue={onContinue} disabledReason={continueDisabledReason} />
    </AlertZeroPageSection>
  );
};
