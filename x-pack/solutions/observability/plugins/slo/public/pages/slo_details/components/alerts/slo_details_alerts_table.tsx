/*

 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ObservabilityAlertsTable,
  type ObservabilityAlertsTableProps,
} from '@kbn/observability-plugin/public';
import {
  SLO_ALERTS_TABLE_ID,
  SLO_FLYOUT_ALERTS_TABLE_ID,
} from '@kbn/observability-shared-plugin/common';
import { AlertConsumers, SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import React, { useMemo } from 'react';
import { useSloDetailsContext } from '../slo_details_context';
import { useKibana } from '../../../../hooks/use_kibana';

type SharedStaticProps = Pick<ObservabilityAlertsTableProps, 'ruleTypeIds' | 'consumers'>;

const sharedStaticProps: SharedStaticProps = {
  ruleTypeIds: SLO_RULE_TYPE_IDS,
  consumers: [AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY],
};

type FlyoutStaticProps = Pick<
  ObservabilityAlertsTableProps,
  'toolbarVisibility' | 'visibleColumns'
>;
const flyoutStaticProps: FlyoutStaticProps = {
  toolbarVisibility: {
    showDisplaySelector: false,
    showKeyboardShortcuts: false,
    showFullScreenSelector: false,
  },
  visibleColumns: [
    'kibana.alert.status',
    'kibana.alert.start',
    'kibana.alert.duration.us',
    'kibana.alert.rule.name',
    'kibana.alert.reason',
  ],
};

export function SloDetailsAlertsTable() {
  const { data, http, notifications, fieldFormats, application, licensing, cases, settings } =
    useKibana().services;

  const { slo, isFlyout } = useSloDetailsContext();

  const query = useMemo(
    () => ({
      bool: {
        filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.instanceId': slo.instanceId } }],
      },
    }),
    [slo.id, slo.instanceId]
  );

  return (
    <ObservabilityAlertsTable
      id={isFlyout ? SLO_FLYOUT_ALERTS_TABLE_ID : SLO_ALERTS_TABLE_ID}
      pageSize={isFlyout ? 20 : 100}
      data-test-subj="alertTable"
      query={query}
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
      {...sharedStaticProps}
      {...(isFlyout ? flyoutStaticProps : {})}
    />
  );
}
