/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { ApplicationTabToolbar } from '../../../components/application_tab_toolbar';
import { FacetFilter } from '../../../components/facet_filter';
import {
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
  MOBILE_APPLICATION_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { MobileOnboardingPrompt } from '../../../components/mobile_onboarding_prompt';
import { MobileUnreadableDataPrompt } from '../../../components/mobile_unreadable_data_prompt';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { useEnvironment } from '../../../hooks/use_environment';
import { useFormatters } from '../../../hooks/use_formatters';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import { MOBILE_ERROR_RATE_DESCRIPTION, MOBILE_USERS_DESCRIPTION } from '../../../labels';
import { MobilePanel } from './mobile_panel';
import type { MobilePanelProps } from './mobile_panel';
import type { MobileKpisState } from './use_mobile_kpis';

const OS_LABEL = i18n.translate('xpack.digitalExperience.mobile.filter.os', {
  defaultMessage: 'OS',
});

const RELEASE_LABEL = i18n.translate('xpack.digitalExperience.mobile.filter.release', {
  defaultMessage: 'Release',
});

type MobileKpi = 'sessions' | 'users' | 'errorRate';

/**
 * The KPI row, in order. Crash-free sessions joins it once a crash is defined (#64), rather than
 * showing "Not enough data" while crash reporting may already work.
 */
const MOBILE_KPIS: ReadonlyArray<
  Pick<
    MobilePanelProps,
    'title' | 'tooltip' | 'changeUnit' | 'higherIsBetter' | 'data-test-subj'
  > & {
    kpi: MobileKpi;
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
  },
];

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

const ClearFiltersButton = ({ onClear }: { onClear: () => void }) => (
  <EuiButton
    data-test-subj="digitalExperienceMobileClearFilters"
    {...getEbtProps({
      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
      element: MOBILE_APPLICATION_EBT_ELEMENTS.CLEAR_FILTERS,
    })}
    onClick={onClear}
  >
    {i18n.translate('xpack.digitalExperience.mobile.clearFilters', {
      defaultMessage: 'Clear filters',
    })}
  </EuiButton>
);

/**
 * The body of a mobile application's page, all its platforms: the toolbar its tabs share, with the
 * OS and release filters, and the KPI row. The sibling issues add their sections below it as they
 * fill them.
 */
export function MobileOverview({
  kpisState: { kpis, currentKpis, isLoading, error, refresh },
}: {
  /** Fetched by the page, whose header shows its platforms. */
  kpisState: MobileKpisState;
}) {
  const { environment } = useEnvironment();
  const formatters = useFormatters();
  const { formatNumber } = formatters;
  // In the URL, so a reload or a shared link keeps them; the page's header sets Compare.
  const { value: release, setValue: setRelease } = useQueryParam('release');
  const { value: osName, setValue: setOsName } = useQueryParam('osName');
  const { value: compare } = useQueryParam('compare');
  const isComparing = compare === 'true';

  const hasNoData = currentKpis !== undefined && !currentKpis.hasData;
  const isFiltered = environment !== undefined || osName !== undefined || release !== undefined;
  const updateUrlQuery = useUpdateUrlQuery();
  // One history entry, so Back restores every filter at once.
  const clearFilters = () =>
    updateUrlQuery({ environment: undefined, osName: undefined, release: undefined });
  const clearFiltersButton = isFiltered ? <ClearFiltersButton onClear={clearFilters} /> : undefined;
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
      {/* The toolbar of every application tab: the filters keep their width when one is picked,
      and the date picker its place, so the page doesn't move. */}
      <ApplicationTabToolbar
        environments={kpis?.environments}
        isLoading={isLoading}
        onRefresh={refresh}
        filters={
          <>
            <FacetFilter
              data-test-subj="digitalExperienceMobileOsFilter"
              ebtElement={MOBILE_APPLICATION_EBT_ELEMENTS.OS_FILTER}
              label={OS_LABEL}
              buckets={kpis?.osNames ?? []}
              selected={osName}
              onChange={setOsName}
              formatters={formatters}
              isLoading={isLoading && !kpis}
            />
            <FacetFilter
              data-test-subj="digitalExperienceMobileReleaseFilter"
              ebtElement={MOBILE_APPLICATION_EBT_ELEMENTS.RELEASE_FILTER}
              label={RELEASE_LABEL}
              buckets={kpis?.releases ?? []}
              selected={release}
              onChange={setRelease}
              formatters={formatters}
              isLoading={isLoading && !kpis}
            />
          </>
        }
      />
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
          <EuiFlexGroup gutterSize="m" data-test-subj="digitalExperienceMobileKpis" wrap>
            {MOBILE_KPIS.map(({ kpi, ...panel }) => (
              <MobilePanel
                key={kpi}
                {...panel}
                value={currentKpis?.[kpi]}
                formatValue={formatNumber}
                isComparing={isComparing}
                isLoading={isLoading}
              />
            ))}
          </EuiFlexGroup>
        ))}
    </>
  );
}
