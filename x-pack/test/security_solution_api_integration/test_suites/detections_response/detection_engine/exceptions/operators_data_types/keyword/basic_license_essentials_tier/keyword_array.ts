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
} from '../../../../../../lists_and_exception_lists/utils';

import { createRuleWithExceptionEntries } from '../../../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  getAlertsById,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @serverlessQA @ess Rule exception operators for data type keyword array', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/keyword_as_array');
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/rule_exceptions/keyword_as_array'
      );
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
      await createListsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
    });

    describe('"is" operator', () => {
      it('should find all the keyword from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
          undefined,
        ]);
      });

      it('should filter 1 single keyword if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'word one',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          undefined,
        ]);
      });

      it('should filter 2 keyword if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'word one',
            },
          ],
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'word seven',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word eight', 'word nine', 'word ten'], undefined]);
      });

      it('should filter 3 keyword if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'word one',
            },
          ],
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'word six',
            },
          ],
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'word nine',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits.flat(10)).to.eql([undefined]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'match',
              value: 'word one',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word one', 'word two', 'word three', 'word four']]);
      });

      it('will return 0 results if we exclude two keyword', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'match',
              value: 'word one',
            },
          ],
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'match',
              value: 'word five',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single keyword if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match_any',
              value: ['word one'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          undefined,
        ]);
      });

      it('should filter 2 keyword if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match_any',
              value: ['word one', 'word six'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word eight', 'word nine', 'word ten'], undefined]);
      });

      it('should filter 3 keyword if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match_any',
              value: ['word one', 'word five', 'word eight'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits.flat(10)).to.eql([undefined]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'match_any',
              value: ['word one', 'word six'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });
    });

    describe('"exists" operator', () => {
      it('will return 1 results if matching against keyword for the empty array', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits.flat(10)).to.eql([undefined]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 3 results if matching against keyword', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });
    });

    describe('"is in list" operator', () => {
      it('will return 4 results if we have two lists with an AND contradiction keyword === "word one" AND keyword === "word five"', async () => {
        await importFile(supertest, log, 'keyword', ['word one'], 'list_items_1.txt');
        await importFile(supertest, log, 'keyword', ['word five'], 'list_items_2.txt');
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items_1.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
            {
              field: 'keyword',
              list: {
                id: 'list_items_2.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
          undefined,
        ]);
      });

      it('will return 3 results if we have two lists with an AND keyword === "word one" AND keyword === "word two" since we have an array', async () => {
        await importFile(supertest, log, 'keyword', ['word one'], 'list_items_1.txt');
        await importFile(supertest, log, 'keyword', ['word two'], 'list_items_2.txt');
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items_1.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
            {
              field: 'keyword',
              list: {
                id: 'list_items_2.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          undefined,
        ]);
      });

      it('will return 3 results if we have a list that includes 1 keyword', async () => {
        await importFile(supertest, log, 'keyword', ['word one'], 'list_items.txt');
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          undefined,
        ]);
      });

      it('will return 2 results if we have a list that includes 2 keyword', async () => {
        await importFile(supertest, log, 'keyword', ['word one', 'word six'], 'list_items.txt');
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word eight', 'word nine', 'word ten'], undefined]);
      });

      it('will return only the empty array for results if we have a list that includes all keyword', async () => {
        await importFile(
          supertest,
          log,
          'keyword',
          ['word one', 'word five', 'word eight'],
          'list_items.txt'
        );
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits.flat(10)).to.eql([undefined]);
      });
    });

    describe('"is not in list" operator', () => {
      it('will return 1 result if we have a list that excludes 1 keyword', async () => {
        await importFile(supertest, log, 'keyword', ['word one'], 'list_items.txt');
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items.txt',
                type: 'keyword',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word one', 'word two', 'word three', 'word four']]);
      });

      it('will return 1 result if we have a list that excludes 1 keyword but repeat 2 elements from the array in the list', async () => {
        await importFile(supertest, log, 'keyword', ['word one', 'word two'], 'list_items.txt');
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items.txt',
                type: 'keyword',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word one', 'word two', 'word three', 'word four']]);
      });

      it('will return 2 results if we have a list that excludes 2 keyword', async () => {
        await importFile(supertest, log, 'keyword', ['word one', 'word five'], 'list_items.txt');
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items.txt',
                type: 'keyword',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });

      it('will return 3 results if we have a list that excludes 3 items', async () => {
        await importFile(
          supertest,
          log,
          'keyword',
          ['word one', 'word six', 'word ten'],
          'list_items.txt'
        );
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              list: {
                id: 'list_items.txt',
                type: 'keyword',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });
    });

    describe('"matches wildcard" operator', () => {
      it('should filter 1 single keyword if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'wildcard',
              value: 'word o*',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          undefined,
        ]);
      });

      it('should filter 2 keyword if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'wildcard',
              value: 'word t*',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word five', null, 'word six', 'word seven'], undefined]);
      });

      it('should filter 3 keyword if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'included',
              type: 'wildcard',
              value: 'word *',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits.flat(10)).to.eql([undefined]);
      });
    });

    describe('"does not match wildcard" operator', () => {
      it('should filter 1 single keyword if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'wildcard',
              value: 'word o*',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([['word one', 'word two', 'word three', 'word four']]);
      });

      it('should filter 2 keyword if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'wildcard',
              value: 'word t*',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });

      it('should filter 3 keyword if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['keyword_as_array']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'keyword',
              operator: 'excluded',
              type: 'wildcard',
              value: 'word *',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.keyword).sort();
        expect(hits).to.eql([
          ['word eight', 'word nine', 'word ten'],
          ['word five', null, 'word six', 'word seven'],
          ['word one', 'word two', 'word three', 'word four'],
        ]);
      });
    });
  });
};
