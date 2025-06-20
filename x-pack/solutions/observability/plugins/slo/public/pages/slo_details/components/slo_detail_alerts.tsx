/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { AlertConsumers, SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { Fragment } from 'react';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloDetailsAlerts({ slo }: Props) {
  return (
    <Fragment>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="xl">
        <EuiFlexItem>
          <ObservabilityAlertsTable
            id={SLO_ALERTS_TABLE_ID}
            data-test-subj="alertTable"
            ruleTypeIds={SLO_RULE_TYPE_IDS}
            consumers={[AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY]}
            query={{
              bool: {
                filter: [
                  { term: { 'slo.id': slo.id } },
                  { term: { 'slo.instanceId': slo.instanceId } },
                ],
              },
            }}
            initialPageSize={100}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}
