/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';
import type { CommonAttachmentTabViewProps } from '@kbn/cases-plugin/public';
import { getManualAlertIds } from '@kbn/cases-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-shared-plugin/common';
import { observabilityAlertFeatureIds } from '../../../../../common/constants';
import { useKibana } from '../../../../utils/kibana_react';
import { ObservabilityAlertsTable } from '../../../..';
import { ALERTS_EMPTY_DESCRIPTION } from '../translations';

export function AlertTabContent({ caseData }: CommonAttachmentTabViewProps) {
  const { data, http, notifications, fieldFormats, application, licensing, cases, settings } =
    useKibana().services;

  const alertIds = useMemo(() => getManualAlertIds(caseData.comments), [caseData.comments]);
  const alertIdsQuery = useMemo(
    (): NonNullable<QueryDslQueryContainer> => ({
      ids: {
        values: alertIds,
      },
    }),
    [alertIds]
  );

  const alertsTableServices = useMemo(
    () => ({
      data,
      http,
      notifications,
      fieldFormats,
      application,
      licensing: licensing!,
      cases,
      settings,
    }),
    [data, http, notifications, fieldFormats, application, licensing, cases, settings]
  );

  if (alertIdsQuery.ids?.values?.length === 0) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiEmptyPrompt
            data-test-subj="caseViewAlertsEmpty"
            iconType="casesApp"
            iconColor="default"
            titleSize="xs"
            body={<p>{ALERTS_EMPTY_DESCRIPTION}</p>}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexItem data-test-subj="case-view-alerts">
      <ObservabilityAlertsTable
        id={`case-details-alerts-${caseData.owner}`}
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
        consumers={observabilityAlertFeatureIds}
        query={alertIdsQuery}
        showAlertStatusWithFlapping
        services={alertsTableServices}
      />
    </EuiFlexItem>
  );
}
