/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, type EuiThemeComputed, type EuiThemeFontSize } from '@elastic/eui';
import styled from '@emotion/styled';

export const TagCount = styled(EuiBadge)`
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
`;

export const TagText = styled.div<{
  shouldShowBadge: boolean;
  euiTheme: EuiThemeComputed;
  xxsFontSize: EuiThemeFontSize;
}>`
  display: inline-flex;
  align-items: center;

  padding: ${({ euiTheme }) => `0 ${euiTheme.size.s}`};

  background-color: ${({ euiTheme }) => euiTheme.colors.backgroundBasePlain};
  border: ${({ euiTheme }) => euiTheme.border.thin};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};

  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
  text-transform: capitalize;

  ${({ xxsFontSize }) => xxsFontSize};

  ${({ shouldShowBadge }) =>
    shouldShowBadge
      ? `
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left-width: 0;
      `
      : ''}
`;
