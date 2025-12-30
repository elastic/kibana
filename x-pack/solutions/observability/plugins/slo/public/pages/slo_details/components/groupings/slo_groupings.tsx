/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, type SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router-dom-v5-compat';
import { useFetchSloInstances } from '../../hooks/use_fetch_slo_instances';
import { useGetQueryParams } from '../../hooks/use_get_query_params';
import { SloGroupValueSelector } from './slo_group_value_selector';

export function SloGroupings({ slo }: { slo: SLOWithSummaryResponse }) {
  const { remoteName } = useGetQueryParams();
  const { search: searchParams } = useLocation();
  const history = useHistory();

  const groupBy = [slo.groupBy].flat();
  const isDefinedWithGroupBy = !groupBy.includes(ALL_VALUE);
  const instanceGroupings = Object.entries(slo.groupings ?? {});
  const noInstanceSelected = isDefinedWithGroupBy && instanceGroupings.length === 0;

  const [groupings, setGroupings] = useState(() =>
    groupBy.reduce((acc, groupKey) => {
      acc[groupKey] = instanceGroupings.find(([key]) => key === groupKey)?.[1];
      return acc;
    }, {} as Record<string, string | number | undefined>)
  );

  const { isInitialLoading, data } = useFetchSloInstances({
    sloId: slo.id,
    size: 1,
    enabled: noInstanceSelected,
    remoteName,
  });

  useEffect(() => {
    const isValidSelection = Object.entries(groupings).every(([_, groupValue]) => {
      return groupValue !== undefined && groupValue !== ALL_VALUE;
    });

    if (isValidSelection) {
      const urlSearchParams = new URLSearchParams(searchParams);
      urlSearchParams.set('instanceId', toInstanceId(groupings));
      history.push({
        search: urlSearchParams.toString(),
      });
    }
  }, [groupings, history, searchParams]);

  if (!isDefinedWithGroupBy) {
    return null;
  }

  if (isInitialLoading) {
    return null;
  }

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
      {groupBy.map((groupingKey) => {
        return (
          <SloGroupValueSelector
            key={groupingKey}
            id={slo.id}
            instanceId={noInstanceSelected ? data?.results[0]?.instanceId : slo.instanceId}
            groupingKey={groupingKey}
            groupingValue={groupings[groupingKey]}
            onSelect={(newValue: string | number) => {
              setGroupings((prev) => ({ ...prev, [groupingKey]: newValue }));
            }}
          />
        );
      })}
    </EuiFlexGroup>
  );
}

function toInstanceId(groupings: Record<string, string | number | undefined>): string {
  return Object.entries(groupings)
    .map(([_, groupValue]) => groupValue)
    .join(',');
}
