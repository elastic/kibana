/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SECURITY_APP_ID, SecurityPageName } from '@kbn/deeplinks-security';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import { OnboardingUiPreview } from './onboarding_ui_preview';
import * as i18n from './translations';

const CONTENT_MAX_WIDTH = '1000px';

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
          max-width: ${CONTENT_MAX_WIDTH};
          padding-block: ${euiTheme.size.xxl};
          width: 100%;
        `}
      >
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          data-test-subj="alertZeroOnboardingIntroPromo"
        >
          <EuiFlexGroup gutterSize="none" alignItems="stretch" responsive>
            <EuiFlexItem
              grow={false}
              css={css`
                position: relative;
                width: 40%;
                min-width: 240px;
                min-height: 200px;
                justify-content: flex-end;
                padding: ${euiTheme.size.base};
                background: linear-gradient(
                  135deg,
                  ${euiTheme.colors.backgroundLightPrimary},
                  ${euiTheme.colors.backgroundLightAccent}
                );
              `}
              data-test-subj="alertZeroOnboardingVideoPlaceholder"
            >
              {/* TODO: replace with the intro video once it is available. */}
              <div
                css={css`
                  position: absolute;
                  inset-block-start: 50%;
                  inset-inline-start: 50%;
                  transform: translate(-50%, -50%);
                `}
              >
                <EuiToolTip content={i18n.VIDEO_PLACEHOLDER_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    display="fill"
                    size="m"
                    iconType="play"
                    isDisabled
                    aria-label={i18n.VIDEO_PLACEHOLDER_LABEL}
                  />
                </EuiToolTip>
              </div>
              <EuiTitle size="xs">
                <h1>{i18n.INTRO_TITLE}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                justify-content: center;
                padding: ${euiTheme.size.xl};
              `}
            >
              <EuiText>
                <h2>{i18n.INTRO_PROMO_LEAD}</h2>
                <p>{i18n.INTRO_PROMO_BODY}</p>
              </EuiText>
              <EuiSpacer size="m" />
              <div>
                <EuiButton
                  href={ONBOARDING_READ_MORE_URL_PLACEHOLDER}
                  target="_blank"
                  iconType="external"
                  iconSide="right"
                  data-test-subj="alertZeroOnboardingReadMoreLink"
                >
                  {i18n.READ_MORE}
                </EuiButton>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

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
            max-width: ${CONTENT_MAX_WIDTH};
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
    </AlertZeroPageSection>
  );
};
