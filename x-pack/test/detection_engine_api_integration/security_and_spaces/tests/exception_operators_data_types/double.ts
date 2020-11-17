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

  describe('Rule exception operators for data type double', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await createListsIndex(supertest);
      await esArchiver.load('rule_exceptions/double');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(es);
      await deleteAllExceptions(es);
      await deleteListsIndex(supertest);
      await esArchiver.unload('rule_exceptions/double');
    });

    describe('"is" operator', () => {
      it('should find all the double from the data set when no exceptions are set on the rule', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRule(supertest, rule);
        await waitForSignalsToBePresent(supertest, 4);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
      });

      it('should filter 1 single double if it is set as an exception', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 3);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.1', '1.2', '1.3']);
      });

      it('should filter 2 double if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.2', '1.3']);
      });

      it('should filter 3 double if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.3']);
      });

      it('should filter 4 double if all are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match',
              value: '1.0',
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0']);
      });

      it('will return 0 results if we exclude two double', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single double if it is set as an exception', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0'],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 3);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.1', '1.2', '1.3']);
      });

      it('should filter 2 double if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1'],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.2', '1.3']);
      });

      it('should filter 3 double if both are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1', '1.2'],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.3']);
      });

      it('should filter 4 double if all are set as exceptions', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1', '1.2', '1.3'],
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'match_any',
              value: ['1.0', '1.3'],
            },
          ],
        ]);
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0', '1.3']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against double', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 0 results if matching against double', async () => {
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
          [
            {
              field: 'double',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    // TODO: Make this work
    describe.skip('"is in list" operator', () => {
      it('will return 3 results if we have a list that includes 1 double', async () => {
        await importFile(supertest, 'double', ['1.0'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        await waitForSignalsToBePresent(supertest, 3);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.1', '1.2', '1.3']);
      });

      it('will return 2 results if we have a list that includes 2 double', async () => {
        await importFile(supertest, 'double', ['1.0', '1.2'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.1', '1.3']);
      });

      it('will return 0 results if we have a list that includes all double', async () => {
        await importFile(supertest, 'double', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql([]);
      });
    });

    // TODO: Make this work
    describe.skip('"is not in list" operator', () => {
      it('will return 1 result if we have a list that excludes 1 double', async () => {
        await importFile(supertest, 'double', ['1.0'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        await waitForSignalsToBePresent(supertest, 1);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0']);
      });

      it('will return 2 results if we have a list that excludes 2 double', async () => {
        await importFile(supertest, 'double', ['1.0', '1.2'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        await waitForSignalsToBePresent(supertest, 2);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0', '1.2']);
      });

      it('will return 4 results if we have a list that excludes all double', async () => {
        await importFile(supertest, 'double', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
        const rule: QueryCreateSchema = {
          ...getSimpleRule(),
          index: ['double'],
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
        };
        await createRuleWithExceptionEntries(supertest, rule, [
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
        await waitForSignalsToBePresent(supertest, 4);
        const signalsOpen = await getAllSignals(supertest);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source.double).sort();
        expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
      });
    });
  });
};
