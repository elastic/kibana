/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { useHistory, useLocation } from 'react-router-dom';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { LogoIcon, type SupportedLogo } from '../logo_icon';

export interface OnboardingFlowHeaderProps {
  title: string;
  subtitle: string;
  returnTo: string;
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  returnLabel?: string;
  returnDataTestSubj?: string;
}

const DEFAULT_RETURN_LABEL = i18n.translate(
  'xpack.observability_onboarding.onboardingFlowHeader.returnLabel',
  { defaultMessage: 'Return' }
);

export const OnboardingFlowHeader: React.FC<OnboardingFlowHeaderProps> = ({
  title,
  subtitle,
  returnTo,
  logo,
  euiIconType,
  returnLabel = DEFAULT_RETURN_LABEL,
  returnDataTestSubj = 'observabilityOnboardingFlowHeaderReturn',
}) => {
  const history = useHistory();
  const location = useLocation();
  const { euiTheme } = useEuiTheme();
  const { onClick: onReturnClick, href: returnHref } = reactRouterNavigate(
    history,
    `${returnTo}${location.search}`
  );

  return (
    <EuiPageTemplate.Section
      grow={false}
      paddingSize="xl"
      restrictWidth
      css={css`
        border-bottom: ${euiTheme.border.thin};
      `}
    >
      <EuiButtonEmpty
        iconType="chevronSingleLeft"
        flush="left"
        href={returnHref}
        onClick={onReturnClick}
        data-test-subj={returnDataTestSubj}
        css={css`
          margin-left: -${euiTheme.size.xs};
        `}
      >
        {returnLabel}
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <div
            css={css`
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              border: ${euiTheme.border.thin};
              border-radius: 14px;
              padding: ${euiTheme.size.m};
              line-height: 0;
            `}
          >
            <LogoIcon
              logo={logo}
              euiIconType={euiIconType}
              size="xl"
              css={css`
                width: 40px;
                height: 40px;
              `}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{title}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="m">
            <p>{subtitle}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
