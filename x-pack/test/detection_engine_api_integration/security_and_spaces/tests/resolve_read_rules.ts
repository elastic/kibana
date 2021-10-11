/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
} from '../../utils';

const spaceId = '714-space';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const spaces = getService('spaces');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('resolve_read_rules', () => {
    describe('reading rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        // await spaces.create({ id: spaceId, name: spaceId });
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/resolve_read_rules/7_14'
        );
        // await esArchiver.load(
        //   'x-pack/test/functional/es_archives/security_solution/resolve_read_rules'
        // );

        // migrated rule SO
        // await es.index({
        //   id: 'alert:90e3ca0e-71f7-513a-b60a-ac678efd8887',
        //   index: '.kibana',
        //   refresh: true,
        //   body: {
        //     alert: {
        //       name: 'test 7.14',
        //       tags: [
        //         '__internal_rule_id:82747bb8-bae0-4b59-8119-7f65ac564e14',
        //         '__internal_immutable:false',
        //       ],
        //       alertTypeId: 'siem.signals',
        //       consumer: 'siem',
        //       params: {
        //         author: [],
        //         description: 'test',
        //         ruleId: '82747bb8-bae0-4b59-8119-7f65ac564e14',
        //         falsePositives: [],
        //         from: 'now-3615s',
        //         immutable: false,
        //         license: '',
        //         outputIndex: '.siem-signals-devin-hurley-714-space',
        //         meta: {
        //           from: '1h',
        //           kibana_siem_app_url: 'http://0.0.0.0:5601/s/714-space/app/security',
        //         },
        //         maxSignals: 100,
        //         riskScore: 21,
        //         riskScoreMapping: [],
        //         severity: 'low',
        //         severityMapping: [],
        //         threat: [],
        //         to: 'now',
        //         references: [],
        //         version: 1,
        //         exceptionsList: [],
        //         type: 'query',
        //         language: 'kuery',
        //         index: [
        //           'apm-*-transaction*',
        //           'traces-apm*',
        //           'auditbeat-*',
        //           'endgame-*',
        //           'filebeat-*',
        //           'logs-*',
        //           'packetbeat-*',
        //           'winlogbeat-*',
        //         ],
        //         query: '*:*',
        //         filters: [],
        //       },
        //       schedule: {
        //         interval: '15s',
        //       },
        //       enabled: true,
        //       actions: [],
        //       throttle: null,
        //       notifyWhen: 'onActiveAlert',
        //       apiKeyOwner: 'elastic',
        //       apiKey:
        //         'HvwrIJ8NBshJav9vf3BSEEa2P7fXLTpmEKAx2bSyBF51N2cadFkltWLRRcFnj65RXsPzvRm3VKzAde4b1iGzsjxY/IVmfGGyiO0rk6vZVJVLeMSD+CAiflnwweypoKM8WgwXJnI0Oa/SWqKMtrDiFxCcZCwIuAhS0sjenaiEuedbAuStZv513zz/clpqRKFXBydJXKyjJUQLTA==',
        //       createdBy: 'elastic',
        //       updatedBy: 'elastic',
        //       createdAt: '2021-10-05T19:52:25.865Z',
        //       updatedAt: '2021-10-05T19:52:25.865Z',
        //       muteAll: false,
        //       mutedInstanceIds: [],
        //       executionStatus: {
        //         status: 'ok',
        //         lastExecutionDate: '2021-10-05T19:52:51.260Z',
        //         error: null,
        //       },
        //       meta: {
        //         versionApiKeyLastmodified: '7.14.2',
        //       },
        //       scheduledTaskId: 'c4005e90-2615-11ec-811e-db7211397897',
        //       legacyId: 'c364e1e0-2615-11ec-811e-db7211397897',
        //     },
        //     type: 'alert',
        //     references: [],
        //     namespaces: ['714-space'],
        //     originId: 'c364e1e0-2615-11ec-811e-db7211397897',
        //     migrationVersion: {
        //       alert: '8.0.0',
        //     },
        //     coreMigrationVersion: '8.0.0',
        //     updated_at: '2021-10-05T19:52:56.014Z',
        //   },
        // });

        // legacy-url-alias SO that maps old SO id to new SO id
        // await es.index({
        //   index: '.kibana',
        //   id: 'legacy-url-alias:714-space:alert:c364e1e0-2615-11ec-811e-db7211397897',
        //   body: {
        //     'legacy-url-alias': {
        //       sourceId: 'c364e1e0-2615-11ec-811e-db7211397897',
        //       targetNamespace: '714-space',
        //       targetType: 'alert',
        //       targetId: '90e3ca0e-71f7-513a-b60a-ac678efd8887',
        //       resolveCounter: 10,
        //       lastResolved: '2021-10-05T22:00:22.544Z',
        //     },
        //     type: 'legacy-url-alias',
        //     references: [],
        //     migrationVersion: {},
        //     coreMigrationVersion: '8.0.0',
        //     updated_at: '2021-10-05T22:00:22.544Z',
        //   },
        // });
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        // await esArchiver.unload(
        //   'x-pack/test/functional/es_archives/security_solution/resolve_read_rules'
        // );
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/resolve_read_rules/7_14'
        );
        // await spaces.delete(spaceId);
      });

      it.only('should create a "migrated" rule where querying for the new SO _id will resolve the new object and not return the outcome field when outcome === exactMatch', async () => {
        // link to the new URL with migrated SO id 74f3e6d7-b7bb-477d-ac28-92ee22728e6e
        // const URL = `${DETECTION_ENGINE_RULES_URL}?id=90e3ca0e-71f7-513a-b60a-ac678efd8887`;
        const URL = `/s/714-space${DETECTION_ENGINE_RULES_URL}?id=90e3ca0e-71f7-513a-b60a-ac678efd8887`;
        // const URL = `${DETECTION_ENGINE_RULES_URL}?id=90e3ca0e-71f7-513a-b60a-ac678efd8887`;
        const readRulesAliasMatchRes = await supertest.get(URL).set('kbn-xsrf', 'true').send();
        console.error('READ RULES OUTPUT', JSON.stringify(readRulesAliasMatchRes, null, 2));
        expect(readRulesAliasMatchRes.body.outcome).to.eql('aliasMatch');

        console.error('GOT ALIAS MATCH');

        const exactMatchURL = `/s/714-space${DETECTION_ENGINE_RULES_URL}?id=${readRulesAliasMatchRes.body.alias_target_id}`;
        const readRulesExactMatchRes = await supertest
          .get(exactMatchURL)
          .set('kbn-xsrf', 'true')
          .send();
        expect(readRulesExactMatchRes.body.outcome).to.eql(undefined);

        console.error('GOT EXACT MATCH');

        // rule SO that was inserted accidentally

        // await esArchiver.load(
        //   'x-pack/test/functional/es_archives/security_solution/resolve_read_rules/8_0',
        //   { skipExisting: true }
        // );

        await es.index({
          // id: `alert:${readRulesAliasMatchRes.body.alias_target_id}`,
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
              alertTypeId: 'siem.signals',
              consumer: 'siem',
              params: {
                author: [],
                description: 'test',
                ruleId: '82747bb8-bae0-4b59-8119-7f65ac564e14',
                falsePositives: [],
                from: 'now-3615s',
                immutable: false,
                license: '',
                outputIndex: '.siem-signals-devin-hurley-714-space',
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
            namespaces: ['714-space'],
            originId: 'c364e1e0-2615-11ec-811e-db7211397897',
            migrationVersion: {
              alert: '8.0.0',
            },
            coreMigrationVersion: '8.0.0',
            updated_at: '2021-10-05T19:52:56.014Z',
          },
        });

        console.error(
          'WHAT IS IN ES',
          JSON.stringify(
            await es.search({
              index: '.kibana',
              body: {
                query: {
                  term: {
                    type: {
                      value: 'alert',
                    },
                  },
                },
              },
            }),
            null,
            2
          )
        );

        console.error(
          'WHAT IS IN ES',
          JSON.stringify(
            await es.search({
              index: '.kibana',
              body: {
                query: {
                  term: {
                    type: {
                      value: 'legacy-url-alias',
                    },
                  },
                },
              },
            }),
            null,
            2
          )
        );

        // try to do a deep link to the old URL
        const conflictURL = `/s/714-space${DETECTION_ENGINE_RULES_URL}?id=90e3ca0e-71f7-513a-b60a-ac678efd8887`;
        const readRulesConflictRes = await supertest
          .get(conflictURL)
          .set('kbn-xsrf', 'true')
          .send();
        // .expect(200);
        console.error('READ RULES CONFLICT RES', JSON.stringify(readRulesConflictRes, null, 2));
        expect(readRulesConflictRes.body.outcome).to.eql('conflict');

        // await esArchiver.unload(
        //   'x-pack/test/functional/es_archives/security_solution/resolve_read_rules/8_0'
        // );
      });

      // it('should create a "migrated" rule where querying for the old SO _id will resolve the new object with outcome: "aliasMatch', async () => {
      //   // try to do a deep link to the old URL
      //   const URL = `/s/714-space${DETECTION_ENGINE_RULES_URL}?id=c364e1e0-2615-11ec-811e-db7211397897`;
      //   const readRulesRes = await supertest.get(URL).set('kbn-xsrf', 'true').send();
      //   expect(readRulesRes.body.outcome).to.eql('aliasMatch');
      // });

      it('should create a rule and a "conflicting rule" where the SO _id matches the originId of a migrated rule', async () => {
        // rule SO that was inserted accidentally
        await es.index({
          id: '714-space:alert:90e3ca0e-71f7-513a-b60a-ac678efd8887',
          index: '.kibana',
          refresh: true,
          body: {
            alert: {
              name: 'test 7.14',
              tags: [
                '__internal_rule_id:82747bb8-bae0-4b59-8119-7f65ac564e14',
                '__internal_immutable:false',
              ],
              alertTypeId: 'siem.signals',
              consumer: 'siem',
              params: {
                author: [],
                description: 'test',
                ruleId: '82747bb8-bae0-4b59-8119-7f65ac564e14',
                falsePositives: [],
                from: 'now-3615s',
                immutable: false,
                license: '',
                outputIndex: '.siem-signals-devin-hurley-714-space',
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
            },
            type: 'alert',
            references: [],
            namespaces: ['714-space'],
            migrationVersion: {
              alert: '8.0.0',
            },
            coreMigrationVersion: '8.0.0',
            updated_at: '2021-10-05T19:52:56.014Z',
          },
        });

        // try to do a deep link to the old URL
        const URL = `/s/714-space${DETECTION_ENGINE_RULES_URL}?id=90e3ca0e-71f7-513a-b60a-ac678efd8887`;
        const readRulesRes = await supertest.get(URL).set('kbn-xsrf', 'true').send().expect(200);
        expect(readRulesRes.body.outcome).to.eql('conflict');
      });
    });
  });
};
