/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import {
  KQL_FILTER_IMMUTABLE_RULES,
  KQL_FILTER_MUTABLE_RULES,
} from '../../../../../../common/detection_engine/rule_management/rule_filtering';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { findRules } from './find_rules';
import type { RuleAlertType } from '../../../rule_schema';

export const MAX_PREBUILT_RULES_COUNT = 10_000;

export const getRulesCount = async ({
  rulesClient,
  filter,
}: {
  rulesClient: RulesClient;
  filter: string;
}): Promise<number> => {
  return withSecuritySpan('getRulesCount', async () => {
    const { total } = await findRules({
      rulesClient,
      filter,
      perPage: 0,
      page: 1,
      sortField: 'createdAt',
      sortOrder: 'desc',
      fields: undefined,
    });
    return total;
  });
};

export const getRules = async ({
  rulesClient,
  filter,
  page = 1,
  perPage = MAX_PREBUILT_RULES_COUNT,
}: {
  rulesClient: RulesClient;
  filter: string;
  page?: number;
  perPage?: number;
}): Promise<RuleAlertType[]> =>
  withSecuritySpan('getRules', async () => {
    const rules = await findRules({
      rulesClient,
      filter,
      perPage,
      page,
      sortField: 'createdAt',
      sortOrder: 'desc',
      fields: undefined,
    });

    return rules.data;
  });

export const getNonPackagedRules = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    filter: KQL_FILTER_MUTABLE_RULES,
  });
};

export const getExistingPrepackagedRules = async ({
  rulesClient,
  page,
  perPage,
}: {
  rulesClient: RulesClient;
  page?: number;
  perPage?: number;
}): Promise<RuleAlertType[]> => {
  return getRules({
    rulesClient,
    page,
    perPage,
    filter: KQL_FILTER_IMMUTABLE_RULES,
  });
};
