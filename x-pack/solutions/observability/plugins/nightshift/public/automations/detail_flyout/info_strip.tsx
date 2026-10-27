/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const InfoStrip = ({
  items,
}: {
  items: Array<{
    title: string;
    value: React.ReactNode;
    gap?: 'xs' | 's';
    tooltip?: string;
    onClick?: () => void;
  }>;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        & > * {
          position: relative;
          min-inline-size: 0;
          padding: ${euiTheme.size.m};
        }
        & > :not(:last-child)::before {
          content: '';
          position: absolute;
          inset-inline-end: 0;
          inset-block: ${euiTheme.size.base};
          inline-size: ${euiTheme.border.width.thin};
          background-color: ${euiTheme.border.color};
        }
      `}
    >
      {items.map(({ title, value, gap = 's', tooltip, onClick }) => {
        const cell = (
          <>
            <EuiText size="xs" color="subdued">
              {title}
            </EuiText>
            <EuiText
              size="s"
              css={{ display: 'flex', alignItems: 'center', paddingBlockStart: euiTheme.size[gap] }}
            >
              {value}
            </EuiText>
          </>
        );
        if (!onClick) return <div key={title}>{cell}</div>;
        return (
          <EuiToolTip key={title} content={tooltip} display="block">
            <div
              role="button"
              tabIndex={0}
              data-test-subj="automationInfoRuns"
              css={{ cursor: 'pointer', inlineSize: '100%' }}
              onClick={onClick}
              onKeyDown={(event) => event.key === 'Enter' && onClick()}
            >
              {cell}
            </div>
          </EuiToolTip>
        );
      })}
    </EuiPanel>
  );
};
