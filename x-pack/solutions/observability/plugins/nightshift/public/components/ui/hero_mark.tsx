/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftMarkIcon } from '@kbn/observability-shared-plugin/public';

export type HeroMarkSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface HeroMarkProps {
  /** Highest finished severity that still needs attention; omit the dot when unset. */
  severity?: HeroMarkSeverity;
}

const HERO_MARK_DOT_COLOR: Record<
  HeroMarkSeverity,
  | 'backgroundFilledDanger'
  | 'backgroundFilledRisk'
  | 'backgroundFilledWarning'
  | 'backgroundFilledNeutral'
> = {
  critical: 'backgroundFilledDanger',
  high: 'backgroundFilledRisk',
  medium: 'backgroundFilledWarning',
  low: 'backgroundFilledNeutral',
};

/** AlertZero-style product mark: bordered circle, paragraph-colored glyph, optional severity dot. */
export function HeroMark({ severity }: HeroMarkProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const dotColor = severity ? euiTheme.colors[HERO_MARK_DOT_COLOR[severity]] : undefined;

  return (
    <div
      aria-label={i18n.translate('xpack.nightshift.hero.nightshiftIconAriaLabel', {
        defaultMessage: 'Nightshift',
      })}
      role="img"
      css={css`
        align-items: center;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        border-radius: 50%;
        color: ${euiTheme.colors.textParagraph};
        display: inline-flex;
        height: calc(${euiTheme.size.xxl} + ${euiTheme.size.s});
        justify-content: center;
        position: relative;
        width: calc(${euiTheme.size.xxl} + ${euiTheme.size.s});
      `}
    >
      <NightshiftMarkIcon size={16} />
      {dotColor && (
        <span
          aria-hidden={true}
          css={css`
            background: ${dotColor};
            border-radius: 50%;
            box-shadow: 0 0 0 ${euiTheme.border.width.thick} ${euiTheme.colors.textGhost};
            height: ${euiTheme.size.s};
            pointer-events: none;
            position: absolute;
            right: 2px;
            top: 2px;
            width: ${euiTheme.size.s};
          `}
        />
      )}
    </div>
  );
}

/** Highest severity with a non-zero finished count; `undefined` when none need attention. */
export function getHeroMarkSeverity(counts: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}): HeroMarkSeverity | undefined {
  if (counts.critical > 0) {
    return 'critical';
  }
  if (counts.high > 0) {
    return 'high';
  }
  if (counts.medium > 0) {
    return 'medium';
  }
  if (counts.low > 0) {
    return 'low';
  }
  return undefined;
}
