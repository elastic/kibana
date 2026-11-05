/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIconTip, EuiScreenReaderOnly, EuiText, useGeneratedHtmlId } from '@elastic/eui';

/** Fixed label-column width, ported from the Sep 14 prototype (notdaybreak_mvp WorkerSettingsForm). */
const LABEL_COL_PX = 200;
const LABEL_CONTROL_GAP_PX = 24;
const ROW_PAD_BLOCK_PX = 12;

interface SettingRowProps {
  label: string;
  /** Optional subdued line under the row label (e.g. the Autonomy intro sentence). */
  labelHelp?: React.ReactNode;
  /**
   * Optional longer explanation behind an info icon next to the row label. Screen readers get it as
   * part of the row's description, so controls don't need their own `aria-describedby` for it.
   */
  labelTooltip?: string;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/**
 * Label-left / control-right settings row: a two-column grid with a fixed-width label column so
 * every row aligns on the same label/control boundary regardless of control width.
 *
 * The control column is a labelled group, so a screen reader entering any control announces the
 * row label and its help line; the controls themselves only need their own `aria-label`.
 */
export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  labelHelp,
  labelTooltip,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const labelId = useGeneratedHtmlId({ prefix: 'alertZeroSettingRowLabel' });
  const helpId = useGeneratedHtmlId({ prefix: 'alertZeroSettingRowHelp' });
  const tooltipId = useGeneratedHtmlId({ prefix: 'alertZeroSettingRowTooltip' });
  const describedBy =
    [labelHelp ? helpId : undefined, labelTooltip ? tooltipId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div
      data-test-subj={dataTestSubj}
      css={css`
        display: grid;
        grid-template-columns: ${LABEL_COL_PX}px minmax(0, 1fr);
        @media (max-width: 960px) {
          grid-template-columns: minmax(0, 1fr);
        }
        column-gap: ${LABEL_CONTROL_GAP_PX}px;
        align-items: start;
        padding-block: ${ROW_PAD_BLOCK_PX}px;
      `}
    >
      <div>
        <EuiText size="s">
          {labelTooltip ? (
            // Flex keeps the icon beside the label, even when a long label wraps; an inline icon
            // after a non-breaking space can still wrap onto its own line.
            <span
              css={css`
                display: inline-flex;
                align-items: baseline;
                gap: 4px;
              `}
            >
              <strong id={labelId}>{label}</strong>
              <EuiIconTip
                type="info"
                color="subdued"
                content={labelTooltip}
                iconProps={{
                  'data-test-subj': dataTestSubj ? `${dataTestSubj}Tooltip` : undefined,
                }}
              />
              <EuiScreenReaderOnly>
                <span id={tooltipId}>{labelTooltip}</span>
              </EuiScreenReaderOnly>
            </span>
          ) : (
            <strong id={labelId}>{label}</strong>
          )}
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
              id={helpId}
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
        role="group"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        css={css`
          min-width: 0;
        `}
      >
        {children}
      </div>
    </div>
  );
};
