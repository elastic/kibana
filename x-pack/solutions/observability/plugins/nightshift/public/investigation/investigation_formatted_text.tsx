/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiMarkdownFormat, useEuiTheme } from '@elastic/eui';

/** Inline code size in flyouts that use 14px body text (matches event flyout markdown code). */
export const NIGHTSHIFT_INLINE_CODE_FONT_SIZE = '12px';

export function InvestigationFormattedText({
  text,
  subdued = false,
  bold = false,
  textSize = 's',
  fontSize,
}: {
  text: string;
  subdued?: boolean;
  bold?: boolean;
  textSize?: 's' | 'xs';
  fontSize?: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        overflow-wrap: anywhere;

        ${fontSize
          ? `
              font-size: ${fontSize};
              line-height: 1.5;

              .euiMarkdownFormat,
              .euiMarkdownFormat p,
              .euiMarkdownFormat span,
              .euiMarkdownFormat li {
                font-size: inherit;
                line-height: inherit;
              }

              .euiMarkdownFormat code {
                font-size: ${NIGHTSHIFT_INLINE_CODE_FONT_SIZE};
                line-height: 1.5;
              }
            `
          : ''}
        ${bold
          ? `
              font-weight: ${euiTheme.font.weight.bold};

              p,
              span,
              code {
                font-weight: ${euiTheme.font.weight.bold};
              }
            `
          : ''}
      `}
    >
      <EuiMarkdownFormat
        textSize={fontSize ? 'relative' : textSize}
        color={subdued ? 'subdued' : undefined}
      >
        {text}
      </EuiMarkdownFormat>
    </div>
  );
}
