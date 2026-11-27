/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnWarningCallout } from '@kbn/ui-callout';
import {
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
  MOBILE_APPLICATION_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { MobileOnboardingPrompt } from '../../../components/mobile_onboarding_prompt';
import { MobileUnreadableDataPrompt } from '../../../components/mobile_unreadable_data_prompt';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { useFormatters, type Formatters } from '../../../hooks/use_formatters';
import { useQueryParam } from '../../../hooks/use_query_param';
import {
  COMPARE_LABEL,
  MOBILE_ERROR_RATE_DESCRIPTION,
  MOBILE_USERS_DESCRIPTION,
} from '../../../labels';
import { ComparedKpiPanel } from '../../../components/compared_kpi_panel';
import type { ComparedKpiPanelProps } from '../../../components/compared_kpi_panel';
import { START_TYPE_LIST, type StartType } from '../../../../common/mobile/app_starts';
import type { MobileKpisResponse } from '../../../../common/types/mobile';
import { formatDurationMs } from '../../../utils/format_duration';
import { APP_START_TITLES, NO_APP_STARTS_LABEL, appStartTooltip } from './app_start_labels';
import { Performance } from './performance/performance';
import { useMobileAppStarts } from './performance/use_mobile_app_starts';
import { ReleaseHealth } from './release_health/release_health';
import { useMobileReleases } from './release_health/use_mobile_releases';
import { MobileToolbar, useMobileFilters } from './mobile_toolbar';
import type { MobileKpisState } from './use_mobile_kpis';

const APP_START_KPIS = { cold: 'coldStart', warm: 'warmStart' } as const;

const APP_START_TEST_SUBJECTS: Readonly<Record<StartType, string>> = {
  cold: 'digitalExperienceMobileKpiColdStart',
  warm: 'digitalExperienceMobileKpiWarmStart',
};

type MobileKpi = 'sessions' | 'users' | 'errorRate' | (typeof APP_START_KPIS)[StartType];

/**
 * The KPI row, in order, the average cold and warm start last. Crash-free sessions joins it once a
 * crash is defined (#64), rather than showing "Not enough data" while crash reporting may already
 * work.
 */
const MOBILE_KPIS: ReadonlyArray<
  Pick<
    ComparedKpiPanelProps,
    'title' | 'changeUnit' | 'higherIsBetter' | 'emptyLabel' | 'data-test-subj'
  > & {
    kpi: MobileKpi;
    /** How the value is calculated, or a function of the response, e.g. to name the samples. */
    tooltip: string | ((kpis: MobileKpisResponse | undefined, isComparing: boolean) => string);
    /** The user's number format unless set. */
    formatValue?: (formatters: Formatters) => (value: number) => string;
  }
> = [
  {
    kpi: 'sessions',
    'data-test-subj': 'digitalExperienceMobileKpiSessions',
    title: i18n.translate('xpack.digitalExperience.mobile.kpi.sessions', {
      defaultMessage: 'Sessions',
    }),
    tooltip: i18n.translate('xpack.digitalExperience.mobile.kpi.sessionsTooltip', {
      defaultMessage: 'Distinct session.id values in the time range.',
    }),
    changeUnit: 'relative',
  },
  {
    kpi: 'users',
    'data-test-subj': 'digitalExperienceMobileKpiUsers',
    title: i18n.translate('xpack.digitalExperience.mobile.kpi.users', {
      defaultMessage: 'Users',
    }),
    tooltip: MOBILE_USERS_DESCRIPTION,
    changeUnit: 'relative',
  },
  {
    kpi: 'errorRate',
    'data-test-subj': 'digitalExperienceMobileKpiErrorRate',
    title: i18n.translate('xpack.digitalExperience.mobile.kpi.errorRate', {
      defaultMessage: 'Error rate',
    }),
    tooltip: MOBILE_ERROR_RATE_DESCRIPTION,
    changeUnit: 'relative',
    higherIsBetter: false,
    formatValue: ({ formatErrorRate }) => formatErrorRate,
  },
  ...START_TYPE_LIST.map((startType) => ({
    kpi: APP_START_KPIS[startType],
    'data-test-subj': APP_START_TEST_SUBJECTS[startType],
    title: APP_START_TITLES[startType],
    tooltip: (kpis: MobileKpisResponse | undefined, isComparing: boolean) => {
      const start = kpis?.[APP_START_KPIS[startType]];
      return appStartTooltip(
        startType,
        start?.count ?? 0,
        isComparing ? start?.previousCount : undefined
      );
    },
    emptyLabel: NO_APP_STARTS_LABEL,
    changeUnit: 'relative' as const,
    higherIsBetter: false,
    formatValue: () => formatDurationMs,
  })),
];

const HEALTH_SUMMARY_TITLE = i18n.translate('xpack.digitalExperience.mobile.healthSummary.title', {
  defaultMessage: 'Health summary',
});

const CompareSwitch = ({
  isComparing,
  onToggle,
}: {
  isComparing: boolean;
  onToggle: () => void;
}) => (
  <EuiSwitch
    compressed
    label={COMPARE_LABEL}
    checked={isComparing}
    onChange={onToggle}
    data-test-subj="digitalExperienceMobileCompareToggle"
    {...getEbtProps({
      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.TOGGLE_COMPARE,
      element: MOBILE_APPLICATION_EBT_ELEMENTS.COMPARE_TOGGLE,
    })}
  />
);

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.loadError', {
  defaultMessage: 'Could not load the mobile application',
});

const PARTIAL_ACCESS_TITLE = i18n.translate('xpack.digitalExperience.mobile.partialAccess', {
  defaultMessage:
    "You can't read all of the mobile indices, so these values may be missing some data. Ask an administrator for read access to them.",
});

const UNREADABLE_DATA_TITLE = i18n.translate(
  'xpack.digitalExperience.mobile.unreadableData.title',
  {
    defaultMessage: 'No mobile data for this application in the indices you can read',
  }
);

const NO_DATA_TITLE = i18n.translate('xpack.digitalExperience.mobile.empty.title', {
  defaultMessage: 'No mobile data for this application',
});

const NO_DATA_BODY = i18n.translate('xpack.digitalExperience.mobile.empty.body', {
  defaultMessage:
    'There is no data from EDOT Android or EDOT iOS for this application in the selected time range and filters. Try a wider time range, or instrument the application.',
});

const NO_MATCHES_TITLE = i18n.translate('xpack.digitalExperience.mobile.noMatches.title', {
  defaultMessage: 'No mobile data matches the filters',
});

const NO_MATCHES_BODY = i18n.translate('xpack.digitalExperience.mobile.noMatches.body', {
  defaultMessage:
    'No mobile data for this application matches the selected environment, OS and release. Clear the filters, or try a wider time range.',
});

/**
 * The Overview of a mobile application's page, all its platforms: the toolbar its tabs share, the
 * health summary, the release health and the performance. The sibling issues add their sections
 * below it as they fill them.
 */
export function MobileOverview({
  serviceName,
  kpisState: { kpis, currentKpis, isLoading, error, refresh: refreshKpis },
}: {
  serviceName: string;
  /** Fetched by the page, whose header shows its platforms. */
  kpisState: MobileKpisState;
}) {
  // Fetched here, so only the Overview runs its queries; the toolbar's refresh reloads them with the KPIs.
  const releasesState = useMobileReleases(serviceName);
  const appStartsState = useMobileAppStarts(serviceName);
  const refresh = () => {
    refreshKpis();
    releasesState.refresh();
    appStartsState.refresh();
  };
  const formatters = useFormatters();
  const { formatNumber } = formatters;
  // In the URL, so a reload or a shared link keeps them; the toolbar sets the OS and release.
  const { value: release, setValue: setRelease } = useQueryParam('release');
  const { value: compare, setValue: setCompare } = useQueryParam('compare');
  const isComparing = compare === 'true';
  const healthSummaryTitleId = useGeneratedHtmlId({ prefix: 'healthSummaryTitle' });
  // Every release of the OS whatever the release filter, so colours don't change when filtering
  const rankedReleases = useMemo(
    () => (kpis?.releases ?? []).map(({ key }) => key),
    [kpis?.releases]
  );

  const hasNoData = currentKpis !== undefined && !currentKpis.hasData;
  const { isFiltered, clearFiltersButton } = useMobileFilters();
  const errorPrompt = error ? (
    <LoadErrorPrompt
      data-test-subj="digitalExperienceMobileKpisError"
      retryDataTestSubj="digitalExperienceMobileKpisRetry"
      retryEbtElement={MOBILE_APPLICATION_EBT_ELEMENTS.RETRY}
      title={LOAD_ERROR_TITLE}
      error={error}
      onRetry={refresh}
    />
  ) : undefined;

  return (
    <>
      <MobileToolbar kpis={kpis} isLoading={isLoading} onRefresh={refresh} />
      <EuiSpacer size="m" />
      {!errorPrompt && !hasNoData && currentKpis?.isPartial && (
        <>
          <KbnWarningCallout
            data-test-subj="digitalExperienceMobileKpisPartialAccess"
            size="s"
            title={PARTIAL_ACCESS_TITLE}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {errorPrompt ??
        (hasNoData ? (
          // Without full access, the data may be in the indices the user can't read.
          currentKpis?.isPartial ? (
            <MobileUnreadableDataPrompt
              data-test-subj="digitalExperienceMobileUnreadableData"
              title={UNREADABLE_DATA_TITLE}
              isFiltered={isFiltered}
              actions={clearFiltersButton}
            />
          ) : // With full access, nothing matching the filters isn't a reason to instrument the app.
          isFiltered ? (
            <EuiEmptyPrompt
              data-test-subj="digitalExperienceMobileNoMatches"
              iconType="magnify"
              titleSize="s"
              title={<h2>{NO_MATCHES_TITLE}</h2>}
              body={<p>{NO_MATCHES_BODY}</p>}
              actions={clearFiltersButton}
            />
          ) : (
            <MobileOnboardingPrompt
              data-test-subj="digitalExperienceMobileEmpty"
              title={NO_DATA_TITLE}
              body={NO_DATA_BODY}
            />
          )
        ) : (
          <>
            <section aria-labelledby={healthSummaryTitleId}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2 id={healthSummaryTitleId}>{HEALTH_SUMMARY_TITLE}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <CompareSwitch
                    isComparing={isComparing}
                    onToggle={() => setCompare(isComparing ? undefined : 'true')}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="m" data-test-subj="digitalExperienceMobileKpis" wrap>
                {MOBILE_KPIS.map(({ kpi, formatValue, tooltip, ...panel }) => (
                  <ComparedKpiPanel
                    key={kpi}
                    {...panel}
                    tooltip={
                      typeof tooltip === 'string' ? tooltip : tooltip(currentKpis, isComparing)
                    }
                    value={currentKpis?.[kpi]}
                    formatValue={formatValue?.(formatters) ?? formatNumber}
                    isComparing={isComparing}
                    isLoading={isLoading}
                  />
                ))}
              </EuiFlexGroup>
            </section>
            <EuiSpacer size="l" />
            <ReleaseHealth
              releasesState={releasesState}
              selectedRelease={release}
              onSelectRelease={setRelease}
              rankedReleases={rankedReleases}
            />
            <EuiSpacer size="l" />
            <Performance appStartsState={appStartsState} />
          </>
        ))}
    </>
  );
}
