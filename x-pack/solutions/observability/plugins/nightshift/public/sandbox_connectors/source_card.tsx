/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiShadow,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';

interface SourceCardAction {
  label: string;
  icon: IconType;
  onClick: () => void;
  disabledReason?: string;
  'data-test-subj'?: string;
}

export function SourceCard({
  icon,
  title,
  description,
  connected = false,
  action,
  'data-test-subj': dataTestSubj,
}: {
  icon: IconType;
  title: string;
  description?: string;
  connected?: boolean;
  action: SourceCardAction;
  'data-test-subj'?: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const plateShadow = useEuiShadow('xs');

  const cardStyles = css`
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};
    border-radius: ${euiTheme.size.m};
  `;
  const plateStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: ${euiTheme.size.s};
    ${connected
      ? `background: ${transparentize(euiTheme.colors.success, 0.15)}; color: ${
          euiTheme.colors.success
        };`
      : `background: ${euiTheme.colors.backgroundBasePlain}; color: ${euiTheme.colors.textHeading}; ${plateShadow}`}
  `;
  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;
  const titleRowStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const descriptionStyles = css`
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `;
  const actionStyles = css`
    margin-top: auto;
    align-self: flex-start;
  `;

  const button = (
    <EuiButton
      size="s"
      color="text"
      iconType={action.icon}
      onClick={action.onClick}
      isDisabled={action.disabledReason !== undefined}
      aria-label={`${action.label} ${title}`}
      data-test-subj={action['data-test-subj']}
    >
      {action.label}
    </EuiButton>
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={cardStyles}
      role="listitem"
      data-test-subj={dataTestSubj}
    >
      <div css={plateStyles} aria-hidden={true}>
        <EuiIcon type={connected ? 'check' : icon} size="m" aria-hidden={true} />
      </div>
      <div>
        <div css={titleRowStyles}>
          <EuiText size="s">
            <p css={titleStyles}>{title}</p>
          </EuiText>
        </div>
        {description ? (
          <EuiText size="xs" color="subdued">
            <p css={descriptionStyles}>{description}</p>
          </EuiText>
        ) : null}
      </div>
      <div css={actionStyles}>
        {action.disabledReason === undefined ? (
          button
        ) : (
          <EuiToolTip position="top" content={action.disabledReason}>
            {button}
          </EuiToolTip>
        )}
      </div>
    </EuiPanel>
  );
}
