/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../../lists_api_integration/utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createRuleWithExceptionEntries,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  getSignalsById,
  waitForRuleSuccess,
  waitForSignalsToBePresent,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('Rule exception operators for data type ip', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await createListsIndex(supertest);
      await esArchiver.load('rule_exceptions/ip');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await deleteAllExceptions(es);
      await deleteListsIndex(supertest);
      await esArchiver.unload('rule_exceptions/ip');
    });

    describe('"is" operator', () => {
      it('should find all the ips from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4']);
      });

      it('should filter 1 single ip if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.2', '127.0.0.3', '127.0.0.4']);
      });

      it('should filter 2 ips if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.2',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.3', '127.0.0.4']);
      });

      it('should filter 3 ips if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.2',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.3',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.4']);
      });

      it('should filter 4 ips if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.2',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.3',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.4',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql([]);
      });

      it('should filter a CIDR range of 127.0.0.1/30', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.1/30', // CIDR IP Range is 127.0.0.0 - 127.0.0.3
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.4']);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '192.168.0.1',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1']);
      });

      it('will return 0 results if we exclude two ips', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '127.0.0.2',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single ip if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match_any',
              value: ['127.0.0.1'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.2', '127.0.0.3', '127.0.0.4']);
      });

      it('should filter 2 ips if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match_any',
              value: ['127.0.0.1', '127.0.0.2'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.3', '127.0.0.4']);
      });

      it('should filter 3 ips if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match_any',
              value: ['127.0.0.1', '127.0.0.2', '127.0.0.3'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.4']);
      });

      it('should filter 4 ips if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match_any',
              value: ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match_any',
              value: ['192.168.0.1', '192.168.0.2'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match_any',
              value: ['127.0.0.1', '127.0.0.4'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1', '127.0.0.4']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against ip', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 4 results if matching against ip', async () => {
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4']);
      });
    });

    describe('"is in list" operator', () => {
      it('will return 3 results if we have a list that includes 1 ip', async () => {
        await importFile(supertest, 'ip', ['127.0.0.1'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.2', '127.0.0.3', '127.0.0.4']);
      });

      it('will return 2 results if we have a list that includes 2 ips', async () => {
        await importFile(supertest, 'ip', ['127.0.0.1', '127.0.0.3'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.2', '127.0.0.4']);
      });

      it('will return 0 results if we have a list that includes all ips', async () => {
        await importFile(
          supertest,
          'ip',
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          'list_items.txt'
        );
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql([]);
      });

      // TODO: Fix this bug and then unskip this test
      it.skip('will return 1 result if we have a list which contains the CIDR range of 127.0.0.1/30', async () => {
        await importFile(supertest, 'ip_range', ['127.0.0.1/30'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.4']);
      });
    });

    describe('"is not in list" operator', () => {
      it('will return 1 result if we have a list that excludes 1 ip', async () => {
        await importFile(supertest, 'ip', ['127.0.0.1'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1']);
      });

      it('will return 2 results if we have a list that excludes 2 ips', async () => {
        await importFile(supertest, 'ip', ['127.0.0.1', '127.0.0.3'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1', '127.0.0.3']);
      });

      it('will return 4 results if we have a list that excludes all ips', async () => {
        await importFile(
          supertest,
          'ip',
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          'list_items.txt'
        );
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4']);
      });

      // TODO: Fix this bug and then unskip this test
      it.skip('will return 3 results if we have a list which contains the CIDR range of 127.0.0.1/30', async () => {
        await importFile(supertest, 'ip_range', ['127.0.0.1/30'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
        expect(ips).to.eql(['127.0.0.1', '127.0.0.2', '127.0.0.3']);
      });
    });
  });
};
