/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiIcon, useEuiShadow, useEuiTheme, type IconType } from '@elastic/eui';
import { AiIcon } from '@kbn/shared-ux-ai-components';

export type IconMarkColor = 'neutral' | 'ai';

export interface IconMarkProps {
  icon: IconType;
  /** Product logos: plain plate + shadow instead of the highlighted outline. */
  isLogo?: boolean;
  /**
   * `neutral` — backgroundBaseHighlighted + borderBaseSubdued (suggestions, automation tiles).
   * `ai` — light AI surface + AiIcon gradient (analyzing banner).
   */
  color?: IconMarkColor;
  /** Optional plate fill when `color="ai"`. */
  surface?: string;
}

/** 40px leading icon plate shared by onboarding suggestion rows and automation cards. */
export function IconMark({
  icon,
  isLogo = false,
  color = 'neutral',
  surface,
}: IconMarkProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const plateShadow = useEuiShadow('xs');
  const plate =
    isLogo
      ? css`
          background: ${euiTheme.colors.backgroundBasePlain};
          color: ${euiTheme.colors.textHeading};
          ${plateShadow}
        `
      : color === 'ai'
        ? css`
            background: ${surface ??
            `linear-gradient(99.4deg, ${euiTheme.colors.backgroundLightPrimary} 3.97%, ${euiTheme.colors.backgroundLightAssistance} 65.6%)`};
          `
        : css`
            background: ${euiTheme.colors.backgroundBaseHighlighted};
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
            color: ${euiTheme.colors.textParagraph};
          `;

  return (
    <div
      aria-hidden={true}
      css={css`
        box-sizing: border-box;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${euiTheme.size.xxl};
        height: ${euiTheme.size.xxl};
        border-radius: ${euiTheme.size.s};
        ${plate}
      `}
    >
      {color === 'ai' && icon === 'inspect' ? (
        <AiIcon iconType="inspect" size="m" aria-hidden={true} />
      ) : (
        <EuiIcon type={icon} size="m" aria-hidden={true} />
      )}
    </div>
  );
}
