/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const TutorialCardStyles = ({ euiTheme }: UseEuiTheme) => css`
  cursor: pointer;
  border-radius: ${euiTheme.border.radius.medium};
  border: 1px solid ${euiTheme.colors.borderBaseSubdued};
  padding: ${euiTheme.size.base};
  &:hover {
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    .tutorialTitle {
      color: ${euiTheme.colors.textPrimary};
    }
    border-color: transparent;
  }
`;
