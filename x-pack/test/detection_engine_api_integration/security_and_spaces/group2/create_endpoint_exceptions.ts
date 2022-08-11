/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import expect from '@kbn/expect';

import type SuperTest from 'supertest';
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

interface Host {
  os: {
    type?: string;
    name?: string;
  };
}

/**
 * Convenience method to get signals by host and sort them for better deterministic testing
 * since Elastic can return the hits back in any order we want to sort them on return for testing.
 * @param supertest Super test for testing.
 * @param id The signals id
 * @returns The array of hosts sorted
 */
export const getHostHits = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string
): Promise<Host[]> => {
  const signalsOpen = await getSignalsById(supertest, log, id);
  return signalsOpen.hits.hits
    .map<Host>((hit) => hit._source?.host as Host)
    .sort((a, b) => {
      let sortOrder = 0;
      if (a.os.name != null && b.os.name != null) {
        sortOrder += a.os.name.localeCompare(b.os.name);
      }
      if (a.os.type != null && b.os.type != null) {
        sortOrder += a.os.type.localeCompare(b.os.type);
      }
      if (a.os.type != null && b.os.name != null) {
        sortOrder += a.os.type.localeCompare(b.os.name);
      }
      if (a.os.name != null && b.os.type != null) {
        sortOrder += a.os.name.localeCompare(b.os.type);
      }
      return sortOrder;
    });
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

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
      await createSignalsIndex(supertest, log);
      await createListsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
    });

    describe('no exceptions set', () => {
      it('should find all the "hosts" from a "agent" index when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'windows' },
          },
        ]);
      });

      it('should find all the "hosts" from a "endpoint_without_host_type" index when no exceptions are set on the rule', async () => {
        const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).to.eql([
          {
            os: { name: 'Linux' },
          },
          {
            os: { name: 'Linux' },
          },
          {
            os: { name: 'Macos' },
          },
          {
            os: { name: 'Windows' },
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
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { name: 'Linux' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { name: 'Windows' },
            },
          ]);
        });

        it('should filter 2 operating system types as an "OR" (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { name: 'Linux' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { name: 'Windows' },
            },
          ]);
        });

        it('should filter multiple operating system types if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { name: 'Linux' },
            },
            {
              os: { name: 'Macos' },
            },
          ]);
        });

        it('should filter multiple operating system types (os_type) with multiple filter items for an endpoint', async () => {
          const rule = getRuleForSignalTesting(['endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { name: 'Linux' },
            },
            {
              os: { name: 'Macos' },
            },
          ]);
        });
      });

      describe('agent', () => {
        it('should filter 1 operating system types (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { type: 'windows' },
            },
          ]);
        });

        it('should filter 1 operating system type as an "OR" (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { type: 'windows' },
            },
          ]);
        });

        it('should filter multiple operating system types if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { type: 'macos' },
            },
          ]);
        });

        it('should filter multiple operating system types (os_type) with multiple filter items for an endpoint', async () => {
          const rule = getRuleForSignalTesting(['agent']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { type: 'macos' },
            },
          ]);
        });
      });

      describe('agent and endpoint', () => {
        it('should filter 2 operating system types (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 6, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { type: 'windows' },
            },
            {
              os: { name: 'Windows' },
            },
          ]);
        });

        it('should filter 2 operating system types as an "OR" (os_type) if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 6, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
            },
            {
              os: { type: 'windows' },
            },
            {
              os: { name: 'Windows' },
            },
          ]);
        });

        it('should filter multiple operating system types if it is set as part of an endpoint exception', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
            },
          ]);
        });

        it('should filter multiple operating system types (os_type) with multiple filter items for an endpoint', async () => {
          const rule = getRuleForSignalTesting(['agent', 'endpoint_without_host_type']);
          const { id } = await createRuleWithExceptionEntries(
            supertest,
            log,
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
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 4, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).to.eql([
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
            },
            {
              os: { type: 'macos' },
            },
            {
              os: { name: 'Macos' },
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
          log,
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const hits = await getHostHits(supertest, log, id);
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
          log,
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const hits = await getHostHits(supertest, log, id);
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
          log,
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 3, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'macos' },
          },
        ]);
      });

      it('should filter 2 values if it is set as an exception and the os_type is set to 2 values', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          log,
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'macos' },
          },
        ]);
      });

      it('should filter 2 values if it is set as an exception and the os_type is set to undefined', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          log,
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 2, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'macos' },
          },
        ]);
      });

      it('should filter no values if they are set as an exception but the os_type is set to something not within the documents', async () => {
        const rule = getRuleForSignalTesting(['agent']);
        const { id } = await createRuleWithExceptionEntries(
          supertest,
          log,
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).to.eql([
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'linux' },
          },
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'windows' },
          },
        ]);
      });
    });
  });
};
