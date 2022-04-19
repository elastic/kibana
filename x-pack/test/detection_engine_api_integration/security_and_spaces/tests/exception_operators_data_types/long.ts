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
  createParallelTestRunner,
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

  describe('Rule exception operators for data type long', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/long');
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/long_as_string');
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
      await createSignalsIndex(supertest, log);
      await createListsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/long');
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/long_as_string');
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
    });

    it('"is" operator', async () => {
      const runner = createParallelTestRunner();

      runner.test(
        'should find all the long from the data set when no exceptions are set on the rule',
        async () => {
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['1', '2', '3', '4']);
        }
      );

      runner.test('should filter 1 single long if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['2', '3', '4']);
      });

      runner.test('should filter 2 long if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['3', '4']);
      });

      runner.test('should filter 3 long if all 3 are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['4']);
      });

      runner.test('should filter 4 long if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql([]);
      });

      await runner.run();
    });

    it('"is not" operator', async () => {
      const runner = createParallelTestRunner();

      runner.test('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql([]);
      });

      runner.test('will return just 1 result we excluded', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match',
              value: '1',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['1']);
      });

      runner.test('will return 0 results if we exclude two long', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql([]);
      });

      await runner.run();
    });

    it('"is one of" operator', async () => {
      const runner = createParallelTestRunner();

      runner.test('should filter 1 single long if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['2', '3', '4']);
      });

      runner.test('should filter 2 long if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['3', '4']);
      });

      runner.test('should filter 3 long if all 3 are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2', '3'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['4']);
      });

      runner.test('should filter 4 long if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'match_any',
              value: ['1', '2', '3', '4'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql([]);
      });

      await runner.run();
    });

    it('"is not one of" operator', async () => {
      const runner = createParallelTestRunner();

      runner.test('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql([]);
      });

      runner.test('will return just the result we excluded', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'match_any',
              value: ['1', '4'],
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['1', '4']);
      });

      await runner.run();
    });

    it('"exists" operator', async () => {
      const runner = createParallelTestRunner();

      runner.test('will return 0 results if matching against long', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql([]);
      });

      await runner.run();
    });

    it('"does not exist" operator', async () => {
      const runner = createParallelTestRunner();

      runner.test('will return 4 results if matching against long', async () => {
        const rule = getRuleForSignalTesting(['long']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'long',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
        expect(hits).to.eql(['1', '2', '3', '4']);
      });

      await runner.run();
    });

    describe('"is in list" operator', async () => {
      it('working against long values in the data set', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 3 results if we have a list that includes 1 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1']);
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['2', '3', '4']);
        });

        runner.test('will return 2 results if we have a list that includes 2 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '3']);
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['2', '4']);
        });

        runner.test('will return 0 results if we have a list that includes all long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '2', '3', '4']);
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql([]);
        });

        await runner.run();
      });

      it('working against string values in the data set', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 3 results if we have a list that includes 1 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1']);
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['2', '3', '4']);
        });

        runner.test('will return 2 results if we have a list that includes 2 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '3']);
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['2', '4']);
        });

        runner.test('will return 0 results if we have a list that includes all long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '2', '3', '4']);
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql([]);
        });

        runner.test(
          'will return 1 result if we have a list which contains the long range of 1-3',
          async () => {
            const filename = await importFile(supertest, log, 'long_range', ['1-3'], '', [
              '1',
              '2',
              '3',
            ]);
            const rule = getRuleForSignalTesting(['long_as_string']);
            const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'long',
                  list: {
                    id: filename,
                    type: 'long_range',
                  },
                  operator: 'included',
                  type: 'list',
                },
              ],
            ]);
            await waitForRuleSuccessOrStatus(supertest, log, id);
            await waitForSignalsToBePresent(supertest, log, 1, [id]);
            const signalsOpen = await getSignalsById(supertest, log, id);
            const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
            expect(hits).to.eql(['4']);
          }
        );

        await runner.run();
      });
    });

    describe('"is not in list" operator', () => {
      it('working against long values in the data set', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 1 result if we have a list that excludes 1 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1']);
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['1']);
        });

        runner.test('will return 2 results if we have a list that excludes 2 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '3']);
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['1', '3']);
        });

        runner.test('will return 4 results if we have a list that excludes all long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '2', '3', '4']);
          const rule = getRuleForSignalTesting(['long']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['1', '2', '3', '4']);
        });

        await runner.run();
      });

      it('working against string values in the data set', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 1 result if we have a list that excludes 1 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1']);
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['1']);
        });

        runner.test('will return 2 results if we have a list that excludes 2 long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '3']);
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['1', '3']);
        });

        runner.test('will return 4 results if we have a list that excludes all long', async () => {
          const filename = await importFile(supertest, log, 'long', ['1', '2', '3', '4']);
          const rule = getRuleForSignalTesting(['long_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'long',
                list: {
                  id: filename,
                  type: 'long',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
          expect(hits).to.eql(['1', '2', '3', '4']);
        });

        runner.test(
          'will return 3 results if we have a list which contains the long range of 1-3',
          async () => {
            const filename = await importFile(supertest, log, 'long_range', ['1-3'], '', [
              '1',
              '2',
              '3',
            ]);
            const rule = getRuleForSignalTesting(['long_as_string']);
            const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'long',
                  list: {
                    id: filename,
                    type: 'long_range',
                  },
                  operator: 'excluded',
                  type: 'list',
                },
              ],
            ]);
            await waitForRuleSuccessOrStatus(supertest, log, id);
            await waitForSignalsToBePresent(supertest, log, 3, [id]);
            const signalsOpen = await getSignalsById(supertest, log, id);
            const hits = signalsOpen.hits.hits.map((hit) => hit._source?.long).sort();
            expect(hits).to.eql(['1', '2', '3']);
          }
        );

        await runner.run();
      });
    });
  });
};
