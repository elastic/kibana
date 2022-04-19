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
  importTextFile,
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

  describe('Rule exception operators for data type text', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/text');
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/text_no_spaces');
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
      await createSignalsIndex(supertest, log);
      await createListsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/text');
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/text_no_spaces');
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
    });

    describe('', () => {
      it('"is" operator', async () => {
        const runner = createParallelTestRunner();

        runner.test(
          'should find all the text from the data set when no exceptions are set on the rule',
          async () => {
            const rule = getRuleForSignalTesting(['text']);
            const { id } = await createRule(supertest, log, rule);
            await waitForRuleSuccessOrStatus(supertest, log, id);
            await waitForSignalsToBePresent(supertest, log, 4, [id]);
            const signalsOpen = await getSignalsById(supertest, log, id);
            const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
            expect(hits).to.eql(['word four', 'word one', 'word three', 'word two']);
          }
        );

        runner.test('should filter 1 single text if it is set as an exception', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match',
                value: 'word one',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word three', 'word two']);
        });

        runner.test('should filter 2 text if both are set as exceptions', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
                value: 'word two',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word three']);
        });

        runner.test('should filter 3 text if all 3 are set as exceptions', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
                value: 'word two',
              },
            ],
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match',
                value: 'word three',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four']);
        });

        runner.test('should filter 4 text if all are set as exceptions', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
                value: 'word two',
              },
            ],
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match',
                value: 'word three',
              },
            ],
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match',
                value: 'word four',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        runner.test('should filter 1 single text using a single word', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match',
                value: 'one',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word three', 'word two']);
        });

        runner.test('should filter all words using a common piece of text', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match',
                value: 'word',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        runner.test('should filter 1 single text with punctuation added', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match',
                value: 'one.',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word three', 'word two']);
        });

        await runner.run();
      });

      it('"is not" operator', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 0 results if it cannot find what it is excluding', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'match',
                value: '500.0', // this value is not in the data set
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        runner.test('will return just 1 result we excluded', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'match',
                value: 'word one',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word one']);
        });

        runner.test('will return 0 results if we exclude two text', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
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
                value: 'word two',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        runner.test('should filter 1 single text using a single word', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'match',
                value: 'one',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word one']);
        });

        runner.test('should filter all words using a common piece of text', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'match',
                value: 'word',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word one', 'word three', 'word two']);
        });

        runner.test('should filter 1 single text with punctuation added', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'match',
                value: 'one.',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word one']);
        });

        await runner.run();
      });

      it('"is one of" operator', async () => {
        const runner = createParallelTestRunner();

        runner.test('should filter 1 single text if it is set as an exception', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match_any',
                value: ['word one'],
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word three', 'word two']);
        });

        runner.test('should filter 2 text if both are set as exceptions', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match_any',
                value: ['word one', 'word two'],
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word three']);
        });

        runner.test('should filter 3 text if all 3 are set as exceptions', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match_any',
                value: ['word one', 'word three', 'word two'],
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four']);
        });

        runner.test('should filter 4 text if all are set as exceptions', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'match_any',
                value: ['word four', 'word one', 'word three', 'word two'],
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        await runner.run();
      });

      it('"is not one of" operator', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 0 results if it cannot find what it is excluding', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'match_any',
                value: ['500', '600'], // both these values are not in the data set
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        runner.test('will return just the result we excluded', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'match_any',
                value: ['word one', 'word four'],
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word one']);
        });

        await runner.run();
      });

      it('"exists" operator', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 0 results if matching against text', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'included',
                type: 'exists',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        await runner.run();
      });

      it('"does not exist" operator', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 4 results if matching against text', async () => {
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                operator: 'excluded',
                type: 'exists',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word one', 'word three', 'word two']);
        });

        await runner.run();
      });
    });

    describe('"is in list" operator', () => {
      it('working against text values without spaces', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 3 results if we have a list that includes 1 text', async () => {
          const filename = await importFile(supertest, log, 'text', ['one']);
          const rule = getRuleForSignalTesting(['text_no_spaces']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['four', 'three', 'two']);
        });

        runner.test('will return 2 results if we have a list that includes 2 text', async () => {
          const filename = await importFile(supertest, log, 'text', ['one', 'three']);
          const rule = getRuleForSignalTesting(['text_no_spaces']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['four', 'two']);
        });

        runner.test('will return 0 results if we have a list that includes all text', async () => {
          const filename = await importTextFile(supertest, log, 'text', [
            'one',
            'two',
            'three',
            'four',
          ]);
          const rule = getRuleForSignalTesting(['text_no_spaces']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        await runner.run();
      });

      it('working against text values with spaces', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 3 results if we have a list that includes 1 text', async () => {
          const filename = await importTextFile(supertest, log, 'text', ['word one']);
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word three', 'word two']);
        });

        runner.test(
          'will return 3 results if we have a list that includes 1 text with additional wording',
          async () => {
            const filename = await importTextFile(supertest, log, 'text', [
              'word one additional wording',
            ]);
            const rule = getRuleForSignalTesting(['text']);
            const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'text',
                  list: {
                    id: filename,
                    type: 'text',
                  },
                  operator: 'included',
                  type: 'list',
                },
              ],
            ]);
            await waitForRuleSuccessOrStatus(supertest, log, id);
            await waitForSignalsToBePresent(supertest, log, 3, [id]);
            const signalsOpen = await getSignalsById(supertest, log, id);
            const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
            expect(hits).to.eql(['word four', 'word three', 'word two']);
          }
        );

        runner.test('will return 2 results if we have a list that includes 2 text', async () => {
          const filename = await importFile(supertest, log, 'text', ['word one', 'word three']);
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word two']);
        });

        runner.test('will return 0 results if we have a list that includes all text', async () => {
          const filename = await importTextFile(supertest, log, 'text', [
            'word one',
            'word two',
            'word three',
            'word four',
          ]);
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql([]);
        });

        await runner.run();
      });
    });

    describe('"is not in list" operator', () => {
      it('working against text values without spaces', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 1 result if we have a list that excludes 1 text', async () => {
          const filename = await importTextFile(supertest, log, 'text', ['one']);
          const rule = getRuleForSignalTesting(['text_no_spaces']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['one']);
        });

        runner.test('will return 2 results if we have a list that excludes 2 text', async () => {
          const filename = await importTextFile(supertest, log, 'text', ['one', 'three']);
          const rule = getRuleForSignalTesting(['text_no_spaces']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['one', 'three']);
        });

        runner.test('will return 4 results if we have a list that excludes all text', async () => {
          const filename = await importTextFile(supertest, log, 'text', [
            'one',
            'two',
            'three',
            'four',
          ]);
          const rule = getRuleForSignalTesting(['text_no_spaces']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['four', 'one', 'three', 'two']);
        });

        await runner.run();
      });

      it('working against text values with spaces', async () => {
        const runner = createParallelTestRunner();

        runner.test('will return 1 result if we have a list that excludes 1 text', async () => {
          const filename = await importTextFile(supertest, log, 'text', ['word one']);
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word one']);
        });

        runner.test(
          'will return 1 result if we have a list that excludes 1 text with additional wording',
          async () => {
            const filename = await importTextFile(supertest, log, 'text', [
              'word one additional wording',
            ]);
            const rule = getRuleForSignalTesting(['text']);
            const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'text',
                  list: {
                    id: filename,
                    type: 'text',
                  },
                  operator: 'excluded',
                  type: 'list',
                },
              ],
            ]);
            await waitForRuleSuccessOrStatus(supertest, log, id);
            await waitForSignalsToBePresent(supertest, log, 1, [id]);
            const signalsOpen = await getSignalsById(supertest, log, id);
            const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
            expect(hits).to.eql(['word one']);
          }
        );

        runner.test('will return 2 results if we have a list that excludes 2 text', async () => {
          const filename = await importTextFile(supertest, log, 'text', ['word one', 'word three']);
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word one', 'word three']);
        });

        runner.test('will return 4 results if we have a list that excludes all text', async () => {
          const filename = await importTextFile(supertest, log, 'text', [
            'word one',
            'word two',
            'word three',
            'word four',
          ]);
          const rule = getRuleForSignalTesting(['text']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'text',
                list: {
                  id: filename,
                  type: 'text',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, log, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.text).sort();
          expect(hits).to.eql(['word four', 'word one', 'word three', 'word two']);
        });

        await runner.run();
      });
    });
  });
};
