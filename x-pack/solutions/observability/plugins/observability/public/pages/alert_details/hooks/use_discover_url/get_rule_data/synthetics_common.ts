/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { fromKueryExpression, nodeBuilder, type KueryNode } from '@kbn/es-query';
import { syntheticsMonitorStatusRuleParamsSchema } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import { tlsRuleParamsSchema } from '@kbn/response-ops-rule-params/synthetics_tls';

export const SYNTHETICS_TEMP_DATA_VIEW: DataViewSpec = {
  title: 'synthetics-*',
  timeFieldName: '@timestamp',
};

const supportedAlertParams = Array.from(
  new Set(
    [
      ...syntheticsMonitorStatusRuleParamsSchema.getSchemaStructure(),
      ...tlsRuleParamsSchema.getSchemaStructure(),
    ]
      .filter(
        (s) =>
          s.path.length > 0 &&
          s.path[0] !== 'kqlQuery' &&
          s.path[0] !== 'condition' &&
          s.path[0] !== 'certAgeThreshold' &&
          s.path[0] !== 'certExpirationThreshold' &&
          s.path[0] !== 'search'
      )
      .map((s) => s.path[0])
      .sort()
  )
);

const fieldMap: Record<string, string> = {
  locations: 'observer.name',
  monitorIds: 'monitor.id',
  monitorTypes: 'monitor.type',
  projects: 'project.id',
  tags: 'tags',
};

function getFieldnameForKey(key: string): string {
  return fieldMap[key];
}

function listToKqlNode(fieldname: string, list: string[]): KueryNode {
  if (list.length === 0) {
    throw new Error(`Alert params ${fieldname ?? 'field'} must be a non-empty array`);
  }
  return nodeBuilder.or(list.map((item) => nodeBuilder.is(fieldname, item)));
}

export function mapExtraSyntheticsFilters(
  extraFilters: Partial<Record<string, string[] | undefined>>,
  kqlQuery?: string
): KueryNode[] {
  const filters: KueryNode[] = [];

  if (kqlQuery) {
    filters.push(fromKueryExpression(kqlQuery));
  }

  filters.push(
    ...supportedAlertParams
      .filter((key) => Array.isArray(extraFilters[key]) && extraFilters[key]!.length > 0)
      .map((key) => listToKqlNode(getFieldnameForKey(key), extraFilters[key]!))
  );

  return filters;
}
