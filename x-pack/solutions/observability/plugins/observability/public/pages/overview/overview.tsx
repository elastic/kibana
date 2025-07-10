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
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  ExternalResourceLinks,
  FETCH_STATUS,
  useBreadcrumbs,
  useFetcher,
} from '@kbn/observability-shared-plugin/public';
import React, { useEffect, useMemo } from 'react';
import { LoadingObservability } from '../../components/loading_observability';
import { useDatePickerContext } from '../../hooks/use_date_picker_context';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { DATA_SECTIONS, DataSections, type DataSectionsApps } from './components/data_sections';
import { HeaderActions } from './components/header_actions/header_actions';
import { HeaderMenu } from './components/header_menu/header_menu';
import { getNewsFeed } from './components/news_feed/helpers/get_news_feed';
import { NewsFeed } from './components/news_feed/news_feed';
import { ObservabilityOnboardingCallout } from './components/observability_onboarding_callout';
import { calculateBucketSize } from './helpers/calculate_bucket_size';
import { useKibana } from '../../utils/kibana_react';
import {
  DataContextApps,
  HasDataMap,
  appLabels,
} from '../../context/has_data_context/has_data_context';

export function OverviewPage() {
  const {
    http,
    observabilityAIAssistant,
    kibanaVersion,
    serverless: isServerless,
  } = useKibana().services;

  const { ObservabilityPageTemplate } = usePluginContext();

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.overviewLinkText', {
          defaultMessage: 'Overview',
        }),
      },
    ],
    {
      classicOnly: true,
    }
  );

  const { data: newsFeed } = useFetcher(() => {
    if (!Boolean(isServerless)) {
      return getNewsFeed({ http, kibanaVersion });
    }
  }, [http, kibanaVersion, isServerless]);

  const { hasDataMap } = useHasData();
  // we need to filter out unwanted apps
  const hasData = useMemo<Partial<Pick<HasDataMap, DataSectionsApps>>>(
    () =>
      Object.fromEntries(
        Object.entries(hasDataMap).filter(([app]) =>
          DATA_SECTIONS.includes(app as DataSectionsApps)
        )
      ) as Partial<Pick<HasDataMap, DataSectionsApps>>,
    [hasDataMap]
  );

  const hasAnyData = useMemo(() => Object.values(hasData).some((d) => d?.hasData), [hasData]);

  const isAllRequestsComplete = useMemo(() => {
    return DATA_SECTIONS.every((app) => {
      const section = hasData[app as DataSectionsApps];
      return section?.status === FETCH_STATUS.SUCCESS;
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

  const { absoluteStart, absoluteEnd } = useDatePickerContext();

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

  if (!hasAnyData && !isAllRequestsComplete) {
    return <LoadingObservability />;
  }

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={isAllRequestsComplete}
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.overview.pageTitle', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: hasAnyData ? [<HeaderActions />] : [],
        rightSideGroupProps: {
          responsive: true,
        },
        'data-test-subj': 'obltOverviewPageHeader',
      }}
      pageSectionProps={{
        contentProps: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          },
        },
      }}
    >
      <HeaderMenu />

      {hasAnyData ? (
        <>
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
          css={css({
            flexGrow: 1,
            display: 'flex',
          })}
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
            <EuiButton data-test-subj="o11yOverviewPageAddDataButton" color="primary" fill>
              {i18n.translate('xpack.observability.overview.emptyState.action', {
                defaultMessage: 'Add data',
              })}
            </EuiButton>
          }
        />
      )}
      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem>
          {/* Resources / What's New sections */}
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {!!newsFeed?.items?.length && <NewsFeed items={newsFeed.items.slice(0, 3)} />}
            </EuiFlexItem>
            <EuiFlexItem>
              <ExternalResourceLinks />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
