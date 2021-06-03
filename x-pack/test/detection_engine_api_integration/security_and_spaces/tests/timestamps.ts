/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';

import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_STATUS_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  createRule,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleMlRule,
  getSimpleMlRuleOutput,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  waitForAlertToComplete,
  getRuleForSignalTesting,
  getSignalsByIds,
  getRuleForSignalTestingWithTimestampOverride,
} from '../../utils';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { createUserAndRole, deleteUserAndRole } from '../roles_users_utils';
import { RuleStatusResponse } from '../../../../plugins/security_solution/server/lib/detection_engine/rules/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('timestamps', () => {
    describe('source index with timestamp in milliseconds', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        await esArchiver.load('security_solution/timestamp_in_seconds');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('security_solution/timestamp_in_seconds');
      });

      it('should convert a timestamp in epoch_seconds to the correct ISO format', async () => {
        const rule = getRuleForSignalTesting(['timestamp_in_seconds']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.signal.original_time).sort();
        expect(hits).to.eql([]);
      });
    });
  });
};
