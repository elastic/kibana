/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageHeader,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

const getEscalationsHeroTitle = ({
  isLoading,
  hasError,
  openCount,
}: {
  isLoading: boolean;
  hasError: boolean;
  openCount: number;
}): { prefix: string; body: string } => {
  if (isLoading) {
    return {
      prefix: '',
      body: i18n.translate('xpack.alertzero.escalationsHeader.loadingTitle', {
        defaultMessage: 'Loading escalations...',
      }),
    };
  }

  if (hasError) {
    return {
      prefix: '',
      body: i18n.translate('xpack.alertzero.escalationsHeader.errorTitle', {
        defaultMessage: "Escalation count couldn't be loaded",
      }),
    };
  }

  const body = i18n.translate('xpack.alertzero.escalationsHeader.openCountTitle', {
    defaultMessage: '{count, plural, one {# open escalation} other {# open escalations}}',
    values: { count: openCount },
  });

  return {
    prefix: i18n.translate('xpack.alertzero.escalationsHeader.onTheBoard', {
      defaultMessage: 'On the board:',
    }),
    body,
  };
};

export interface EscalationsPageHeaderProps {
  isLoading?: boolean;
  hasError?: boolean;
  openCount?: number;
}

/**
 * Hero header for the Escalations page.
 *
 * Mirrors `AlertZeroPageHeader` visually — the same circular icon with a red
 * notification dot — but uses escalation-specific copy.
 */
export const EscalationsPageHeader: React.FC<EscalationsPageHeaderProps> = ({
  isLoading = false,
  hasError = false,
  openCount = 0,
}) => {
  const { euiTheme } = useEuiTheme();
  const { prefix, body } = getEscalationsHeroTitle({ isLoading, hasError, openCount });

  return (
    <>
      <EuiPageHeader
        alignItems="center"
        bottomBorder={false}
        responsive
        data-test-subj="escalationsPageHeader"
      >
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="m"
          responsive={false}
          wrap
        >
          <EuiFlexItem grow={false}>
            <div
              aria-label={i18n.translate(
                'xpack.alertzero.escalationsHeader.escalationsIconAriaLabel',
                { defaultMessage: 'Escalations' }
              )}
              role="img"
              css={css`
                align-items: center;
                border: 1px solid ${euiTheme.colors.lightShade};
                border-radius: 50%;
                color: ${euiTheme.colors.textAssistance};
                display: inline-flex;
                height: calc(${euiTheme.size.xxl} + ${euiTheme.size.s});
                justify-content: center;
                position: relative;
                width: calc(${euiTheme.size.xxl} + ${euiTheme.size.s});
                transition: background ${euiTheme.animation.slow} ease,
                  border-color ${euiTheme.animation.slow} ease;
              `}
            >
              <EuiIcon type="sun" size="m" aria-hidden={true} />
              <span
                style={{
                  display: 'inline-block',
                  background: `${euiTheme.colors.danger}`,
                  width: `${euiTheme.size.s}`,
                  height: `${euiTheme.size.s}`,
                  borderRadius: '50%',
                  boxShadow: `0 0 0 2px ${euiTheme.colors.textGhost}`,
                  position: 'absolute',
                  pointerEvents: 'none',
                  top: '1px',
                  right: '1px',
                }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m" css={{ fontWeight: 500 }}>
              <h1>
                {prefix && <span style={{ color: euiTheme.colors.mediumShade }}>{prefix} </span>}
                <span>{body}</span>
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
      <EuiSpacer size="l" />
    </>
  );
};
