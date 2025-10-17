/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import expect from 'expect';

import type SuperTest from 'supertest';
import { createRuleWithExceptionEntries } from '../../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  getAlertsById,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../../../config/services/detections_response';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
} from '../../../../../lists_and_exception_lists/utils';

import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

interface Host {
  os: {
    type?: string;
    name?: string;
  };
}

/**
 * Convenience method to get Alerts by host and sort them for better deterministic testing
 * since Elastic can return the hits back in any order we want to sort them on return for testing.
 * @param supertest Super test for testing.
 * @param id The Alerts id
 * @returns The array of hosts sorted
 */
export const getHostHits = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  id: string
): Promise<Host[]> => {
  const AlertsOpen = await getAlertsById(supertest, log, id);
  return AlertsOpen.hits.hits
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

const EXPECTED_AGENT_BASELINE_HITS = [
  { os: { type: 'linux' } },
  { os: { type: 'linux' } },
  { os: { type: 'macos' } },
  { os: { type: 'windows' } },
];

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @serverlessQA @ess @skipInServerlessMKI create_endpoint_exceptions', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/rule_exceptions/endpoint_without_host_type'
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/rule_exceptions/agent'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/rule_exceptions/endpoint_without_host_type'
      );
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/rule_exceptions/agent'
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

    describe('no exceptions set', () => {
      it('should find all the "hosts" from a "agent" index when no exceptions are set on the rule', async () => {
        const rule = getRuleForAlertTesting(['agent']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).toEqual([
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
        const rule = getRuleForAlertTesting(['endpoint_without_host_type']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).toEqual([
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
        it('should ignore endpoint exceptions and return baseline results', async () => {
          const rule = getRuleForAlertTesting(['endpoint_without_host_type']);
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
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 4, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).toEqual([
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

      describe('agent', () => {
        it('should ignore endpoint exceptions and return baseline results', async () => {
          const rule = getRuleForAlertTesting(['agent']);
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
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 4, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).toEqual(EXPECTED_AGENT_BASELINE_HITS);
        });
      });

      describe('agent and endpoint', () => {
        it('should ignore endpoint exceptions and return combined baseline results', async () => {
          const rule = getRuleForAlertTesting(['agent', 'endpoint_without_host_type']);
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
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 8, [id]);
          const hits = await getHostHits(supertest, log, id);
          expect(hits).toEqual([
            {
              os: { type: 'linux' },
            },
            {
              os: { type: 'linux' },
            },
            {
              os: { name: 'Linux' },
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
      });
    });

    describe('"is" operator', () => {
      it('should apply only normal rule exceptions, ignoring endpoint exceptions', async () => {
        const rule = getRuleForAlertTesting(['agent']);
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
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).toEqual([
          {
            os: { type: 'macos' },
          },
          {
            os: { type: 'windows' },
          },
        ]);
      });
    });

    describe('"is one of" operator', () => {
      it('should ignore endpoint exceptions and return baseline results', async () => {
        const rule = getRuleForAlertTesting(['agent']);
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
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).toEqual(EXPECTED_AGENT_BASELINE_HITS);
      });

      it('should return baseline results even when os_type is set to something not within the documents', async () => {
        const rule = getRuleForAlertTesting(['agent']);
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
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const hits = await getHostHits(supertest, log, id);
        expect(hits).toEqual(EXPECTED_AGENT_BASELINE_HITS);
      });
    });
  });
};
