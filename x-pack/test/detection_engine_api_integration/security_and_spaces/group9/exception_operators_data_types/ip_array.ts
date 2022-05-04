/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('Rule exception operators for data type ip', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/ip_as_array');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/ip_as_array');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
      await createListsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
    });

    describe('"is" operator', () => {
      it('should find all the ips from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          [],
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
          ['127.0.0.8', '127.0.0.9', '127.0.0.10'],
        ]);
      });

      it('should filter 1 single ip if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          [],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
          ['127.0.0.8', '127.0.0.9', '127.0.0.10'],
        ]);
      });

      it('should filter 2 ips if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
              value: '127.0.0.5',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([[], ['127.0.0.8', '127.0.0.9', '127.0.0.10']]);
      });

      it('should filter 3 ips if all 3 are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
              value: '127.0.0.5',
            },
          ],
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.8',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips.flat(Number.MAX_SAFE_INTEGER)).to.eql([]);
      });

      it('should filter a CIDR range of "127.0.0.1/30"', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.1/30', // CIDR IP Range is 127.0.0.0 - 127.0.0.3
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          [],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
          ['127.0.0.8', '127.0.0.9', '127.0.0.10'],
        ]);
      });

      it('should filter a CIDR range of "127.0.0.4/31"', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match',
              value: '127.0.0.4/31', // CIDR IP Range is 127.0.0.4 - 127.0.0.5
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([[], ['127.0.0.8', '127.0.0.9', '127.0.0.10']]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '192.168.0.1', // this value does not exist
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '127.0.0.1',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4']]);
      });

      it('will return just 1 result we excluded 2 from the same array elements', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '127.0.0.1',
            },
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match',
              value: '127.0.0.2',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4']]);
      });

      it('will return 0 results if we exclude two ips', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
              value: '127.0.0.5',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single ip if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match_any',
              value: ['127.0.0.1'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          [],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
          ['127.0.0.8', '127.0.0.9', '127.0.0.10'],
        ]);
      });

      it('should filter 2 ips if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match_any',
              value: ['127.0.0.1', '127.0.0.5'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([[], ['127.0.0.8', '127.0.0.9', '127.0.0.10']]);
      });

      it('should filter 3 ips if all 3 are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'match_any',
              value: ['127.0.0.1', '127.0.0.5', '127.0.0.8'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips.flat(Number.MAX_SAFE_INTEGER)).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match_any',
              value: ['192.168.0.1', '192.168.0.2'], // These values do not exist
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'match_any',
              value: ['127.0.0.1', '127.0.0.5'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
        ]);
      });
    });

    describe('"exists" operator', () => {
      it('will return 1 empty result if matching against ip', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips.flat(Number.MAX_SAFE_INTEGER)).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 3 results if matching against ip', async () => {
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
          ['127.0.0.8', '127.0.0.9', '127.0.0.10'],
        ]);
      });
    });

    describe('"is in list" operator', () => {
      it('will return 3 results if we have a list that includes 1 ip', async () => {
        await importFile(supertest, log, 'ip', ['127.0.0.1'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          [],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
          ['127.0.0.8', '127.0.0.9', '127.0.0.10'],
        ]);
      });

      it('will return 2 results if we have a list that includes 2 ips', async () => {
        await importFile(supertest, log, 'ip', ['127.0.0.1', '127.0.0.5'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([[], ['127.0.0.8', '127.0.0.9', '127.0.0.10']]);
      });

      it('will return 1 result if we have a list that includes all ips', async () => {
        await importFile(
          supertest,
          log,
          'ip',
          ['127.0.0.1', '127.0.0.5', '127.0.0.8'],
          'list_items.txt'
        );
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips.flat(Number.MAX_SAFE_INTEGER)).to.eql([]);
      });

      it('will return 2 results if we have a list which contains the CIDR ranges of "127.0.0.1/32, 127.0.0.2/31, 127.0.0.4/30"', async () => {
        await importFile(
          supertest,
          log,
          'ip_range',
          ['127.0.0.1/32', '127.0.0.2/31', '127.0.0.4/30'],
          'list_items.txt',
          [
            '127.0.0.1',
            '127.0.0.2',
            '127.0.0.3',
            '127.0.0.4',
            '127.0.0.5',
            '127.0.0.6',
            '127.0.0.7',
          ]
        );
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip_range',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([[], ['127.0.0.8', '127.0.0.9', '127.0.0.10']]);
      });

      it('will return 2 results if we have a list which contains the range syntax of "127.0.0.1-127.0.0.7', async () => {
        await importFile(supertest, log, 'ip_range', ['127.0.0.1-127.0.0.7'], 'list_items.txt', [
          '127.0.0.1',
          '127.0.0.2',
          '127.0.0.3',
          '127.0.0.4',
          '127.0.0.5',
          '127.0.0.6',
          '127.0.0.7',
        ]);
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip_range',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([[], ['127.0.0.8', '127.0.0.9', '127.0.0.10']]);
      });
    });

    describe('"is not in list" operator', () => {
      it('will return 1 result if we have a list that excludes 1 ip', async () => {
        await importFile(supertest, log, 'ip', ['127.0.0.1'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4']]);
      });

      it('will return 2 results if we have a list that excludes 2 ips', async () => {
        await importFile(supertest, log, 'ip', ['127.0.0.1', '127.0.0.5'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
        ]);
      });

      it('will return 3 results if we have a list that excludes all ips', async () => {
        await importFile(
          supertest,
          log,
          'ip',
          ['127.0.0.1', '127.0.0.5', '127.0.0.8'],
          'list_items.txt'
        );
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
          ['127.0.0.8', '127.0.0.9', '127.0.0.10'],
        ]);
      });

      it('will return 3 results if we have a list which contains the CIDR ranges of "127.0.0.1/32, 127.0.0.2/31, 127.0.0.4/30"', async () => {
        await importFile(
          supertest,
          log,
          'ip_range',
          ['127.0.0.1/32', '127.0.0.2/31', '127.0.0.4/30'],
          'list_items.txt',
          [
            '127.0.0.1',
            '127.0.0.2',
            '127.0.0.3',
            '127.0.0.4',
            '127.0.0.5',
            '127.0.0.6',
            '127.0.0.7',
          ]
        );
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip_range',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
        ]);
      });

      it('will return 3 results if we have a list which contains the range syntax of "127.0.0.1-127.0.0.7"', async () => {
        await importFile(supertest, log, 'ip_range', ['127.0.0.1-127.0.0.7'], 'list_items.txt', [
          '127.0.0.1',
          '127.0.0.2',
          '127.0.0.3',
          '127.0.0.4',
          '127.0.0.5',
          '127.0.0.6',
          '127.0.0.7',
        ]);
        const rule = getRuleForSignalTesting(['ip_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'ip',
              list: {
                id: 'list_items.txt',
                type: 'ip_range',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const ips = signalsOpen.hits.hits.map((hit) => hit._source?.ip).sort();
        expect(ips).to.eql([
          ['127.0.0.1', '127.0.0.2', '127.0.0.3', '127.0.0.4'],
          ['127.0.0.5', null, '127.0.0.6', '127.0.0.7'],
        ]);
      });
    });
  });
};
