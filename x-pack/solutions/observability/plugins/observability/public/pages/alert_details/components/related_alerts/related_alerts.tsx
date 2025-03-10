/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ObservabilityAlertsTable, TopAlert } from '../../../..';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../../common/constants';
import { ObservabilityFields } from '../../../../../common/utils/alerting/types';

const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.related.alerts.table';

interface Props {
  alert?: TopAlert<ObservabilityFields>;
}

export function RelatedAlerts({ alert }: Props) {
  if (!alert) {
    return null;
  }

  const esQuery: QueryDslQueryContainer = {
    bool: {
      must: [
        {
          term: {
            'kibana.alert.status': 'active',
          },
        },
      ],
      filter: [
        {
          range: {
            'kibana.alert.start': {
              gte: '2025-03-10T12:22:35.261Z',
              lte: '2025-03-10T16:22:35.261Z',
            },
          },
        },
      ],
      should: [
        {
          bool: {
            boost: 2.0,
            must: [
              {
                term: {
                  'kibana.alert.group.field': 'labels.projectId',
                },
              },
              {
                term: {
                  'kibana.alert.group.value': 'bf61f3fc-f1e5-4ed2-9919-edf06e74272e',
                },
              },
            ],
          },
        },
        {
          terms: {
            'kibana.alert.instance.id': ['bf61f3fc-f1e5-4ed2-9919-edf06e74272e'],
            boost: 1.0,
          },
        },
        {
          terms: {
            tags: ['prod', 'test'],
            boost: 0.8,
          },
        },
        {
          term: {
            'kibana.alert.rule.uuid': {
              value: 'a849eff1-2712-4102-b36c-acc3354cf538',
              boost: 0.8,
            },
          },
        },
        {
          function_score: {
            functions: [
              {
                exp: {
                  'kibana.alert.start': {
                    origin: '2025-03-10T14:22:35.261Z',
                    scale: '5m',
                    offset: '5m',
                    decay: 0.5,
                  },
                },
              },
            ],
            boost_mode: 'multiply',
          },
        },
      ],
    },
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="xs" />

      <EuiFlexItem>
        <ObservabilityAlertsTable
          id={ALERTS_TABLE_ID}
          ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
          consumers={observabilityAlertFeatureIds}
          query={esQuery}
          initialPageSize={ALERTS_PER_PAGE}
          showInspectButton
          onLoaded={(alerts) => console.dir(alerts)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
