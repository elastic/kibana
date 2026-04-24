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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/** Logo frame in the header (square). Used to align other UI (e.g. wizard rails) to the logo center. */
export const INTEGRATION_HEADER_LOGO_FRAME_PX = 64;

interface IntegrationHeaderProps {
  logoSrc?: string;
  logoAlt?: string;
  title: string;
  subtitle?: string;
}

export const IntegrationHeader: React.FC<IntegrationHeaderProps> = ({
  logoSrc,
  logoAlt,
  title,
  subtitle,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPageTemplate.Section
      paddingSize="xl"
      css={css`
        border-bottom: ${euiTheme.border.thin};
      `}
      grow={false}
      restrictWidth
    >
      <EuiSpacer size="xl" />
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        {logoSrc && (
          <EuiFlexItem grow={false}>
            <div
              style={{
                width: INTEGRATION_HEADER_LOGO_FRAME_PX,
                height: INTEGRATION_HEADER_LOGO_FRAME_PX,
                borderRadius: 14,
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={logoSrc}
                alt={logoAlt ?? ''}
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
            </div>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{title}</h1>
          </EuiTitle>
          {subtitle && (
            <>
              <EuiSpacer size="s" />
              <EuiText color="subdued">
                <p>{subtitle}</p>
              </EuiText>
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
