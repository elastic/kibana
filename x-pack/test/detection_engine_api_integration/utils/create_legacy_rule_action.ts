/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { UPDATE_OR_CREATE_LEGACY_ACTIONS } from '@kbn/security-solution-plugin/common/constants';

export const createLegacyRuleAction = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  alertId: string,
  connectorId: string
): Promise<unknown> =>
  supertest
    .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}`)
    .set('kbn-xsrf', 'true')
    .query({ alert_id: alertId })
    .send({
      name: 'Legacy notification with one action',
      interval: '1h',
      actions: [
        {
          id: connectorId,
          group: 'default',
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          actionTypeId: '.slack',
        },
      ],
    });
