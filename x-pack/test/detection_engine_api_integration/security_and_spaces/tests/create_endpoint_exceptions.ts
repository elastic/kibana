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
} from '../../../lists_api_integration/utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
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
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('Rule exception operators for endpoints', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/rule_exceptions/endpoint_without_host_type'
      );
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/agent');
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/rule_exceptions/endpoint_without_host_type'
      );
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/agent');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await createListsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await deleteAllExceptions(es);
      await deleteListsIndex(supertest);
    });

    describe('no exceptions set', () => {
      it('should find all the "hosts" from a "agent" index when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host).sort();
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'windows' },
          },
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'linux' },
          },
        ]);
      });

      it('should find all the "hosts" from a "endpoint_without_host_type" index when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host).sort();
        expect(hits).to.eql([
          {
            os: { name: 'Linux' },
          },
          {
            os: { name: 'Windows' },
          },
          {
            os: { name: 'Macos' },
          },
          {
            os: { name: 'Linux' },
          },
        ]);
      });
    });

    describe('operating system types (os_types)', () => {
      describe('endpoints', () => {
        it('should filter 1 operating system types (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { name: 'Windows' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });

        it('should filter 2 operating system types as an "OR" (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux', 'macos'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { name: 'Windows' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });

        it('should filter multiple operating system types if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
              {
                osTypes: ['windows'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '2',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { name: 'Macos' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });

        it('should filter multiple operating system types (os_type) with multiple filter items for an endpoint', async () => {
          const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['macos', 'linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
              {
                osTypes: ['windows', 'linux', 'macos'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '2',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { name: 'Macos' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });
      });

      describe('agent', () => {
        it('should filter 1 operating system types (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'windows' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { type: 'linux' },
            },
          ]);
        });

        it('should filter 1 operating system type as an "OR" (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux', 'macos'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'windows' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { type: 'linux' },
            },
          ]);
        });

        it('should filter multiple operating system types if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
              {
                osTypes: ['windows'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '2',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'macos' },
            },
            {
              os: { type: 'linux' },
            },
          ]);
        });

        it('should filter multiple operating system types (os_type) with multiple filter items for an endpoint', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['macos', 'linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
              {
                osTypes: ['windows', 'linux', 'macos'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '2',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'macos' },
            },
            {
              os: { type: 'linux' },
            },
          ]);
        });
      });

      describe('agent and endpoint', () => {
        it('should filter 2 operating system types (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 6, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'windows' },
            },
            {
              os: { name: 'Windows' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });

        it('should filter 2 operating system types as an "OR" (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux', 'macos'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 6, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'windows' },
            },
            {
              os: { name: 'Windows' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });

        it('should filter multiple operating system types if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
              {
                osTypes: ['windows'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '2',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });

        it('should filter multiple operating system types (os_type) with multiple filter items for an endpoint', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            rule,
            [],
            [
              {
                osTypes: ['macos', 'linux'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '1',
                  },
                ],
              },
              {
                osTypes: ['windows', 'linux', 'macos'],
                entries: [
                  {
                    field: 'event.code',
                    operator: 'included',
                    type: 'match',
                    value: '2',
                  },
                ],
              },
            ]
          );
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 4, [id]);
          const signalsOpen = await getSignalsById(supertest, id);
          const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
          expect(hits).to.eql([
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
          ]);
        });
      });
    });

    describe('"is" operator', () => {
      it('should filter 1 value set as an endpoint exception and 1 value set as a normal rule exception ', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          rule,
          [
            [
              {
                field: 'host.os.type',
                operator: 'included',
                type: 'match',
                value: 'linux',
              },
            ],
          ],
          [
            {
              osTypes: undefined, // This "undefined" is not possible through the user interface but is possible in the REST API
              entries: [
                {
                  field: 'host.os.type',
                  operator: 'included',
                  type: 'match',
                  value: 'windows',
                },
              ],
            },
          ]
        );
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
        expect(hits).to.eql([
          {
            os: { type: 'macos' },
          },
        ]);
      });

      it('should filter 1 value set as an endpoint exception and 1 value set as a normal rule exception with os_type set', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          rule,
          [
            [
              {
                field: 'host.os.type',
                operator: 'included',
                type: 'match',
                value: 'linux',
              },
            ],
          ],
          [
            {
              osTypes: ['windows'],
              entries: [
                {
                  field: 'host.os.type',
                  operator: 'included',
                  type: 'match',
                  value: 'windows',
                },
              ],
            },
          ]
        );
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
        expect(hits).to.eql([
          {
            os: { type: 'macos' },
          },
        ]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single value if it is set as an exception and the os_type is set to only 1 value', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          rule,
          [],
          [
            {
              osTypes: ['windows'],
              entries: [
                {
                  field: 'event.code',
                  operator: 'included',
                  type: 'match_any',
                  value: ['1', '2'],
                },
              ],
            },
          ]
        );
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'linux' },
          },
        ]);
      });

      it('should filter 2 values if it is set as an exception and the os_type is set to 2 values', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          rule,
          [],
          [
            {
              osTypes: ['windows', 'linux'],
              entries: [
                {
                  field: 'event.code',
                  operator: 'included',
                  type: 'match_any',
                  value: ['1', '2'],
                },
              ],
            },
          ]
        );
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
        expect(hits).to.eql([
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'linux' },
          },
        ]);
      });

      it('should filter 2 values if it is set as an exception and the os_type is set to undefined', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          rule,
          [],
          [
            {
              osTypes: undefined, // This is only possible through the REST API
              entries: [
                {
                  field: 'event.code',
                  operator: 'included',
                  type: 'match_any',
                  value: ['1', '2'],
                },
              ],
            },
          ]
        );
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
        expect(hits).to.eql([
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'linux' },
          },
        ]);
      });

      it('should filter no values if they are set as an exception but the os_type is set to something not within the documents', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          rule,
          [],
          [
            {
              osTypes: ['macos'],
              entries: [
                {
                  field: 'event.code',
                  operator: 'included',
                  type: 'match_any',
                  value: ['1', '2'],
                },
              ],
            },
          ]
        );
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.host);
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'windows' },
          },
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'linux' },
          },
        ]);
      });
    });
  });
};
