/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
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
  isTechnicalPreview?: boolean;
}

export function CustomHeader({
  euiIconType,
  logo,
  headlineCopy,
  captionCopy,
  isTechnicalPreview = false,
}: Props) {
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
          <EuiFlexGroup alignItems="baseline" gutterSize="m">
            <EuiTitle size="l">
              <h1>{headlineCopy}</h1>
            </EuiTitle>
            {isTechnicalPreview && (
              <EuiBetaBadge
                label={i18n.translate(
                  'xpack.observability_onboarding.otelLogsPanel.techPreviewBadge.label',
                  {
                    defaultMessage: 'Technical preview',
                  }
                )}
                size="m"
                color="hollow"
                tooltipContent={i18n.translate(
                  'xpack.observability_onboarding.otelLogsPanel.techPreviewBadge.tooltip',
                  {
                    defaultMessage:
                      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
                  }
                )}
                tooltipPosition={'right'}
              />
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="m">
            <p>{captionCopy}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
}
