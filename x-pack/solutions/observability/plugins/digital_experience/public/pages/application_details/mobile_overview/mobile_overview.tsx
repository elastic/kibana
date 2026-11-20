/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { SingleSelectFilter } from '../../../components/single_select_filter';
import { EnvironmentFilter } from '../../../components/environment_filter';
import { TimeRangePicker } from '../../../components/time_range_picker';
import { MOBILE_APPLICATION_EBT_ELEMENTS } from '../../../ebt_constants';
import { MobileOnboardingPrompt } from '../../../components/mobile_onboarding_prompt';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { useApiClient } from '../../../hooks/use_api_client';
import { useDigitalExperienceParams } from '../../../hooks/use_digital_experience_params';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useEnvironment } from '../../../hooks/use_environment';
import { useFormatters } from '../../../hooks/use_formatters';
import { useTimeRange } from '../../../hooks/use_time_range';
import { toTimeRangeQuery } from '../../../utils/time_range_query';
import { PlatformBadges } from '../../../components/platform_badges';
import { MobilePanel } from './mobile_panel';

const ALL = 'all';

const ALL_RELEASES_LABEL = i18n.translate('xpack.digitalExperience.mobile.filter.allReleases', {
  defaultMessage: 'All releases',
});

const ALL_OS_LABEL = i18n.translate('xpack.digitalExperience.mobile.filter.allOs', {
  defaultMessage: 'All operating systems',
});

/** The filter's options: all, then `values`, with the URL's value first when they lack it. */
const toOptions = (
  allLabel: string,
  values: string[] | undefined,
  selected: string | undefined
) => [
  { value: ALL, label: allLabel },
  ...(selected && !values?.includes(selected) ? [selected] : [])
    .concat(values ?? [])
    .map((value) => ({ value, label: value })),
];

/** The sections the sibling issues fill; each shows a placeholder until then. */
export const MOBILE_SECTIONS = [
  {
    id: 'healthSummary',
    title: i18n.translate('xpack.digitalExperience.mobile.section.healthSummary', {
      defaultMessage: 'Health summary',
    }),
  },
  {
    id: 'releaseHealth',
    title: i18n.translate('xpack.digitalExperience.mobile.section.releaseHealth', {
      defaultMessage: 'Release health',
    }),
  },
  {
    id: 'stability',
    title: i18n.translate('xpack.digitalExperience.mobile.section.stability', {
      defaultMessage: 'Stability',
    }),
  },
  {
    id: 'usersAndEngagement',
    title: i18n.translate('xpack.digitalExperience.mobile.section.usersAndEngagement', {
      defaultMessage: 'Users and engagement',
    }),
  },
  {
    id: 'performance',
    title: i18n.translate('xpack.digitalExperience.mobile.section.performance', {
      defaultMessage: 'Performance',
    }),
  },
  {
    id: 'views',
    title: i18n.translate('xpack.digitalExperience.mobile.section.views', {
      defaultMessage: 'Views',
    }),
  },
] as const;

const COMING_SOON = i18n.translate('xpack.digitalExperience.mobile.section.comingSoon', {
  defaultMessage: 'Coming soon',
});

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.loadError', {
  defaultMessage: 'Could not load the mobile application',
});

const NO_DATA_TITLE = i18n.translate('xpack.digitalExperience.mobile.empty.title', {
  defaultMessage: 'No mobile data for this application',
});

const NO_DATA_BODY = i18n.translate('xpack.digitalExperience.mobile.empty.body', {
  defaultMessage:
    'There is no data from EDOT Android or EDOT iOS for this application in the selected time range and filters. Try a wider time range, or instrument the application.',
});

/**
 * The mobile application page, all its platforms: filters, the KPI row and the sections the
 * sibling issues fill.
 */
export function MobileOverview({ serviceName }: { serviceName: string }) {
  const apiClient = useApiClient();
  const { timeRange } = useTimeRange();
  const { environment, setEnvironment } = useEnvironment();
  const { formatNumber, formatPercent } = useFormatters();
  // In the URL, so a reload or a shared link keeps it.
  const {
    query: { release: releaseParam, osName: osNameParam },
  } = useDigitalExperienceParams('/{serviceName}');
  const release = releaseParam || undefined;
  const osName = osNameParam || undefined;
  const updateUrlQuery = useUpdateUrlQuery();
  const setRelease = (value: string | undefined) => updateUrlQuery({ release: value });
  const setOsName = (value: string | undefined) => updateUrlQuery({ osName: value });
  const [isComparing, setIsComparing] = useState(false);

  const {
    value: kpis,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) =>
      apiClient.fetch('GET /internal/digital_experience/mobile_applications/{serviceName}/kpis', {
        signal,
        params: {
          path: { serviceName },
          query: { ...toTimeRangeQuery(timeRange, environment), osName, release },
        },
      }),
    [apiClient, serviceName, timeRange, environment, osName, release],
    { unsetValueOnError: true }
  );
  const isLoading = loading || (!kpis && !error);
  const discoverHref = useDiscoverHref(kpis?.esql, {
    from: timeRange.rangeFrom,
    to: timeRange.rangeTo,
  });

  const releaseOptions = useMemo(
    () => toOptions(ALL_RELEASES_LABEL, kpis?.releases, release),
    [kpis?.releases, release]
  );
  const osOptions = useMemo(
    () => toOptions(ALL_OS_LABEL, kpis?.osNames, osName),
    [kpis?.osNames, osName]
  );

  const hasNoData = kpis !== undefined && !kpis.hasData;
  const errorPrompt =
    error && !loading ? (
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
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        {kpis?.platforms.length ? (
          <EuiFlexItem grow={false}>
            <PlatformBadges
              data-test-subj="digitalExperienceMobilePagePlatforms"
              platforms={kpis.platforms}
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EnvironmentFilter
              environments={kpis?.environments ?? []}
              selected={environment}
              onChange={setEnvironment}
              isLoading={isLoading}
            />
            <SingleSelectFilter
              data-test-subj="digitalExperienceMobileOsFilter"
              ebtElement={MOBILE_APPLICATION_EBT_ELEMENTS.OS_FILTER}
              label={i18n.translate('xpack.digitalExperience.mobile.filter.os', {
                defaultMessage: 'OS',
              })}
              options={osOptions}
              selected={osName ?? ALL}
              isActive={osName !== undefined}
              onChange={(value) => setOsName(value === ALL ? undefined : value)}
            />
            <SingleSelectFilter
              data-test-subj="digitalExperienceMobileReleaseFilter"
              ebtElement={MOBILE_APPLICATION_EBT_ELEMENTS.RELEASE_FILTER}
              label={i18n.translate('xpack.digitalExperience.mobile.filter.release', {
                defaultMessage: 'Release',
              })}
              options={releaseOptions}
              selected={release ?? ALL}
              isActive={release !== undefined}
              searchable
              onChange={(value) => setRelease(value === ALL ? undefined : value)}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiSwitch
            data-test-subj="digitalExperienceMobileCompareToggle"
            label={i18n.translate('xpack.digitalExperience.mobile.compare', {
              defaultMessage: 'Compare to the previous period',
            })}
            checked={isComparing}
            onChange={({ target: { checked } }) => setIsComparing(checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TimeRangePicker onRefresh={refresh} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {errorPrompt ??
        (hasNoData ? (
          <MobileOnboardingPrompt
            data-test-subj="digitalExperienceMobileEmpty"
            title={NO_DATA_TITLE}
            body={NO_DATA_BODY}
          />
        ) : (
          <>
            <EuiFlexGroup gutterSize="m" data-test-subj="digitalExperienceMobileKpis" wrap>
              <EuiFlexItem>
                <MobilePanel
                  data-test-subj="digitalExperienceMobileKpiSessions"
                  title={i18n.translate('xpack.digitalExperience.mobile.kpi.sessions', {
                    defaultMessage: 'Sessions',
                  })}
                  tooltip={i18n.translate('xpack.digitalExperience.mobile.kpi.sessionsTooltip', {
                    defaultMessage: 'Distinct session.id values in the time range.',
                  })}
                  value={kpis?.sessions}
                  formatValue={formatNumber}
                  isComparing={isComparing}
                  isLoading={isLoading}
                  discoverHref={discoverHref}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <MobilePanel
                  data-test-subj="digitalExperienceMobileKpiUsers"
                  title={i18n.translate('xpack.digitalExperience.mobile.kpi.users', {
                    defaultMessage: 'Users',
                  })}
                  tooltip={i18n.translate('xpack.digitalExperience.mobile.kpi.usersTooltip', {
                    defaultMessage: 'Distinct app.installation.id values in the time range.',
                  })}
                  value={kpis?.users}
                  formatValue={formatNumber}
                  isComparing={isComparing}
                  isLoading={isLoading}
                  discoverHref={discoverHref}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <MobilePanel
                  data-test-subj="digitalExperienceMobileKpiCrashFree"
                  title={i18n.translate('xpack.digitalExperience.mobile.kpi.crashFree', {
                    defaultMessage: 'Crash-free sessions',
                  })}
                  tooltip={i18n.translate('xpack.digitalExperience.mobile.kpi.crashFreeTooltip', {
                    defaultMessage:
                      'Share of sessions without a crash. Needs a crash definition and session start events, which are not available yet.',
                  })}
                  value={kpis?.crashFreeSessions}
                  formatValue={formatPercent}
                  isComparing={isComparing}
                  isLoading={isLoading}
                  discoverHref={discoverHref}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <MobilePanel
                  data-test-subj="digitalExperienceMobileKpiErrorRate"
                  title={i18n.translate('xpack.digitalExperience.mobile.kpi.errorRate', {
                    defaultMessage: 'Error rate',
                  })}
                  tooltip={i18n.translate('xpack.digitalExperience.mobile.kpi.errorRateTooltip', {
                    defaultMessage: 'Exceptions per session in the time range.',
                  })}
                  value={kpis?.errorRate}
                  formatValue={formatNumber}
                  isComparing={isComparing}
                  isLoading={isLoading}
                  discoverHref={discoverHref}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            {MOBILE_SECTIONS.map(({ id, title }) => (
              <React.Fragment key={id}>
                <EuiSpacer size="l" />
                <EuiPanel hasBorder data-test-subj={`digitalExperienceMobileSection-${id}`}>
                  <EuiTitle size="s">
                    <h2>{title}</h2>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    {COMING_SOON}
                  </EuiText>
                </EuiPanel>
              </React.Fragment>
            ))}
          </>
        ))}
    </>
  );
}
