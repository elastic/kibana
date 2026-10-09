/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip, useEuiTheme } from '@elastic/eui';

export const RuleCoverage = ({
  covered,
  total,
  partial,
  showGaps,
  onToggleGaps,
}: {
  covered: number;
  total: number;
  partial: boolean;
  showGaps: boolean;
  onToggleGaps: () => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const percent = total ? Math.round((covered / total) * 100) : 0;
  const label = i18n.translate('xpack.significantEventsApp.ruleCoverage.label', {
    defaultMessage: 'Rule coverage',
  });
  const summary = i18n.translate('xpack.significantEventsApp.ruleCoverage.summary', {
    defaultMessage: '{covered} of {total} services have rules',
    values: { covered, total },
  });
  return (
    <div
      data-test-subj="detectionRuleCoverage"
      css={css`
        display: grid;
        grid-template-columns: minmax(110px, 1fr) auto;
        gap: ${euiTheme.size.s};
        align-items: center;
      `}
    >
      <EuiToolTip
        display="block"
        content={
          <span>
            {summary}.{' '}
            {i18n.translate('xpack.significantEventsApp.ruleCoverage.definition', {
              defaultMessage:
                'A service counts when it has at least one unexpired query with a backing rule. This measures rule presence across discovered services, not complete monitoring of every failure mode.',
            })}{' '}
            {partial &&
              i18n.translate('xpack.significantEventsApp.ruleCoverage.partial', {
                defaultMessage: 'Some rules could not be loaded; this value is a lower bound.',
              })}
          </span>
        }
      >
        <div
          tabIndex={0}
          css={css`
            display: grid;
            gap: ${euiTheme.size.xs};
            font-size: ${euiTheme.font.scale.xs}rem;
            border-radius: ${euiTheme.border.radius.small};
            &:focus-visible {
              outline: 2px solid ${euiTheme.colors.primary};
            }
          `}
        >
          <div
            css={css`
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              gap: ${euiTheme.size.s};
            `}
          >
            <span
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {label}
            </span>
            <strong
              css={css`
                font-size: ${euiTheme.font.scale.s}rem;
                font-variant-numeric: tabular-nums;
                color: ${euiTheme.colors.text};
              `}
            >
              {total ? `${partial ? '≥' : ''}${percent}%` : '—'}
            </strong>
          </div>
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.s};
            `}
          >
            <div
              role={total ? 'progressbar' : undefined}
              aria-label={summary}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={total ? percent : undefined}
              css={css`
                flex: 1;
                height: 5px;
                overflow: hidden;
                border-radius: 4px;
                background: ${euiTheme.colors.backgroundBaseSubdued};
              `}
            >
              <div
                style={{ width: `${percent}%` }}
                css={css`
                  height: 100%;
                  border-radius: 4px;
                  background: linear-gradient(
                    90deg,
                    color-mix(
                      in srgb,
                      ${euiTheme.colors.primary} 55%,
                      ${euiTheme.colors.backgroundBaseSubdued}
                    ),
                    ${euiTheme.colors.primary}
                  );
                  transition: width 300ms ease;
                  @media (prefers-reduced-motion: reduce) {
                    transition: none;
                  }
                `}
              />
            </div>
            <span
              css={css`
                color: ${euiTheme.colors.textSubdued};
                font-variant-numeric: tabular-nums;
              `}
            >
              {covered}/{total}
            </span>
          </div>
        </div>
      </EuiToolTip>
      {(covered < total || showGaps) && (
        <EuiButtonEmpty
          size="xs"
          iconType={showGaps ? 'cross' : 'filter'}
          aria-pressed={showGaps}
          onClick={onToggleGaps}
          data-test-subj="detectionRuleCoverageShowGaps"
        >
          {showGaps
            ? i18n.translate('xpack.significantEventsApp.ruleCoverage.allServices', {
                defaultMessage: 'All services',
              })
            : i18n.translate('xpack.significantEventsApp.ruleCoverage.showGaps', {
                defaultMessage: 'Show gaps',
              })}
        </EuiButtonEmpty>
      )}
    </div>
  );
};
