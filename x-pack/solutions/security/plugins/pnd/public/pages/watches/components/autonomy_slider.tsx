/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiLink, EuiRange, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import * as i18n from '../translations';

export type UiAutonomy = 'manual' | 'assisted' | 'supervised';

const UI_LEVELS: UiAutonomy[] = ['manual', 'assisted', 'supervised'];

const LEVEL_BLURB: Record<UiAutonomy, string> = {
  manual: i18n.AUTONOMY_BLURB_MANUAL,
  assisted: i18n.AUTONOMY_BLURB_ASSISTED,
  supervised: i18n.AUTONOMY_BLURB_SUPERVISED,
};

interface AutonomySliderProps {
  value: UiAutonomy;
  onChange: (next: UiAutonomy) => void;
  onViewGuardrails?: () => void;
}

export const AutonomySlider: React.FC<AutonomySliderProps> = ({
  value,
  onChange,
  onViewGuardrails,
}) => {
  const { euiTheme } = useEuiTheme();
  const index = Math.max(0, UI_LEVELS.indexOf(value));

  return (
    <div>
      <EuiRange
        min={0}
        max={2}
        step={1}
        value={index}
        onChange={(e) => {
          const next = UI_LEVELS[Number(e.currentTarget.value)] ?? 'assisted';
          onChange(next);
        }}
        showTicks
        ticks={[
          { label: i18n.AUTONOMY_MANUAL, value: 0 },
          { label: i18n.AUTONOMY_ASSISTED, value: 1 },
          { label: i18n.AUTONOMY_SUPERVISED, value: 2 },
        ]}
        aria-label={i18n.AUTONOMY_LEVEL}
        fullWidth
        data-test-subj="pndWatchAutonomySlider"
      />
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          <strong>
            {value === 'manual'
              ? i18n.AUTONOMY_MANUAL
              : value === 'assisted'
              ? i18n.AUTONOMY_ASSISTED
              : i18n.AUTONOMY_SUPERVISED}
          </strong>
          {' — '}
          {LEVEL_BLURB[value]}
        </p>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          display: flex;
          align-items: baseline;
          gap: ${euiTheme.size.xs};
          flex-wrap: wrap;
        `}
      >
        <span>{i18n.AUTONOMY_GUARDRAILS_NOTE}</span>
        {onViewGuardrails ? (
          <EuiLink onClick={onViewGuardrails}>{i18n.AUTONOMY_VIEW_GUARDRAILS}</EuiLink>
        ) : null}
      </EuiText>
    </div>
  );
};
