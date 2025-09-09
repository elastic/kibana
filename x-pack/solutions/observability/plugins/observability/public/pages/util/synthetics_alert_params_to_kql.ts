/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, type KueryNode, nodeBuilder, toKqlExpression } from '@kbn/es-query';
import type { SyntheticsMonitorStatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import moment from 'moment';

const supportedAlertParams = [
  'tags',
  'locations',
  'monitorIds',
  'monitorTypes',
  'projects',
] as const;

type SupportedAlertParam = (typeof supportedAlertParams)[number];

const fieldMap: Record<SupportedAlertParam, string> = {
  locations: 'observer.name',
  monitorIds: 'monitor.id',
  monitorTypes: 'monitor.type',
  projects: 'project.id',
  tags: 'tags',
};
function getFieldnameForKey(key: SupportedAlertParam): string {
  return fieldMap[key];
}

function listToKqlNode(fieldname: string, list: string[]): KueryNode {
  if (list.length === 0) {
    throw new Error(`Alert params ${fieldname ?? 'field'} must be a non-empty array`);
  }
  return nodeBuilder.or(list.map((item) => nodeBuilder.is(fieldname, item)));
}

function mapExtraSyntheticsFilters(
  extraFilters: Partial<Record<SupportedAlertParam, string[] | undefined>>,
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

/**
 *
 * @param params from a Synthetics Monitor Status Alert
 * @returns KQL query string
 */
export function syntheticsMonitorStatusAlertParamsToKqlQuery(
  params: SyntheticsMonitorStatusRuleParams
): string {
  const { condition, kqlQuery, ...rest } = params;

  const filters = mapExtraSyntheticsFilters(rest, kqlQuery);

  filters.push(nodeBuilder.is('monitor.status', 'down'));

  return toKqlExpression(nodeBuilder.and(filters));
}

/**
 * Maps the params for a Synthetics TLS Alert to a KQL query string.
 *
 * @param params from a Synthetics TLS Alert
 * @returns KQL query string
 */
export function syntheticsTlsAlertParamsToKqlQuery(params: TLSRuleParams): string {
  const { certAgeThreshold, certExpirationThreshold, search, kqlQuery, ...rest } = params;

  const expirationFilters: KueryNode[] = [];
  const filters: KueryNode[] = [];

  if (certExpirationThreshold) {
    expirationFilters.push(
      nodeBuilder.range(
        'tls.server.x509.not_after',
        'lt',
        moment().add(certExpirationThreshold, 'days').toISOString()
      )
    );
  }

  if (certAgeThreshold) {
    expirationFilters.push(
      nodeBuilder.range(
        'tls.server.x509.not_before',
        'lt',
        moment().subtract(certAgeThreshold, 'days').toISOString()
      )
    );
  }

  if (expirationFilters.length) {
    filters.push(nodeBuilder.or(expirationFilters));
  }

  filters.push(...mapExtraSyntheticsFilters(rest, kqlQuery));

  if (filters.length === 0) return '';

  return toKqlExpression(nodeBuilder.and(filters));
}
