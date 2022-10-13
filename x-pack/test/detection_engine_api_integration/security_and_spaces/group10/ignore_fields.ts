/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getSignalsById,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

interface Ignore {
  normal_constant?: string;
  small_field?: string;
  testing_ignored?: string;
  testing_regex?: string;
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  /**
   * See the config file (detection_engine_api_integration/common/config.ts) for which field values were added to be ignored
   * for testing. The values should be in the config around the area of:
   * --xpack.securitySolution.alertIgnoreFields=[testing.ignore_1,/[testingRegex]
   * meaning that the ignore fields values should be the array: ["testing.ignore_1", "/[testingRegex]/"]
   *
   * This test exercises the ability to be able to ignore particular values within the fields API and merge strategies.
   * These values can be defined in your kibana.yml file as "xpack.securitySolution.alertIgnoreFields". This is useful
   * for users that find bugs or regressions within query languages or bugs within the merge strategies
   * where one or more fields are causing problems and they need to turn disable that particular field.
   *
   * Ref:
   * https://github.com/elastic/kibana/issues/110802
   * https://github.com/elastic/elasticsearch/issues/77152
   *
   * Files ref:
   * server/lib/detection_engine/signals/source_fields_merging/utils/is_ignored.ts
   * server/lib/detection_engine/signals/source_fields_merging/utils/is_eql_bug_77152.ts
   */
  describe('ignore_fields', () => {
    const supertest = getService('supertest');
    const esArchiver = getService('esArchiver');
    const log = getService('log');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ignore_fields');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ignore_fields');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('should ignore the field of "testing_ignored"', async () => {
      const rule = getEqlRuleForSignalTesting(['ignore_fields']);

      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id);
      await waitForSignalsToBePresent(supertest, log, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, log, id);
      const hits = signalsOpen.hits.hits
        .map((hit) => (hit._source as Ignore).testing_ignored)
        .sort();

      // Value should be "undefined for all records"
      expect(hits).to.eql([undefined, undefined, undefined, undefined]);
    });

    it('should ignore the field of "testing_regex"', async () => {
      const rule = getEqlRuleForSignalTesting(['ignore_fields']);

      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id);
      await waitForSignalsToBePresent(supertest, log, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, log, id);
      const hits = signalsOpen.hits.hits.map((hit) => (hit._source as Ignore).testing_regex).sort();

      // Value should be "undefined for all records"
      expect(hits).to.eql([undefined, undefined, undefined, undefined]);
    });

    it('should have the field of "normal_constant"', async () => {
      const rule = getEqlRuleForSignalTesting(['ignore_fields']);

      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id);
      await waitForSignalsToBePresent(supertest, log, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, log, id);
      const hits = signalsOpen.hits.hits
        .map((hit) => (hit._source as Ignore).normal_constant)
        .sort();

      // Value should be "constant_value for all records"
      expect(hits).to.eql(['constant_value', 'constant_value', 'constant_value', 'constant_value']);
    });

    // TODO: Remove this test once https://github.com/elastic/elasticsearch/issues/77152 is fixed
    it('should ignore the field of "_ignored" when using EQL and index the data', async () => {
      const rule = getEqlRuleForSignalTesting(['ignore_fields']);

      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id);
      await waitForSignalsToBePresent(supertest, log, 4, [id]);
      const signalsOpen = await getSignalsById(supertest, log, id);
      const hits = signalsOpen.hits.hits.map((hit) => (hit._source as Ignore).small_field).sort();

      // We just test a constant value to ensure this did not blow up on us and did index data.
      expect(hits).to.eql([
        '1 indexed',
        '2 large not indexed',
        '3 large not indexed',
        '4 large not indexed',
      ]);
    });
  });
};
