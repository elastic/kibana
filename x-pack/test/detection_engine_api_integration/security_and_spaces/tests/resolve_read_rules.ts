/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createSignalsIndex, deleteAllAlerts, deleteSignalsIndex } from '../../utils';

const spaceId = '714-space';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('resolve_read_rules', () => {
    describe('reading rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/resolve_read_rules/7_14'
        );
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/resolve_read_rules/7_14'
        );
      });

      it('should create a "migrated" rule where querying for the new SO _id will resolve the new object and not return the outcome field when outcome === exactMatch', async () => {
        // link to the new URL with migrated SO id 74f3e6d7-b7bb-477d-ac28-92ee22728e6e
        const URL = `/s/${spaceId}${DETECTION_ENGINE_RULES_URL}?id=90e3ca0e-71f7-513a-b60a-ac678efd8887`;
        const readRulesAliasMatchRes = await supertest.get(URL).set('kbn-xsrf', 'true').send();
        expect(readRulesAliasMatchRes.body.outcome).to.eql('aliasMatch');
        expect(readRulesAliasMatchRes.body.alias_purpose).to.eql('savedObjectConversion');

        // now that we have the migrated alias_target_id, let's attempt an 'exactMatch' query
        // the result of which should have the outcome as undefined when querying the read rules api.
        const exactMatchURL = `/s/${spaceId}${DETECTION_ENGINE_RULES_URL}?id=${readRulesAliasMatchRes.body.alias_target_id}`;
        const readRulesExactMatchRes = await supertest
          .get(exactMatchURL)
          .set('kbn-xsrf', 'true')
          .send();
        expect(readRulesExactMatchRes.body.outcome).to.eql(undefined);
      });

      it('should create a rule and a "conflicting rule" where the SO _id matches the sourceId (see legacy-url-alias SO) of a migrated rule', async () => {
        // mimic a rule SO that was inserted accidentally
        // we have to insert this outside of esArchiver otherwise kibana will migrate this
        // and we won't have a conflict
        await es.index({
          id: 'alert:90e3ca0e-71f7-513a-b60a-ac678efd8887',
          index: '.kibana',
          refresh: true,
          body: {
            alert: {
              name: 'test 7.14',
              tags: [
                '__internal_rule_id:82747bb8-bae0-4b59-8119-7f65ac564e14',
                '__internal_immutable:false',
              ],
              alertTypeId: 'siem.queryRule',
              consumer: 'siem',
              params: {
                author: [],
                description: 'test',
                ruleId: '82747bb8-bae0-4b59-8119-7f65ac564e14',
                falsePositives: [],
                from: 'now-3615s',
                immutable: false,
                license: '',
                outputIndex: '',
                meta: {
                  from: '1h',
                  kibana_siem_app_url: 'http://0.0.0.0:5601/s/714-space/app/security',
                },
                maxSignals: 100,
                riskScore: 21,
                riskScoreMapping: [],
                severity: 'low',
                severityMapping: [],
                threat: [],
                to: 'now',
                references: [],
                version: 1,
                exceptionsList: [],
                type: 'query',
                language: 'kuery',
                index: [
                  'apm-*-transaction*',
                  'traces-apm*',
                  'auditbeat-*',
                  'endgame-*',
                  'filebeat-*',
                  'logs-*',
                  'packetbeat-*',
                  'winlogbeat-*',
                ],
                query: '*:*',
                filters: [],
              },
              schedule: {
                interval: '15s',
              },
              enabled: true,
              actions: [],
              throttle: null,
              notifyWhen: 'onActiveAlert',
              apiKeyOwner: 'elastic',
              apiKey:
                'HvwrIJ8NBshJav9vf3BSEEa2P7fXLTpmEKAx2bSyBF51N2cadFkltWLRRcFnj65RXsPzvRm3VKzAde4b1iGzsjxY/IVmfGGyiO0rk6vZVJVLeMSD+CAiflnwweypoKM8WgwXJnI0Oa/SWqKMtrDiFxCcZCwIuAhS0sjenaiEuedbAuStZv513zz/clpqRKFXBydJXKyjJUQLTA==',
              createdBy: 'elastic',
              updatedBy: 'elastic',
              createdAt: '2021-10-05T19:52:25.865Z',
              updatedAt: '2021-10-05T19:52:25.865Z',
              muteAll: false,
              mutedInstanceIds: [],
              executionStatus: {
                status: 'ok',
                lastExecutionDate: '2021-10-05T19:52:51.260Z',
                error: null,
              },
              meta: {
                versionApiKeyLastmodified: '7.14.2',
              },
              scheduledTaskId: 'c4005e90-2615-11ec-811e-db7211397897',
              legacyId: 'c364e1e0-2615-11ec-811e-db7211397897',
            },
            type: 'alert',
            references: [],
            namespaces: [spaceId],
            originId: 'c364e1e0-2615-11ec-811e-db7211397897',
            migrationVersion: {
              alert: '8.0.0',
            },
            coreMigrationVersion: '8.0.0',
            updated_at: '2021-10-05T19:52:56.014Z',
          },
        });

        // Now that we have a rule id and a legacy-url-alias with the same id, we should have a conflict
        const conflictURL = `/s/${spaceId}${DETECTION_ENGINE_RULES_URL}?id=90e3ca0e-71f7-513a-b60a-ac678efd8887`;
        const readRulesConflictRes = await supertest
          .get(conflictURL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(readRulesConflictRes.body.outcome).to.eql('conflict');
      });
    });
  });
};
