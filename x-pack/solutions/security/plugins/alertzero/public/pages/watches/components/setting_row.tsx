/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';

/** Fixed label-column width, ported from the Sep 14 prototype (notdaybreak_mvp WorkerSettingsForm). */
const LABEL_COL_PX = 200;
const LABEL_CONTROL_GAP_PX = 24;
const ROW_PAD_BLOCK_PX = 12;

interface SettingRowProps {
  label: string;
  /** Optional subdued line under the row label (e.g. the Autonomy intro sentence). */
  labelHelp?: React.ReactNode;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/**
 * Label-left / control-right settings row: a two-column grid with a fixed-width label column so
 * every row aligns on the same label/control boundary regardless of control width.
 */
export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  labelHelp,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  return (
    <div
      data-test-subj={dataTestSubj}
      css={css`
        display: grid;
        grid-template-columns: ${LABEL_COL_PX}px minmax(0, 1fr);
        column-gap: ${LABEL_CONTROL_GAP_PX}px;
        align-items: start;
        padding-block: ${ROW_PAD_BLOCK_PX}px;
      `}
    >
      <div>
        <EuiText
          size="s"
          css={css`
            white-space: nowrap;
          `}
        >
          <strong>{label}</strong>
        </EuiText>
        {labelHelp ? (
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              margin-top: 3px;
            `}
          >
            <p
              css={css`
                margin: 0;
              `}
            >
              {labelHelp}
            </p>
          </EuiText>
        ) : null}
      </div>
      <div
        css={css`
          min-width: 0;
        `}
      >
        {children}
      </div>
    </div>
  );
};
