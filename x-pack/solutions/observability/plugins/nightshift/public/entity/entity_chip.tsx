/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { getEbtProps, type EbtClickAttrs } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { nightshiftBackgroundTransition } from '../common/transition';

export interface EntityChipProps {
  ebt?: EbtClickAttrs;
  label: string;
  onClick: () => void;
  testSubj?: string;
  size?: 'default' | 'compact';
}

export function EntityChip({
  ebt,
  label,
  onClick,
  testSubj = 'nightshiftEntityChip',
  size = 'default',
}: EntityChipProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const isCompact = size === 'compact';

  return (
    <button
      type="button"
      data-test-subj={testSubj}
      {...(ebt ? getEbtProps(ebt) : {})}
      aria-label={i18n.translate('xpack.nightshift.entityChip.viewDetailsLabel', {
        defaultMessage: 'View entity details for {label}',
        values: { label },
      })}
      onClick={onClick}
      css={css`
        align-items: center;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: ${euiTheme.border.thin};
        border-radius: ${isCompact ? euiTheme.size.base : euiTheme.size.l};
        box-sizing: border-box;
        color: ${euiTheme.colors.textParagraph};
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        gap: ${euiTheme.size.xs};
        height: ${isCompact ? euiTheme.size.xl : undefined};
        padding: ${isCompact ? `0 ${euiTheme.size.m}` : `${euiTheme.size.s} ${euiTheme.size.m}`};
        transition: ${nightshiftBackgroundTransition(euiTheme)};

        &:hover,
        &:focus-visible {
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }

        &:focus-visible {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
          outline-offset: ${euiTheme.border.width.thin};
        }
      `}
    >
      <EuiText size="xs">{label}</EuiText>
      <EuiIcon type="arrowRight" size="s" color="subdued" aria-hidden={true} />
    </button>
  );
}
