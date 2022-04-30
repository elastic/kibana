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

  describe('Rule exception operators for data type integer', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/integer');
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/integer_as_string');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/integer');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/rule_exceptions/integer_as_string'
      );
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
      it('should find all the integer from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['1', '2', '3', '4']);
      });

      it('should filter 1 single integer if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['2', '3', '4']);
      });

      it('should filter 2 integer if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '2',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['3', '4']);
      });

      it('should filter 3 integer if all 3 are as exceptions', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '2',
            },
          ],
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '3',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['4']);
      });

      it('should filter 4 integer if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '2',
            },
          ],
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '3',
            },
          ],
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match',
              value: '4',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'excluded',
              type: 'match',
              value: '1',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['1']);
      });

      it('will return 0 results if we exclude two integer', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'excluded',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'integer',
              operator: 'excluded',
              type: 'match',
              value: '2',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single integer if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match_any',
              value: ['1'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['2', '3', '4']);
      });

      it('should filter 2 integer if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['3', '4']);
      });

      it('should filter 3 integer if all 3 are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2', '3'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['4']);
      });

      it('should filter 4 integer if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2', '3', '4'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'excluded',
              type: 'match_any',
              value: ['1', '4'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['1', '4']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against integer', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 4 results if matching against integer', async () => {
        const rule = getRuleForSignalTesting(['integer']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'integer',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
        expect(hits).to.eql(['1', '2', '3', '4']);
      });
    });

    describe('"is in list" operator', () => {
      describe('working against integer values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 integer', async () => {
          await importFile(supertest, log, 'integer', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['2', '3', '4']);
        });

        it('will return 2 results if we have a list that includes 2 integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['2', '4']);
        });

        it('will return 0 results if we have a list that includes all integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql([]);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 integer', async () => {
          await importFile(supertest, log, 'integer', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['2', '3', '4']);
        });

        it('will return 2 results if we have a list that includes 2 integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['2', '4']);
        });

        it('will return 0 results if we have a list that includes all integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql([]);
        });

        it('will return 1 result if we have a list which contains the integer range of 1-3', async () => {
          await importFile(supertest, log, 'integer_range', ['1-3'], 'list_items.txt', ['1', '2']);
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer_range',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['4']);
        });
      });
    });

    describe('"is not in list" operator', () => {
      describe('working against integer values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 integer', async () => {
          await importFile(supertest, log, 'integer', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['1']);
        });

        it('will return 2 results if we have a list that excludes 2 integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['1', '3']);
        });

        it('will return 4 results if we have a list that excludes all integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['1', '2', '3', '4']);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 integer', async () => {
          await importFile(supertest, log, 'integer', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['1']);
        });

        it('will return 2 results if we have a list that excludes 2 integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['1', '3']);
        });

        it('will return 4 results if we have a list that excludes all integer', async () => {
          await importFile(supertest, log, 'integer', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['1', '2', '3', '4']);
        });

        it('will return 3 results if we have a list which contains the integer range of 1-3', async () => {
          await importFile(supertest, log, 'integer_range', ['1-3'], 'list_items.txt', [
            '1',
            '2',
            '3',
          ]);
          const rule = getRuleForSignalTesting(['integer_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'integer',
                list: {
                  id: 'list_items.txt',
                  type: 'integer_range',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.integer).sort();
          expect(hits).to.eql(['1', '2', '3']);
        });
      });
    });
  });
};
