/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { BoolQuery } from '@kbn/es-query';
import { useHasData } from '../../../../../hooks/use_has_data';
import { SectionContainer } from '../section_container';
import { paths } from '../../../../../../common/locators/paths';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../../../common/constants';
import { ObservabilityAlertsTable } from '../../../../../components/alerts_table/alerts_table';
import { getAlertSummaryTimeRange } from '../../../../../utils/alert_summary_widget';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';

import { getColumns } from '../../../../../components/alerts_table/common/get_columns';
import { useKibana } from '../../../../../utils/kibana_react';
import { DEFAULT_DATE_FORMAT, DEFAULT_INTERVAL } from '../../../../../constants';
import type { BucketSize } from '../../../helpers/calculate_bucket_size';
import { buildEsQuery } from '../../../../../utils/build_es_query';

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.overview.alert.table';
const tableColumns = getColumns({ showRuleName: true });

export function AlertsSection({ bucketSize }: { bucketSize: BucketSize }) {
  const {
    http,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
    data,
    notifications,
    fieldFormats,
    application,
    licensing,
    cases,
    settings,
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
      title={i18n.translate('xpack.observability.overview.alerts.title', {
        defaultMessage: 'Alerts',
      })}
      data-test-subj="obltOverviewAlerts"
      appLink={{
        href: paths.observability.alerts,
        label: i18n.translate('xpack.observability.overview.alerts.appLink', {
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
