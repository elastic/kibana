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
  const es = getService('es');

  describe('Rule exception operators for data type text', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await createListsIndex(supertest);
      await esArchiver.load('rule_exceptions/text_as_array');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await deleteAllExceptions(es);
      await deleteListsIndex(supertest);
      await esArchiver.unload('rule_exceptions/text_as_array');
    });

    describe('"is" operator', () => {
      it('should find all the text from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          [],
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });

      it('should filter 1 single text if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match',
              value: 'word one',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          [],
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
        ]);
      });

      it('should filter 2 text if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match',
              value: 'word one',
            },
          ],
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match',
              value: 'word seven',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([[], ['word eight', 'word nine', 'word ten']]);
      });

      it('should filter 3 text if all 3 are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match',
              value: 'word one',
            },
          ],
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match',
              value: 'word six',
            },
          ],
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match',
              value: 'word nine',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([[]]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'excluded',
              type: 'match',
              value: 'word one',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([['word one', 'word two', 'word three', 'word four']]);
      });

      it('will return 0 results if we exclude two text', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'excluded',
              type: 'match',
              value: 'word one',
            },
          ],
          [
            {
              field: 'text',
              operator: 'excluded',
              type: 'match',
              value: 'word five',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single text if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match_any',
              value: ['word one'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          [],
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
        ]);
      });

      it('should filter 2 text if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match_any',
              value: ['word one', 'word six'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([[], ['word eight', 'word nine', 'word ten']]);
      });

      it('should filter 3 text if all 3 are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'included',
              type: 'match_any',
              value: ['word one', 'word five', 'word eight'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([[]]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'excluded',
              type: 'match_any',
              value: ['word one', 'word six'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });
    });

    describe('"exists" operator', () => {
      it('will return 1 results if matching against text for the empty array', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([[]]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 3 results if matching against text', async () => {
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });
    });

    describe('"is in list" operator', () => {
      it('will return 4 results if we have two lists with an AND contradiction text === "word one" AND text === "word five"', async () => {
        await importFile(supertest, 'text', ['word one'], 'list_items_1.txt');
        await importFile(supertest, 'text', ['word five'], 'list_items_2.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items_1.txt',
                type: 'text',
              },
              operator: 'included',
              type: 'list',
            },
            {
              field: 'text',
              list: {
                id: 'list_items_2.txt',
                type: 'text',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          [],
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });

      it('will return 3 results if we have two lists with an AND text === "word one" AND text === "word two" since we have an array', async () => {
        await importFile(supertest, 'text', ['word one'], 'list_items_1.txt');
        await importFile(supertest, 'text', ['word two'], 'list_items_2.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items_1.txt',
                type: 'text',
              },
              operator: 'included',
              type: 'list',
            },
            {
              field: 'text',
              list: {
                id: 'list_items_2.txt',
                type: 'text',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          [],
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
        ]);
      });

      it('will return 3 results if we have a list that includes 1 text', async () => {
        await importFile(supertest, 'text', ['word one'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items.txt',
                type: 'text',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          [],
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
        ]);
      });

      it('will return 2 results if we have a list that includes 2 text', async () => {
        await importFile(supertest, 'text', ['word one', 'word six'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items.txt',
                type: 'text',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([[], ['word eight', 'word nine', 'word ten']]);
      });

      it('will return only the empty array for results if we have a list that includes all text', async () => {
        await importFile(
          supertest,
          'text',
          ['word one', 'word five', 'word eight'],
          'list_items.txt'
        );
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items.txt',
                type: 'text',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([[]]);
      });
    });

    describe('"is not in list" operator', () => {
      it('will return 1 result if we have a list that excludes 1 text', async () => {
        await importFile(supertest, 'text', ['word one'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items.txt',
                type: 'text',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([['word one', 'word two', 'word three', 'word four']]);
      });

      it('will return 1 result if we have a list that excludes 1 text but repeat 2 elements from the array in the list', async () => {
        await importFile(supertest, 'text', ['word one', 'word two'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items.txt',
                type: 'text',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([['word one', 'word two', 'word three', 'word four']]);
      });

      it('will return 2 results if we have a list that excludes 2 text', async () => {
        await importFile(supertest, 'text', ['word one', 'word five'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items.txt',
                type: 'text',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });

      it('will return 3 results if we have a list that excludes 3 items', async () => {
        await importFile(supertest, 'text', ['word one', 'word six', 'word ten'], 'list_items.txt');
        const rule = getRuleForSignalTesting(['text_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'text',
              list: {
                id: 'list_items.txt',
                type: 'text',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.text).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });
    });
  });
};
