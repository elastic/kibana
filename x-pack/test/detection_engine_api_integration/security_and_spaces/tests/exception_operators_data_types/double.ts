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

  describe('Rule exception operators for data type double', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await createListsIndex(supertest);
      await esArchiver.load('rule_exceptions/double');
      await esArchiver.load('rule_exceptions/double_as_string');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await deleteAllExceptions(es);
      await deleteListsIndex(supertest);
      await esArchiver.unload('rule_exceptions/double');
      await esArchiver.unload('rule_exceptions/double_as_string');
    });

    describe('"is" operator', () => {
      it('should find all the double from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
      });

      it('should filter 1 single double if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.1', '1.2', '1.3']);
      });

      it('should filter 2 double if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.1',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.2', '1.3']);
      });

      it('should filter 3 double if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.1',
            },
          ],
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.2',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.3']);
      });

      it('should filter 4 double if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.1',
            },
          ],
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.2',
            },
          ],
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.3',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match',
              value: '1.0',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0']);
      });

      it('will return 0 results if we exclude two double', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match',
              value: '1.1',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single double if it is set as an exception', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.1', '1.2', '1.3']);
      });

      it('should filter 2 double if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.2', '1.3']);
      });

      it('should filter 3 double if both are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1', '1.2'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.3']);
      });

      it('should filter 4 double if all are set as exceptions', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1', '1.2', '1.3'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match_any',
              value: ['1.0', '1.3'],
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0', '1.3']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against double', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 4 results if matching against double', async () => {
        const rule = getRuleForSignalTesting(['double']);
        const { id } = await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
      });
    });

    describe('"is in list" operator', () => {
      // TODO: Enable this test once the bugs are fixed, we cannot use a list of strings that represent
      // a double against an index that has the doubles stored as real doubles.
      describe.skip('working against double values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 double', async () => {
          await importFile(supertest, 'double', ['1.0'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.1', '1.2', '1.3']);
        });

        it('will return 2 results if we have a list that includes 2 double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.1', '1.3']);
        });

        it('will return 0 results if we have a list that includes all double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql([]);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 double', async () => {
          await importFile(supertest, 'double', ['1.0'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.1', '1.2', '1.3']);
        });

        it('will return 2 results if we have a list that includes 2 double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.1', '1.3']);
        });

        it('will return 0 results if we have a list that includes all double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql([]);
        });

        // TODO: Fix this bug and then unskip this test
        it.skip('will return 1 result if we have a list which contains the double range of 1.0-1.2', async () => {
          await importFile(supertest, 'double_range', ['1.0-1.2'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
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
          expect(hits).to.eql(['1.3']);
        });
      });
    });

    describe('"is not in list" operator', () => {
      // TODO: Enable this test once the bugs are fixed, we cannot use a list of strings that represent
      // a double against an index that has the doubles stored as real doubles.
      describe.skip('working against double values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 double', async () => {
          await importFile(supertest, 'double', ['1.0'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.0']);
        });

        it('will return 2 results if we have a list that excludes 2 double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.0', '1.2']);
        });

        it('will return 4 results if we have a list that excludes all double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 double', async () => {
          await importFile(supertest, 'double', ['1.0'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.0']);
        });

        it('will return 2 results if we have a list that excludes 2 double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.0', '1.2']);
        });

        it('will return 4 results if we have a list that excludes all double', async () => {
          await importFile(supertest, 'double', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, rule, [
            [
              {
                field: 'double',
                list: {
                  id: 'list_items.txt',
                  type: 'double',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
          expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
        });

        // TODO: Fix this bug and then unskip this test
        it.skip('will return 3 results if we have a list which contains the double range of 1.0-1.2', async () => {
          await importFile(supertest, 'double_range', ['1.0-1.2'], 'list_items.txt');
          const rule = getRuleForSignalTesting(['double_as_string']);
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
          expect(hits).to.eql(['1.0', '1.1', '1.2']);
        });
      });
    });
  });
};
