/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiBasicTable, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ChangeDirection,
  ScorecardMeasure,
  ScorecardPeriod,
} from '../../../../common/types/scorecard';
import { ApplicationTabToolbar } from '../../../components/application_tab_toolbar';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { REPORTS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useFormatters } from '../../../hooks/use_formatters';
import { useLastEnvironments } from '../../../hooks/use_last_environments';
import { formatMeasureChange, formatMeasureValue } from './format_measure';
import { useScorecardReport } from './use_scorecard_report';

const FETCH_ERROR_TITLE = i18n.translate('xpack.digitalExperience.report.scorecard.fetchError', {
  defaultMessage: 'Could not load the scorecard',
});

const DIRECTION_BADGES: Record<ChangeDirection, { color: string; label: string } | undefined> = {
  better: {
    color: 'success',
    label: i18n.translate('xpack.digitalExperience.report.scorecard.better', {
      defaultMessage: 'Better',
    }),
  },
  worse: {
    color: 'danger',
    label: i18n.translate('xpack.digitalExperience.report.scorecard.worse', {
      defaultMessage: 'Worse',
    }),
  },
  unchanged: {
    color: 'hollow',
    label: i18n.translate('xpack.digitalExperience.report.scorecard.unchanged', {
      defaultMessage: 'Unchanged',
    }),
  },
  neutral: undefined,
  unknown: undefined,
};

const COLUMN_LABELS = {
  measure: i18n.translate('xpack.digitalExperience.report.scorecard.measureColumn', {
    defaultMessage: 'Measure',
  }),
  value: i18n.translate('xpack.digitalExperience.report.scorecard.valueColumn', {
    defaultMessage: 'This period',
  }),
  previous: i18n.translate('xpack.digitalExperience.report.scorecard.previousColumn', {
    defaultMessage: 'Previous period',
  }),
  change: i18n.translate('xpack.digitalExperience.report.scorecard.changeColumn', {
    defaultMessage: 'Change',
  }),
};

const periodLabel = (
  period: ScorecardPeriod,
  previousPeriod: ScorecardPeriod,
  formatDate: (date: number) => string
) =>
  i18n.translate('xpack.digitalExperience.report.scorecard.periods', {
    defaultMessage: '{start} – {end}, compared with {previousStart} – {previousEnd}',
    values: {
      start: formatDate(period.start),
      end: formatDate(period.end),
      previousStart: formatDate(previousPeriod.start),
      previousEnd: formatDate(previousPeriod.end),
    },
  });

/** The scorecard of one EDOT Browser application, each measure next to the previous period's. */
export function ScorecardReport({ serviceName }: { serviceName: string }) {
  const { response, isLoading, error, refresh } = useScorecardReport(serviceName);
  const environments = useLastEnvironments(serviceName, response);
  const formatters = useFormatters();

  const columns: Array<EuiBasicTableColumn<ScorecardMeasure>> = [
    { field: 'label', name: COLUMN_LABELS.measure },
    {
      name: COLUMN_LABELS.value,
      align: 'right',
      render: ({ value, unit }: ScorecardMeasure) => formatMeasureValue(value, unit, formatters),
    },
    {
      name: COLUMN_LABELS.previous,
      align: 'right',
      render: ({ previous, unit }: ScorecardMeasure) =>
        formatMeasureValue(previous, unit, formatters),
    },
    {
      name: COLUMN_LABELS.change,
      align: 'right',
      render: ({ change, direction }: ScorecardMeasure) => {
        const badge = DIRECTION_BADGES[direction];
        return (
          <>
            {formatMeasureChange(change, formatters)}{' '}
            {badge && <EuiBadge color={badge.color}>{badge.label}</EuiBadge>}
          </>
        );
      },
    },
  ];

  return (
    <div data-test-subj="digitalExperienceScorecardReport">
      <EuiSpacer size="m" />
      <ApplicationTabToolbar
        environments={environments}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <EuiSpacer size="m" />
      {error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceScorecardError"
          retryDataTestSubj="digitalExperienceScorecardRetry"
          retryEbtElement={REPORTS_EBT_ELEMENTS.SCORECARD_RETRY}
          title={FETCH_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      ) : (
        <>
          {response && (
            <EuiText size="s" color="subdued" data-test-subj="digitalExperienceScorecardPeriods">
              <p>{periodLabel(response.period, response.previousPeriod, formatters.formatDate)}</p>
            </EuiText>
          )}
          {(response?.sections ?? []).map(({ id, title, measures }) => (
            <React.Fragment key={id}>
              <EuiSpacer size="m" />
              <EuiPanel hasBorder data-test-subj={`digitalExperienceScorecardSection-${id}`}>
                <EuiTitle size="xs">
                  <h3>{title}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiBasicTable
                  tableCaption={title}
                  items={measures}
                  columns={columns}
                  rowProps={({ id: measureId }) => ({
                    'data-test-subj': `digitalExperienceScorecardMeasure-${measureId}`,
                  })}
                />
              </EuiPanel>
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
}
