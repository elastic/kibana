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

  describe('Rule exception operators for data type long', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await createListsIndex(supertest);
      await esArchiver.load('rule_exceptions/long');
      await esArchiver.load('rule_exceptions/long_as_string');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await deleteAllExceptions(es);
      await deleteListsIndex(supertest);
      await esArchiver.unload('rule_exceptions/long');
      await esArchiver.unload('rule_exceptions/long_as_string');
    });

    describe('"is" operator', () => {
      it('should find all the long from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['1', '2', '3', '4']);
      });

      it('should filter 1 single long if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['2', '3', '4']);
      });

      it('should filter 2 long if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '2',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['3', '4']);
      });

      it('should filter 3 long if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '2',
            },
          ],
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '3',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['4']);
      });

      it('should filter 4 long if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '2',
            },
          ],
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '3',
            },
          ],
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '4',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match',
              value: '1',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['1']);
      });

      it('will return 0 results if we exclude two long', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match',
              value: '1',
            },
          ],
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match',
              value: '2',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single long if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['2', '3', '4']);
      });

      it('should filter 2 long if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['3', '4']);
      });

      it('should filter 3 long if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2', '3'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['4']);
      });

      it('should filter 4 long if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2', '3', '4'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match_any',
              value: ['1', '4'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['1', '4']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against long', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 4 results if matching against long', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
        expect(hits).to.eql(['1', '2', '3', '4']);
      });
    });

    describe('"is in list" operator', () => {
      // TODO: Enable this test once the bugs are fixed, we cannot use a list of strings that represent
      // a long against an index that has the longs stored as real longs.
      describe.skip('working against long values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 long', async () => {
          await importFile(supertest, 'long', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['2', '3', '4']);
        });

        it('will return 2 results if we have a list that includes 2 long', async () => {
          await importFile(supertest, 'long', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['2', '4']);
        });

        it('will return 0 results if we have a list that includes all long', async () => {
          await importFile(supertest, 'long', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql([]);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 long', async () => {
          await importFile(supertest, 'long', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['2', '3', '4']);
        });

        it('will return 2 results if we have a list that includes 2 long', async () => {
          await importFile(supertest, 'long', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['2', '4']);
        });

        it('will return 0 results if we have a list that includes all long', async () => {
          await importFile(supertest, 'long', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql([]);
        });

        // TODO: Fix this bug and then unskip this test
        it.skip('will return 1 result if we have a list which contains the long range of 1-3', async () => {
          await importFile(supertest, 'long_range', ['1-3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
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
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
          expect(hits).to.eql(['4']);
        });
      });
    });

    describe('"is not in list" operator', () => {
      // TODO: Enable this test once the bugs are fixed, we cannot use a list of strings that represent
      // a long against an index that has the longs stored as real longs.
      describe.skip('working against long values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 long', async () => {
          await importFile(supertest, 'long', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['1']);
        });

        it('will return 2 results if we have a list that excludes 2 long', async () => {
          await importFile(supertest, 'long', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['1', '3']);
        });

        it('will return 4 results if we have a list that excludes all long', async () => {
          await importFile(supertest, 'long', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['1', '2', '3', '4']);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 long', async () => {
          await importFile(supertest, 'long', ['1'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['1']);
        });

        it('will return 2 results if we have a list that excludes 2 long', async () => {
          await importFile(supertest, 'long', ['1', '3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['1', '3']);
        });

        it('will return 4 results if we have a list that excludes all long', async () => {
          await importFile(supertest, 'long', ['1', '2', '3', '4'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'long',
                list: {
                  id: 'list_items.txt',
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.long).sort();
          expect(hits).to.eql(['1', '2', '3', '4']);
        });

        // TODO: Fix this bug and then unskip this test
        it.skip('will return 3 results if we have a list which contains the long range of 1-3', async () => {
          await importFile(supertest, 'long_range', ['1-3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['long_as_string']);
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
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.ip).sort();
          expect(hits).to.eql(['1', '2', '3']);
        });
      });
    });
  });
};
