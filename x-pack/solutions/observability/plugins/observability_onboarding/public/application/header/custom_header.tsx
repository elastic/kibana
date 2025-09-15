/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React from 'react';
import { BackButton } from '../shared/back_button';
import { LogoIcon } from '../shared/logo_icon';
import type { SupportedLogo } from '../shared/logo_icon';

interface Props {
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  headlineCopy: string;
  captionCopy: string;
}

export function CustomHeader({ euiIconType, logo, headlineCopy, captionCopy }: Props) {
  const theme = useEuiTheme();
  const shadow = useEuiShadow('s');
  return (
    <EuiPageTemplate.Section
      css={css`
        border-bottom: ${theme.euiTheme.border.thin};
      `}
      grow={false}
      paddingSize="l"
      restrictWidth
    >
      <BackButton>
        {i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.button.returnButtonLabel',
          {
            defaultMessage: 'Return',
          }
        )}
      </BackButton>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <div
            css={css`
              border-radius: ${theme.euiTheme.border.radius.medium};
              ${shadow}
            `}
          >
            <LogoIcon
              euiIconType={euiIconType}
              isAvatar={!!euiIconType}
              logo={logo}
              size="xxl"
              css={css`
                margin: 12px;
                width: 56px;
                height: 56px;
              `}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{headlineCopy}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="m">
            <p>{captionCopy}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
}
