/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import { FindGapsResponse } from '@kbn/alerting-plugin/common/routes/gaps/apis/find';
import { routeWithNamespace } from '../route_with_namespace';

export const getGapsByRuleId = async (
  supertest: SuperTest.Agent,
  ruleId: string,
  { start, end }: { start: string; end: string },
  perPage: number,
  namespace: string = 'default'
) => {
  const response = (await supertest
    .post(routeWithNamespace(`/internal/alerting/rules/gaps/_find`, namespace))
    .set('kbn-xsrf', 'foo')
    .send({
      rule_id: ruleId,
      start,
      end,
      per_page: perPage,
    })) as FindGapsResponse;

  return response.body.data;
};
