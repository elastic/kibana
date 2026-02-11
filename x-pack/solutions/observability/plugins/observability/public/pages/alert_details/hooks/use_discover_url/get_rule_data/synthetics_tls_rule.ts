/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import { type TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import { nodeBuilder, toKqlExpression, type KueryNode } from '@kbn/es-query';
import moment from 'moment';
import { SYNTHETICS_TEMP_DATA_VIEW, mapExtraSyntheticsFilters } from './synthetics_common';

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

export const getSyntheticsTlsRuleData = ({ rule }: { rule: Rule }) => {
  const params = rule.params as TLSRuleParams;
  const query = syntheticsTlsAlertParamsToKqlQuery(params);
  return {
    discoverAppLocatorParams: {
      query: {
        language: 'kuery',
        query,
      },
      dataViewSpec: SYNTHETICS_TEMP_DATA_VIEW,
    },
  };
};
