/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { BoolQuery } from '@kbn/es-query';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-shared-plugin/common';
import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_DURATION,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
  ALERT_INSTANCE_ID,
  TAGS,
  ALERT_REASON,
  ALERT_WORKFLOW_TAGS,
} from '@kbn/rule-data-utils';
import { ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import { paths } from '../../../../../constants/paths';
import { observabilityAlertFeatureIds } from '../../../../../constants/alerts';
import { useHasData } from '../../../../../hooks/use_has_data';
import { SectionContainer } from '../section_container';
import { getAlertSummaryTimeRange } from '../../../../../utils/alert_summary_widget';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';
import { useKibana } from '../../../../../hooks/use_kibana';
import { DEFAULT_DATE_FORMAT, DEFAULT_INTERVAL } from '../../../../../constants';
import type { BucketSize } from '../../../../../utils/calculate_bucket_size';
import { buildEsQuery } from '../../../../../utils/build_es_query';

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observabilityOverview.overview.alert.table';

// Define columns inline to avoid pulling in heavy dependencies from observability plugin
const tableColumns: EuiDataGridColumn[] = [
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.statusColumnDescription',
      { defaultMessage: 'Alert Status' }
    ),
    id: ALERT_STATUS,
    initialWidth: 120,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.triggeredColumnDescription',
      { defaultMessage: 'Triggered' }
    ),
    id: ALERT_START,
    initialWidth: 190,
    schema: 'datetime',
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.durationColumnDescription',
      { defaultMessage: 'Duration' }
    ),
    id: ALERT_DURATION,
    initialWidth: 70,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.ruleNameColumnDescription',
      { defaultMessage: 'Rule name' }
    ),
    id: ALERT_RULE_NAME,
    initialWidth: 150,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.sourceColumnDescription',
      { defaultMessage: 'Group' }
    ),
    id: ALERT_INSTANCE_ID,
    initialWidth: 100,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.observedValueColumnDescription',
      { defaultMessage: 'Observed value' }
    ),
    id: ALERT_EVALUATION_VALUE,
    initialWidth: 100,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.thresholdColumnDescription',
      { defaultMessage: 'Threshold' }
    ),
    id: ALERT_EVALUATION_THRESHOLD,
    initialWidth: 100,
  },
  {
    displayAsText: i18n.translate('xpack.observabilityOverview.alertsTable.tagsColumnDescription', {
      defaultMessage: 'Tags',
    }),
    id: TAGS,
    initialWidth: 150,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.workflowTagsColumnDescription',
      { defaultMessage: 'Workflow tags' }
    ),
    id: ALERT_WORKFLOW_TAGS,
    initialWidth: 150,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observabilityOverview.alertsTable.reasonColumnDescription',
      { defaultMessage: 'Reason' }
    ),
    id: ALERT_REASON,
  },
];

export function AlertsSection({ bucketSize }: { bucketSize: BucketSize }) {
  const {
    application,
    cases,
    data,
    fieldFormats,
    http,
    licensing,
    notifications,
    settings,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
  } = useKibana().services;
  const { relativeStart, relativeEnd } = useDatePickerContext();
  const { hasDataMap } = useHasData();

  const esQuery = useMemo<{ bool: BoolQuery }>(
    () => buildEsQuery({ timeRange: { from: relativeStart, to: relativeEnd } }),
    [relativeStart, relativeEnd]
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

  if (!hasDataMap.alert?.hasData) {
    return null;
  }

  return (
    <SectionContainer
      title={i18n.translate('xpack.observabilityOverview.overview.alerts.title', {
        defaultMessage: 'Alerts',
      })}
      data-test-subj="obltOverviewAlerts"
      appLink={{
        href: paths.observability.alerts,
        label: i18n.translate('xpack.observabilityOverview.overview.alerts.appLink', {
          defaultMessage: 'Show alerts',
        }),
      }}
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
        pageSize={ALERTS_PER_PAGE}
        columns={tableColumns}
        showInspectButton
        services={{
          data,
          http,
          notifications,
          fieldFormats,
          application,
          licensing,
          cases,
          settings,
        }}
      />
    </SectionContainer>
  );
}
