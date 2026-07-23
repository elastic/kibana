/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface EntityChipProps {
  label: string;
  onClick: () => void;
  testSubj?: string;
}

export function EntityChip({
  label,
  onClick,
  testSubj = 'nightshiftEntityChip',
}: EntityChipProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <button
      type="button"
      data-test-subj={testSubj}
      aria-label={i18n.translate('xpack.observability.nightshift.entityChip.viewDetailsLabel', {
        defaultMessage: 'View entity details for {label}',
        values: { label },
      })}
      onClick={onClick}
      css={css`
        align-items: center;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.size.l};
        color: ${euiTheme.colors.textParagraph};
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        gap: ${euiTheme.size.xs};
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        transition: background 0.15s;

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
