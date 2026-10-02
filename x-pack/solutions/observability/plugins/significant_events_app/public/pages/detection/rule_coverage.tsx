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
        display: flex;
        gap: ${euiTheme.size.s};
        align-items: center;
        margin-left: auto;
      `}
    >
      <EuiToolTip
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
            min-width: 155px;
            font-size: ${euiTheme.font.scale.xs}rem;
          `}
        >
          <div
            css={css`
              display: flex;
              align-items: baseline;
              justify-content: space-between;
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
            <strong>{total ? `${partial ? '≥' : ''}${percent}%` : '—'}</strong>
          </div>
          <div
            role={total ? 'progressbar' : undefined}
            aria-label={summary}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={total ? percent : undefined}
            css={css`
              height: 4px;
              margin: ${euiTheme.size.xs} 0;
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
                background: ${euiTheme.colors.primary};
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
            `}
          >
            {covered}/{total}{' '}
            {i18n.translate('xpack.significantEventsApp.ruleCoverage.services', {
              defaultMessage: 'services',
            })}
          </span>
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
