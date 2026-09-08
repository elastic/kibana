/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  clearChangeHistory,
  countChangeHistory,
  getCustomQueryRuleParams,
  refreshChangeHistory,
} from '../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @skipInServerless change tracking with "Enable rule changes history" setting disabled', () => {
    before(async () => {
      await clearChangeHistory(es);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('rejects rule changes history request with 403', async () => {
      const { body: rule } = await detectionsApi
        .createRule({ body: getCustomQueryRuleParams() })
        .expect(200);

      await detectionsApi
        .ruleChangesHistory({ params: { ruleId: rule.id }, query: {} })
        .expect(403);
    });

    it('rejects rule restore from history request with 403', async () => {
      const { body: rule } = await detectionsApi
        .createRule({ body: getCustomQueryRuleParams() })
        .expect(200);

      await detectionsApi
        .restoreRuleFromHistory({
          params: { ruleId: rule.id, changeId: uuidv4() },
          body: { revision: 0 },
        })
        .expect(403);
    });

    it('writes no records to the change history data stream on rule create', async () => {
      await detectionsApi.createRule({ body: getCustomQueryRuleParams() }).expect(200);

      await refreshChangeHistory(es);
      const count = await countChangeHistory(es);

      expect(count).toBe(0);
    });
  });
};
