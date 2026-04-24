/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MAX_DESCRIPTION_WIDTH = 640;

export interface StatusHeaderProps {
  modeLabel?: string;
  title?: string;
  description?: string;
  iconType?: EuiIconProps['type'];
  iconColor?: EuiIconProps['color'];
}

const DEFAULT_MODE_LABEL = i18n.translate('xpack.observability.sigeventsOverview.modeBadge', {
  defaultMessage: 'SIGNIFICANT EVENTS',
});

const DEFAULT_TITLE = i18n.translate('xpack.observability.sigeventsOverview.mainHeading', {
  defaultMessage: 'Your system requires attention',
});

const DEFAULT_DESCRIPTION = i18n.translate(
  'xpack.observability.sigeventsOverview.introDescription',
  {
    defaultMessage:
      'We are detecting more unusual behaviour than normal, review the impact and details and start remediation or further actions.',
  }
);

export const StatusHeader = ({
  modeLabel = DEFAULT_MODE_LABEL,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  iconType = 'radar',
  iconColor = 'danger',
}: StatusHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj="sigeventsOverviewStatusHeader"
    >
      <EuiFlexItem grow={false}>
        <EuiBadge iconType="moon" color="hollow">
          {modeLabel}
        </EuiBadge>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="l" color={iconColor} aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2
                css={css`
                  color: ${euiTheme.colors.dangerText};
                `}
              >
                {title}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          textAlign="center"
          css={css`
            max-width: ${MAX_DESCRIPTION_WIDTH}px;
          `}
        >
          <p>{description}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
