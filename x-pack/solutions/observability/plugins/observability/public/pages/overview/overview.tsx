/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { BoolQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs, useFetcher } from '@kbn/observability-shared-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getColumns } from '../../components/alerts_table/common/get_columns';
import { ObservabilityAlertsTable } from '../../components/alerts_table/alerts_table';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../common/constants';
import { paths } from '../../../common/locators/paths';
import { LoadingObservability } from '../../components/loading_observability';
import { DEFAULT_DATE_FORMAT, DEFAULT_INTERVAL } from '../../constants';
import { useDatePickerContext } from '../../hooks/use_date_picker_context';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { getAlertSummaryTimeRange } from '../../utils/alert_summary_widget';
import { buildEsQuery } from '../../utils/build_es_query';
import { DataAssistantFlyout } from './components/data_assistant_flyout';
import { DataSections } from './components/data_sections';
import { HeaderActions } from './components/header_actions/header_actions';
import { HeaderMenu } from './components/header_menu/header_menu';
import { getNewsFeed } from './components/news_feed/helpers/get_news_feed';
import { NewsFeed } from './components/news_feed/news_feed';
import { ObservabilityOnboardingCallout } from './components/observability_onboarding_callout';
import { Resources } from './components/resources';
import { EmptySections } from './components/sections/empty/empty_sections';
import { SectionContainer } from './components/sections/section_container';
import { calculateBucketSize } from './helpers/calculate_bucket_size';
import { useKibana } from '../../utils/kibana_react';
import {
  DataContextApps,
  HasDataMap,
  appLabels,
} from '../../context/has_data_context/has_data_context';

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.overview.alert.table';

const tableColumns = getColumns({ showRuleName: true });

export function OverviewPage() {
  const {
    http,
    observabilityAIAssistant,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
    kibanaVersion,
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

  const { data: newsFeed } = useFetcher(
    () => getNewsFeed({ http, kibanaVersion }),
    [http, kibanaVersion]
  );
  const { hasAnyData, isAllRequestsComplete, hasDataMap } = useHasData();

  const { setScreenContext } = observabilityAIAssistant?.service || {};

  const appsWithoutData = Object.keys(hasDataMap)
    .sort()
    .reduce((acc, app) => {
      const data = hasDataMap[app as keyof HasDataMap];
      if (data?.status === 'success' && !data?.hasData) {
        const appName = appLabels[app as DataContextApps];

        return `${acc}${appName}, `;
      }
      return acc;
    }, '')
    .slice(0, -2);

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: `The user is viewing the Overview page which shows a summary of the following apps: ${JSON.stringify(
        hasDataMap
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
  }, [appsWithoutData, hasDataMap, setScreenContext]);

  const [isDataAssistantFlyoutVisible, setIsDataAssistantFlyoutVisible] = useState(false);

  const [isGuidedSetupTourVisible, setGuidedSetupTourVisible] = useState(false);

  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useDatePickerContext();

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>(
    buildEsQuery({
      timeRange: {
        from: relativeStart,
        to: relativeEnd,
      },
    })
  );

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
  const alertSummaryTimeRange = useMemo(
    () =>
      getAlertSummaryTimeRange(
        {
          from: relativeStart,
          to: relativeEnd,
        },
        bucketSize?.intervalString || DEFAULT_INTERVAL,
        bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
      ),
    [bucketSize, relativeEnd, relativeStart]
  );

  useEffect(() => {
    setEsQuery(
      buildEsQuery({
        timeRange: {
          from: relativeStart,
          to: relativeEnd,
        },
      })
    );
  }, [relativeEnd, relativeStart]);

  const handleTimeRangeRefresh = useCallback(() => {
    setEsQuery(
      buildEsQuery({
        timeRange: {
          from: relativeStart,
          to: relativeEnd,
        },
      })
    );
  }, [relativeEnd, relativeStart]);

  const handleCloseGuidedSetupTour = () => {
    setGuidedSetupTourVisible(false);
  };

  const handleGuidedSetupClick = useCallback(() => {
    handleCloseGuidedSetupTour();

    setIsDataAssistantFlyoutVisible(true);
  }, []);

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={isAllRequestsComplete}
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.overview.pageTitle', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: [
          <HeaderActions
            showTour={isGuidedSetupTourVisible}
            onGuidedSetupClick={handleGuidedSetupClick}
            onTourDismiss={handleCloseGuidedSetupTour}
            onTimeRangeRefresh={handleTimeRangeRefresh}
          />,
        ],
        rightSideGroupProps: {
          responsive: true,
        },
        'data-test-subj': 'obltOverviewPageHeader',
      }}
    >
      <HeaderMenu />

      <ObservabilityOnboardingCallout />

      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="obltOverviewAlerts">
        <EuiFlexItem>
          <SectionContainer
            title={i18n.translate('xpack.observability.overview.alerts.title', {
              defaultMessage: 'Alerts',
            })}
            appLink={{
              href: paths.observability.alerts,
              label: i18n.translate('xpack.observability.overview.alerts.appLink', {
                defaultMessage: 'Show alerts',
              }),
            }}
            initialIsOpen={hasAnyData}
            hasError={false}
          >
            <AlertSummaryWidget
              ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
              consumers={observabilityAlertFeatureIds}
              filter={esQuery}
              fullSize
              timeRange={alertSummaryTimeRange}
            />
            <ObservabilityAlertsTable
              id={ALERTS_TABLE_ID}
              ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
              consumers={observabilityAlertFeatureIds}
              query={esQuery}
              initialPageSize={ALERTS_PER_PAGE}
              columns={tableColumns}
              showInspectButton
            />
          </SectionContainer>
        </EuiFlexItem>
        <EuiFlexItem>
          {/* Data sections */}
          <DataSections bucketSize={bucketSize} />
          <EmptySections />
        </EuiFlexItem>
        <EuiSpacer size="s" />
      </EuiFlexGroup>

      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem>
          {/* Resources / What's New sections */}
          <EuiFlexGroup>
            <EuiFlexItem grow={4}>
              {!!newsFeed?.items?.length && <NewsFeed items={newsFeed.items.slice(0, 3)} />}
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <Resources />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isDataAssistantFlyoutVisible ? (
        <DataAssistantFlyout onClose={() => setIsDataAssistantFlyoutVisible(false)} />
      ) : null}
    </ObservabilityPageTemplate>
  );
}
