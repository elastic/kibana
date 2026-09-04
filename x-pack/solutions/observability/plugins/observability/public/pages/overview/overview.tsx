/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import {
  ExternalResourceLinks,
  FETCH_STATUS,
  useBreadcrumbs,
  useFetcher,
} from '@kbn/observability-shared-plugin/public';
import React, { useEffect, useMemo } from 'react';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { usePageReady } from '@kbn/ebt-tools';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useDatePickerContext } from '../../hooks/use_date_picker_context';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { DATA_SECTIONS, DataSections, type DataSectionsApps } from './components/data_sections';
import { HeaderActions } from './components/header_actions/header_actions';
import { getNewsFeed } from './components/news_feed/helpers/get_news_feed';
import { NewsFeed } from './components/news_feed/news_feed';
import { ObservabilityOnboardingCallout } from './components/observability_onboarding_callout';
import { calculateBucketSize } from './helpers/calculate_bucket_size';
import { useKibana } from '../../utils/kibana_react';
import type { DataContextApps, HasDataMap } from '../../context/has_data_context/has_data_context';
import { appLabels } from '../../context/has_data_context/has_data_context';

const pageTitle = i18n.translate('xpack.observability.overview.pageTitle', {
  defaultMessage: 'Overview',
});

const addDataButtonLabel = i18n.translate('xpack.observability.home.addData', {
  defaultMessage: 'Add data',
});

export function OverviewPage() {
  const { http, observabilityAIAssistant, kibanaVersion, serverless, share } = useKibana().services;

  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const onboardingHref = onboardingLocator?.useUrl({});

  const { ObservabilityPageTemplate } = usePluginContext();
  const { euiTheme } = useEuiTheme();
  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.overviewLinkText', {
          defaultMessage: 'Overview',
        }),
      },
    ],
    { serverless }
  );

  const { data: newsFeed } = useFetcher(() => {
    if (!Boolean(serverless)) {
      return getNewsFeed({ http, kibanaVersion });
    }
  }, [http, kibanaVersion, serverless]);

  const { hasDataMap } = useHasData();
  // we need to filter out unwanted apps
  const hasData = useMemo<Partial<Pick<HasDataMap, DataSectionsApps>>>(
    () =>
      Object.entries(hasDataMap).reduce((acc, [app, value]) => {
        if (DATA_SECTIONS.includes(app as DataSectionsApps)) {
          acc[app as DataSectionsApps] = value;
        }
        return acc;
      }, {} as Partial<Pick<HasDataMap, DataSectionsApps>>),
    [hasDataMap]
  );

  const hasAnyData = useMemo(() => Object.values(hasData).some((d) => d?.hasData), [hasData]);

  const isAllRequestsComplete = useMemo(() => {
    return DATA_SECTIONS.every((app) => {
      const status = hasData[app as DataSectionsApps]?.status;
      return status !== undefined && status !== FETCH_STATUS.LOADING;
    });
  }, [hasData]);

  const { setScreenContext } = observabilityAIAssistant?.service || {};

  const appsWithoutData = (Object.keys(hasData) as DataSectionsApps[])
    .sort()
    .reduce((acc, app) => {
      const section = hasData[app];
      if (section?.status === 'success' && !section?.hasData) {
        const appName = appLabels[app as DataContextApps];

        return `${acc}${appName}, `;
      }
      return acc;
    }, '')
    .slice(0, -2);

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: `The user is viewing the Overview page which shows a summary of the following apps: ${JSON.stringify(
        hasData
      )}`,
      starterPrompts: [
        ...(appsWithoutData.length > 0
          ? [
              {
                title: i18n.translate(
                  'xpack.observability.aiAssistant.starterPrompts.explainNoData.title',
                  {
                    defaultMessage: 'Explain',
                  }
                ),
                prompt: i18n.translate(
                  'xpack.observability.aiAssistant.starterPrompts.explainNoData.prompt',
                  {
                    defaultMessage: `Why don't I see any data for the {appsWithoutData} sections?`,
                    values: { appsWithoutData },
                  }
                ),
                icon: 'sparkles',
              },
            ]
          : []),
      ],
    });
  }, [appsWithoutData, hasData, setScreenContext]);

  const { absoluteStart, absoluteEnd, relativeStart, relativeEnd } = useDatePickerContext();

  const timeBuckets = useTimeBuckets();
  const bucketSize = useMemo(
    () =>
      calculateBucketSize({
        start: absoluteStart,
        end: absoluteEnd,
        timeBuckets,
      }),
    [absoluteStart, absoluteEnd, timeBuckets]
  );

  usePageReady({
    isReady: isAllRequestsComplete,
    isRefreshing: !isAllRequestsComplete,
    meta: {
      rangeFrom: relativeStart,
      rangeTo: relativeEnd,
      description: '[ttfmp_observability_overview] The Observability Overview page has loaded.',
    },
    customMetrics: {
      key1: 'hasAnyData',
      value1: hasAnyData ? 1 : 0,
    },
  });

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      primaryActionItem: onboardingHref
        ? {
            id: 'addData',
            label: addDataButtonLabel,
            iconType: 'indexOpen',
            href: onboardingHref,
            testId: 'o11yOverviewHeaderAddDataButton',
            ebt: { action: EBT_CLICK_ACTIONS.ADD_DATA },
          }
        : undefined,
    }),
    [onboardingHref]
  );

  const isPageLoading = !hasAnyData && !isAllRequestsComplete;

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={isAllRequestsComplete}
      pageSectionProps={{ paddingSize: 'none' }}
    >
      <AppHeader title={pageTitle} menu={menu} />
      <EuiPageSection
        paddingSize="l"
        restrictWidth={false}
        alignment={isPageLoading ? 'center' : undefined}
        contentProps={{
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          },
        }}
      >
        {isPageLoading ? (
          <EuiFlexGroup data-test-subj="obltOverviewPageLoading">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
              <EuiText>
                {i18n.translate('xpack.observability.overview.loadingObservability', {
                  defaultMessage: 'Loading Observability',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : hasAnyData ? (
          <>
            <HeaderActions />
            <EuiSpacer size="m" />
            <ObservabilityOnboardingCallout />

            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <DataSections bucketSize={bucketSize} />
              </EuiFlexItem>
              <EuiSpacer size="s" />
            </EuiFlexGroup>
          </>
        ) : (
          <EuiEmptyPrompt
            iconType="logoObservability"
            data-test-subj="obltOverviewNoDataPrompt"
            css={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
            }}
            title={
              <h2>
                {i18n.translate('xpack.observability.overview.emptyState.title', {
                  defaultMessage: 'Welcome to Observability',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.observability.overview.emptyState.body', {
                  defaultMessage:
                    'Start collecting data to start detecting and resolving problems with your systems.',
                })}
              </p>
            }
            actions={
              <EuiButton
                data-test-subj="o11yOverviewPageAddDataButton"
                color="primary"
                fill
                href={onboardingHref}
                {...getEbtProps({
                  action: EBT_CLICK_ACTIONS.ADD_DATA,
                  element: 'obsOverviewPageEmptyPrompt',
                })}
              >
                {i18n.translate('xpack.observability.overview.emptyState.action', {
                  defaultMessage: 'Add data',
                })}
              </EuiButton>
            }
          />
        )}
        {!isPageLoading && (
          <>
            <EuiHorizontalRule
              css={{
                width: 'auto',
                marginLeft: `-${euiTheme.size.l}`,
                marginRight: `-${euiTheme.size.l}`,
              }}
            />

            <EuiFlexGroup direction="column" gutterSize="xl" css={{ flexGrow: 0 }}>
              {!!newsFeed?.items?.length && (
                <EuiFlexItem grow={false}>
                  <NewsFeed items={newsFeed.items.slice(0, 3)} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <ExternalResourceLinks />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiPageSection>
    </ObservabilityPageTemplate>
  );
}
