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
import { QueryCreateSchema } from '../../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createRuleWithExceptionEntries,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getAllSignals,
  getSimpleRule,
  waitForSignalsToBePresent,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('Rule exception operators for data type date', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await createListsIndex(supertest);
      await esArchiver.load('rule_exceptions/date');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(es);
      await deleteAllExceptions(es);
      await deleteListsIndex(supertest);
      await esArchiver.unload('rule_exceptions/date');
    });

    describe('"is" operator', () => {
      it('should find all the dates from the data set when no exceptions are set on the rule', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRule(supertest, rule);
        await waitForSignalsToBePresent(supertest, 4);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([
          '2020-10-01T05:08:53.000Z',
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('should filter 1 single date if it is set as an exception', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 3);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('should filter 2 dates if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-03T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });

      it('should filter 3 dates if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-03T05:08:53.000Z',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-04T05:08:53.000Z']);
      });

      it('should filter 4 dates if all are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-03T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-04T05:08:53.000Z',
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2021-10-01T05:08:53.000Z', // date is not in data set
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z']);
      });

      it('will return 0 results if we exclude two dates', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single date if it is set as an exception', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: ['2020-10-01T05:08:53.000Z'],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 3);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('should filter 2 dates if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: ['2020-10-01T05:08:53.000Z', '2020-10-02T05:08:53.000Z'],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-03T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });

      it('should filter 3 dates if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: [
                '2020-10-01T05:08:53.000Z',
                '2020-10-02T05:08:53.000Z',
                '2020-10-03T05:08:53.000Z',
              ],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-04T05:08:53.000Z']);
      });

      it('should filter 4 dates if all are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: [
                '2020-10-01T05:08:53.000Z',
                '2020-10-02T05:08:53.000Z',
                '2020-10-03T05:08:53.000Z',
                '2020-10-04T05:08:53.000Z',
              ],
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match_any',
              value: ['2021-10-01T05:08:53.000Z', '2022-10-01T05:08:53.000Z'],
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match_any',
              value: ['2020-10-01T05:08:53.000Z', '2020-10-04T05:08:53.000Z'],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against date', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 0 results if matching against date', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is in list" operator', () => {
      it('will return 3 results if we have a list that includes 1 date', async () => {
        await importFile(supertest, 'date', ['2020-10-01T05:08:53.000Z'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 3);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('will return 2 results if we have a list that includes 2 dates', async () => {
        await importFile(
          supertest,
          'date',
          ['2020-10-01T05:08:53.000Z', '2020-10-03T05:08:53.000Z'],
          'list_items.txt'
        );
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-02T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });

      it('will return 0 results if we have a list that includes all dates', async () => {
        await importFile(
          supertest,
          'date',
          [
            '2020-10-01T05:08:53.000Z',
            '2020-10-02T05:08:53.000Z',
            '2020-10-03T05:08:53.000Z',
            '2020-10-04T05:08:53.000Z',
          ],
          'list_items.txt'
        );
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not in list" operator', () => {
      it('will return 1 result if we have a list that excludes 1 date', async () => {
        await importFile(supertest, 'date', ['2020-10-01T05:08:53.000Z'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z']);
      });

      it('will return 2 results if we have a list that excludes 2 dates', async () => {
        await importFile(
          supertest,
          'date',
          ['2020-10-01T05:08:53.000Z', '2020-10-03T05:08:53.000Z'],
          'list_items.txt'
        );
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z', '2020-10-03T05:08:53.000Z']);
      });

      it('will return 4 results if we have a list that excludes all dates', async () => {
        await importFile(
          supertest,
          'date',
          [
            '2020-10-01T05:08:53.000Z',
            '2020-10-02T05:08:53.000Z',
            '2020-10-03T05:08:53.000Z',
            '2020-10-04T05:08:53.000Z',
          ],
          'list_items.txt'
        );
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['date'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 4);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.date).sort();
        expect(hits).to.eql([
          '2020-10-01T05:08:53.000Z',
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });
    });
  });
};
