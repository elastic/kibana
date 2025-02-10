/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { SLOGroupingValueSelector } from './slo_grouping_value_selector';
import { useHistory, useLocation } from 'react-router-dom';

const setSLOGroupingOptions = ({ slo }: { slo: SLOWithSummaryResponse }) => {
  if (!Object.keys(slo.groupings).length) {
    const groupBy = slo.groupBy ?? [];
    const groupings: { [key: string]: string } = {};
    if (typeof groupBy === 'string') {
      Object.defineProperty(groupings, groupBy, {
        value: '',
        writable: true,
        enumerable: true,
      });
      groupings[groupBy] = '';
    } else {
      groupBy.forEach((groupingKey) => {
        Object.defineProperty(groupings, groupingKey, {
          value: '',
          writable: true,
          enumerable: true,
        });
        groupings[groupingKey] = '';
      });
    }
    return groupings;
  }
  return slo.groupings;
};

export const SLOGroupings = ({ slo }: { slo: SLOWithSummaryResponse }) => {
  const [groupings, setGroupings] = useState(setSLOGroupingOptions({ slo }));
  const { search: searchParams } = useLocation();
  const history = useHistory();

  const setGroupingValue = (groupingKey: string, value: string) => {
    setGroupings((prevGroupings) => {
      return {
        ...prevGroupings,
        [groupingKey]: value,
      };
    });
  };

  const clearInstance = () => {
    const clearedGroupings = groupings;
    Object.keys(clearedGroupings).forEach((key) => {
      clearedGroupings[key] = '';
    });
    setGroupings(clearedGroupings);
    const urlSearchParams = new URLSearchParams(searchParams);
    urlSearchParams.delete('instanceId');
    history.replace({
      search: urlSearchParams.toString(),
    });
  };

  useEffect(() => {
    if (Object.entries(groupings).every(([, value]) => value)) {
      const urlSearchParams = new URLSearchParams(searchParams);
      urlSearchParams.set('instanceId', toInstanceId(groupings, slo.groupBy));
      history.replace({
        search: urlSearchParams.toString(),
      });
    }
  }, [groupings]);

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
      {Object.entries(groupings).map(([groupingKey, groupingValue]) => {
        return (
          <SLOGroupingValueSelector
            key={groupingKey}
            slo={slo}
            groupingKey={String(groupingKey)}
            value={String(groupingValue)}
            setGroupingValue={setGroupingValue}
          />
        );
      })}
      <EuiButton style={{ height: 33 }} onClick={clearInstance}>
        {i18n.translate('xpack.slo.sloDetails.groupings.clearInstance', {
          defaultMessage: 'Clear Instance',
        })}
      </EuiButton>
    </EuiFlexGroup>
  );
};

function toInstanceId(
  groupings: Record<string, string | number>,
  groupBy: string | string[]
): string {
  const groups = [groupBy].flat();
  return groups.map((group) => groupings[group]).join(',');
}
