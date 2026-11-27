/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiHealth,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type {
  ScorecardMeasure,
  ScorecardReport as ScorecardReportData,
  ScorecardVerdict,
} from '../../../../common/types/scorecard';
import { VitalRatingShares } from '../../../components/vital_rating_shares';
import type { Formatters } from '../../../hooks/use_formatters';
import { RATING_COLORS, RATING_LABELS } from '../../../utils/web_vitals';
import { CoreWebVitalsAssessment } from './core_web_vitals_assessment';
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

const DIRECTION_BADGES: Record<ScorecardVerdict, { color: string; label: string } | undefined> = {
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
  baseline: i18n.translate('xpack.digitalExperience.report.scorecard.baselineColumn', {
    defaultMessage: 'Last 4 periods',
  }),
  rating: i18n.translate('xpack.digitalExperience.report.scorecard.ratingColumn', {
    defaultMessage: 'Rating',
  }),
  good: i18n.translate('xpack.digitalExperience.report.scorecard.goodColumn', {
    defaultMessage: 'Good samples',
  }),
  samples: i18n.translate('xpack.digitalExperience.report.scorecard.samplesColumn', {
    defaultMessage: 'Samples',
  }),
};

const BASELINE_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.report.scorecard.baselineTooltip',
  {
    defaultMessage:
      'The measure over the four periods before this one, counts per period, and the change from it.',
  }
);

const SAMPLES_TOOLTIP = i18n.translate('xpack.digitalExperience.report.scorecard.samplesTooltip', {
  defaultMessage:
    "How many samples this period's value comes from, e.g. the timed page loads or the HTTP requests.",
});

const RATING_TOOLTIP = i18n.translate('xpack.digitalExperience.report.scorecard.ratingTooltip', {
  defaultMessage:
    "Google's rating of the 75th percentile. The assessment passes when LCP, INP and CLS are all good, INP only when it has samples.",
});

const GOOD_TOOLTIP = i18n.translate('xpack.digitalExperience.report.scorecard.goodTooltip', {
  defaultMessage: "The share of this period's samples that Google rates good.",
});

type ColumnFormatters = Pick<
  Formatters,
  | 'formatNumber'
  | 'formatDecimal'
  | 'formatKpiPercent'
  | 'formatPercent'
  | 'formatSignedNumber'
  | 'formatSignedPercent'
>;

/** A measure's value in its unit; the empty cell without one. */
const valueCell = (
  value: number | null,
  unit: ScorecardMeasure['unit'],
  formatters: ColumnFormatters
) => (value === null ? <EmptyCellValue /> : formatMeasureValue(value, unit, formatters));

/** The columns of a section's table; the web vitals' also have their rating and good share. */
const columnsOf = (
  sectionId: ScorecardReportData['sections'][number]['id'],
  formatters: ColumnFormatters
): Array<EuiBasicTableColumn<ScorecardMeasure>> => {
  const vitalColumns: Array<EuiBasicTableColumn<ScorecardMeasure>> = [
    {
      name: COLUMN_LABELS.rating,
      nameTooltip: { content: RATING_TOOLTIP },
      render: ({ rating }: ScorecardMeasure) =>
        rating === null ? (
          <EmptyCellValue />
        ) : (
          <EuiHealth color={RATING_COLORS[rating]}>{RATING_LABELS[rating]}</EuiHealth>
        ),
    },
    {
      name: COLUMN_LABELS.good,
      nameTooltip: { content: GOOD_TOOLTIP },
      align: 'right',
      render: ({ ratings }: ScorecardMeasure) =>
        ratings === null ? (
          <EmptyCellValue />
        ) : (
          <EuiToolTip
            content={
              <VitalRatingShares ratings={ratings} formatPercent={formatters.formatPercent} />
            }
          >
            <span tabIndex={0}>{formatters.formatKpiPercent(ratings.good)}</span>
          </EuiToolTip>
        ),
    },
  ];
  return [
    { field: 'label', name: COLUMN_LABELS.measure },
    {
      name: COLUMN_LABELS.value,
      align: 'right',
      render: ({ value, unit }: ScorecardMeasure) => valueCell(value, unit, formatters),
    },
    ...(sectionId === 'webVitals' ? vitalColumns : []),
    {
      name: COLUMN_LABELS.previous,
      align: 'right',
      render: ({ previous, unit }: ScorecardMeasure) => valueCell(previous, unit, formatters),
    },
    {
      name: COLUMN_LABELS.change,
      align: 'right',
      render: (measure: ScorecardMeasure) => {
        const badge = DIRECTION_BADGES[measure.direction];
        return (
          <>
            {formatMeasureChange(measure, formatters) ?? <EmptyCellValue />}{' '}
            {badge && <EuiBadge color={badge.color}>{badge.label}</EuiBadge>}
          </>
        );
      },
    },
    {
      name: COLUMN_LABELS.baseline,
      nameTooltip: { content: BASELINE_TOOLTIP },
      align: 'right',
      render: ({ value, baseline, unit, changeUnit }: ScorecardMeasure) => {
        if (baseline === null) {
          return <EmptyCellValue />;
        }
        const change = formatMeasureChange({ value, previous: baseline, changeUnit }, formatters);
        return (
          <span>
            {formatMeasureValue(baseline, unit, formatters)}
            {change && (
              <EuiText size="xs" color="subdued" component="span">
                {' '}
                ({change})
              </EuiText>
            )}
          </span>
        );
      },
    },
    {
      name: COLUMN_LABELS.samples,
      nameTooltip: { content: SAMPLES_TOOLTIP },
      align: 'right',
      render: ({ sampleCount }: ScorecardMeasure) =>
        sampleCount === null ? <EmptyCellValue /> : formatters.formatNumber(sampleCount),
    },
  ];
};

const periodLabel = (
  { period, previousPeriod, baselinePeriod }: ScorecardReportData,
  formatDate: (date: number) => string
) =>
  i18n.translate('xpack.digitalExperience.report.scorecard.periods', {
    defaultMessage:
      '{start} – {end}, compared with {previousStart} – {previousEnd} and with the four periods from {baselineStart}',
    values: {
      start: formatDate(period.start),
      end: formatDate(period.end),
      previousStart: formatDate(previousPeriod.start),
      previousEnd: formatDate(previousPeriod.end),
      baselineStart: formatDate(baselinePeriod.start),
    },
  });

/** The scorecard of one EDOT Browser application, each measure next to the previous period's. */
export function ScorecardReport({ serviceName }: { serviceName: string }) {
  const { response, isLoading, error, refresh } = useScorecardReport(serviceName);
  const environments = useLastEnvironments(serviceName, response);
  const formatters = useFormatters();

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
          {isLoading && !response && (
            <EuiLoadingSpinner size="xl" data-test-subj="digitalExperienceScorecardLoading" />
          )}
          {response && (
            <EuiText size="s" color="subdued" data-test-subj="digitalExperienceScorecardPeriods">
              <p>{periodLabel(response, formatters.formatDate)}</p>
            </EuiText>
          )}
          {response?.sections.map(({ id, title, measures }) => (
            <React.Fragment key={id}>
              <EuiSpacer size="m" />
              <EuiPanel hasBorder data-test-subj={`digitalExperienceScorecardSection-${id}`}>
                <EuiTitle size="xs">
                  <h3>{title}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {id === 'webVitals' && (
                  <>
                    <CoreWebVitalsAssessment
                      current={response.coreWebVitals.current}
                      previous={response.coreWebVitals.previous}
                    />
                    <EuiSpacer size="s" />
                  </>
                )}
                <EuiBasicTable
                  tableCaption={title}
                  items={measures}
                  columns={columnsOf(id, formatters)}
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
