/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { SLOGroupingValueSelector } from './slo_grouping_value_selector';

const setSLOGroupingOptions = ({ slo }: { slo: SLOWithSummaryResponse }) => {
  const groupings = Object.entries(slo.groupings ?? {});
  const groupBy = slo.groupBy ?? [];
  if (!groupings.length) {
    return typeof groupBy === 'string'
      ? [groupBy, '']
      : groupBy.map((groupingKey) => [groupingKey, '']);
  }
  return groupings;
};

export const SLOGroupings = ({ slo }: { slo: SLOWithSummaryResponse }) => {
  const groupings = setSLOGroupingOptions({ slo });

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <h4>
            {i18n.translate('xpack.slo.sloDetails.groupings.title', {
              defaultMessage: 'Instance',
            })}
          </h4>
        </EuiText>
      </EuiFlexItem>
      {groupings.map(([groupingKey, groupingValue]) => {
        return (
          <SLOGroupingValueSelector
            key={groupingKey}
            slo={slo}
            groupingKey={groupingKey as string}
            value={String(groupingValue)}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
