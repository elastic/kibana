/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALL_VALUE, GroupSummary } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { SLI_OPTIONS } from '../../../../slo_edit/constants';
import type { GroupByField } from '../../../types';

export function useGroupName(groupBy: GroupByField, group: string, summary?: GroupSummary) {
  const groupName = group.toLowerCase();

  switch (groupBy) {
    case 'ungrouped':
    case 'slo.tags':
    case 'status':
    case 'slo.id':
      return groupName;
    case 'slo.instanceId':
      if (groupName === ALL_VALUE || !summary?.worst?.slo?.groupings) {
        return i18n.translate('xpack.slo.group.ungroupedInstanceId', {
          defaultMessage: 'Ungrouped',
        });
      }

      const groupNames = flattenObject(summary.worst.slo.groupings);
      return Object.entries(groupNames)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    case 'slo.indicator.type':
      return SLI_OPTIONS.find((option) => option.value === group)?.text ?? groupName;
    case '_index':
      if (groupName.includes(':.')) {
        const [remoteClusterName] = groupName.split(':.');
        return i18n.translate('xpack.slo.group.remoteCluster', {
          defaultMessage: 'Remote Cluster: {remoteClusterName}',
          values: {
            remoteClusterName,
          },
        });
      }

      return i18n.translate('xpack.slo.group.remoteCluster.localKibana', {
        defaultMessage: 'Local Kibana',
      });

    default:
      assertNever(groupBy);
  }
}

function flattenObject(obj: Record<string, any>, parentKey = '', result: Record<string, any> = {}) {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        flattenObject(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}
