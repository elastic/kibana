/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllRules,
  deleteSignalsIndex,
  getRule,
  getRuleForSignalTesting,
  installMockPrebuiltRules,
  getSecurityTelemetryStats,
  createExceptionList,
  createExceptionListItem,
  removeTimeFieldsFromTelemetryStats,
} from '../../../../utils';
import { deleteAllExceptions } from '../../../../../lists_api_integration/utils';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../utils/prebuilt_rules/create_prebuilt_rule_saved_objects';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');

  describe('Detection rule task telemetry', async () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
    });

    describe('custom rules should never show any detection_rules telemetry data for each list type', () => {
      it('should NOT give telemetry/stats for an exception list of type "detection"', async () => {
        const rule = getRuleForSignalTesting(['telemetry'], 'rule-1', false);

        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'detection',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // Create the rule with the exception added to it
        await createRule(supertest, log, {
          ...rule,
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        });

        // Get the stats and ensure they're empty
        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          expect(stats.detection_rules).to.eql([
            [
              {
                name: 'Security Solution Detection Rule Lists Telemetry',
                passed: true,
              },
            ],
          ]);
        });
      });

      it('should NOT give telemetry/stats for an exception list of type "endpoint"', async () => {
        const rule = getRuleForSignalTesting(['telemetry'], 'rule-1', false);

        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // Create the rule with the exception added to it
        await createRule(supertest, log, {
          ...rule,
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        });

        // Get the stats and ensure they're empty
        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          expect(stats.detection_rules).to.eql([
            [
              {
                name: 'Security Solution Detection Rule Lists Telemetry',
                passed: true,
              },
            ],
          ]);
        });
      });

      it('should NOT give telemetry/stats for an exception list of type "endpoint_trusted_apps"', async () => {
        const rule = getRuleForSignalTesting(['telemetry'], 'rule-1', false);

        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint_trusted_apps',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // Create the rule with the exception added to it
        await createRule(supertest, log, {
          ...rule,
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        });

        // Get the stats and ensure they're empty
        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          expect(stats.detection_rules).to.eql([
            [
              {
                name: 'Security Solution Detection Rule Lists Telemetry',
                passed: true,
              },
            ],
          ]);
        });
      });

      it('should NOT give telemetry/stats for an exception list of type "endpoint_events"', async () => {
        const rule = getRuleForSignalTesting(['telemetry'], 'rule-1', false);

        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint_events',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // Create the rule with the exception added to it
        await createRule(supertest, log, {
          ...rule,
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        });

        // Get the stats and ensure they're empty
        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          expect(stats.detection_rules).to.eql([
            [
              {
                name: 'Security Solution Detection Rule Lists Telemetry',
                passed: true,
              },
            ],
          ]);
        });
      });

      it('should NOT give telemetry/stats for an exception list of type "endpoint_host_isolation_exceptions"', async () => {
        const rule = getRuleForSignalTesting(['telemetry'], 'rule-1', false);

        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint_host_isolation_exceptions',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // Create the rule with the exception added to it
        await createRule(supertest, log, {
          ...rule,
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        });

        // Get the stats and ensure they're empty
        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          expect(stats.detection_rules).to.eql([
            [
              {
                name: 'Security Solution Detection Rule Lists Telemetry',
                passed: true,
              },
            ],
          ]);
        });
      });
    });

    describe('pre-built/immutable/elastic rules should show detection_rules telemetry data for each list type', () => {
      beforeEach(async () => {
        // install prepackaged rules to get immutable rules for testing
        await installMockPrebuiltRules(supertest, es);
      });

      it('should return mutating types such as "id", "@timestamp", etc... for list of type "detection"', async () => {
        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'detection',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add the exception list to the pre-built/immutable/elastic rule using "PATCH" endpoint
        const { exceptions_list } = await getRule(supertest, log, ELASTIC_SECURITY_RULE_ID);
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          expect(stats.detection_rules).length(2);
          const detectionRule = stats.detection_rules[0][0];
          expect(detectionRule['@timestamp']).to.be.a('string');
          expect(detectionRule.cluster_uuid).to.be.a('string');
          expect(detectionRule.cluster_name).to.be.a('string');
          expect(detectionRule.license_id).to.be.a('string');
          expect(detectionRule.detection_rule.created_at).to.be.a('string');
          expect(detectionRule.detection_rule.id).to.be.a('string');
        });
      });

      it('should give telemetry/stats for an exception list of type "detection"', async () => {
        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'detection',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add the exception list to the pre-built/immutable/elastic rule
        const immutableRule = await getRule(supertest, log, ELASTIC_SECURITY_RULE_ID);
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          const detectionRules = stats.detection_rules
            .flat()
            .map((obj: any) => (obj.passed != null ? obj : obj.detection_rule));

          expect(detectionRules).to.eql([
            {
              created_at: detectionRules[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something',
                },
              ],
              id: detectionRules[0].id,
              name: 'endpoint description',
              os_types: [],
              rule_version: detectionRules[0].rule_version,
            },
            {
              name: 'Security Solution Detection Rule Lists Telemetry',
              passed: true,
            },
          ]);
        });
      });

      it('should give telemetry/stats for an exception list of type "endpoint"', async () => {
        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add the exception list to the pre-built/immutable/elastic rule
        const immutableRule = await getRule(supertest, log, ELASTIC_SECURITY_RULE_ID);
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          const detectionRules = stats.detection_rules
            .flat()
            .map((obj: any) => (obj.passed != null ? obj : obj.detection_rule));

          expect(detectionRules).to.eql([
            {
              created_at: detectionRules[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something',
                },
              ],
              id: detectionRules[0].id,
              name: 'endpoint description',
              os_types: [],
              rule_version: detectionRules[0].rule_version,
            },
            {
              name: 'Security Solution Detection Rule Lists Telemetry',
              passed: true,
            },
          ]);
        });
      });

      it('should give telemetry/stats for an exception list of type "endpoint_trusted_apps"', async () => {
        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint_trusted_apps',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add the exception list to the pre-built/immutable/elastic rule
        const immutableRule = await getRule(supertest, log, ELASTIC_SECURITY_RULE_ID);
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          const detectionRules = stats.detection_rules
            .flat()
            .map((obj: any) => (obj.passed != null ? obj : obj.detection_rule));

          expect(detectionRules).to.eql([
            {
              created_at: detectionRules[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something',
                },
              ],
              id: detectionRules[0].id,
              name: 'endpoint description',
              os_types: [],
              rule_version: detectionRules[0].rule_version,
            },
            {
              name: 'Security Solution Detection Rule Lists Telemetry',
              passed: true,
            },
          ]);
        });
      });

      it('should give telemetry/stats for an exception list of type "endpoint_events"', async () => {
        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint_events',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add the exception list to the pre-built/immutable/elastic rule
        const immutableRule = await getRule(supertest, log, ELASTIC_SECURITY_RULE_ID);
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          const detectionRules = stats.detection_rules
            .flat()
            .map((obj: any) => (obj.passed != null ? obj : obj.detection_rule));

          expect(detectionRules).to.eql([
            {
              created_at: detectionRules[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something',
                },
              ],
              id: detectionRules[0].id,
              name: 'endpoint description',
              os_types: [],
              rule_version: detectionRules[0].rule_version,
            },
            {
              name: 'Security Solution Detection Rule Lists Telemetry',
              passed: true,
            },
          ]);
        });
      });

      it('should give telemetry/stats for an exception list of type "endpoint_host_isolation_exceptions"', async () => {
        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'endpoint_host_isolation_exceptions',
        });

        // add 1 item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add the exception list to the pre-built/immutable/elastic rule
        const immutableRule = await getRule(supertest, log, ELASTIC_SECURITY_RULE_ID);
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          const detectionRules = stats.detection_rules
            .flat()
            .map((obj: any) => (obj.passed != null ? obj : obj.detection_rule));

          expect(detectionRules).to.eql([
            {
              created_at: detectionRules[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something',
                },
              ],
              id: detectionRules[0].id,
              name: 'endpoint description',
              os_types: [],
              rule_version: detectionRules[0].rule_version,
            },
            {
              name: 'Security Solution Detection Rule Lists Telemetry',
              passed: true,
            },
          ]);
        });
      });
    });

    describe('pre-built/immutable/elastic rules should show detection_rules telemetry data for multiple list items and types', () => {
      beforeEach(async () => {
        // install prepackaged rules to get immutable rules for testing
        await installMockPrebuiltRules(supertest, es);
      });

      it('should give telemetry/stats for 2 exception lists to the type of "detection"', async () => {
        // create an exception list container of type "detection"
        const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'detection',
        });

        // add 1st item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description 1',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something 1',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add 2nd item to the exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description 2',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something 2',
            },
          ],
          list_id: '123',
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
        });

        // add the exception list to the pre-built/immutable/elastic rule
        const immutableRule = await getRule(supertest, log, ELASTIC_SECURITY_RULE_ID);
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          removeTimeFieldsFromTelemetryStats(stats);
          const detectionRules = stats.detection_rules
            .flat()
            .map((obj: any) => (obj.passed != null ? obj : obj.detection_rule))
            .sort((obj1: { entries: { name: number } }, obj2: { entries: { name: number } }) => {
              return obj1?.entries?.name - obj2?.entries?.name;
            });

          expect(detectionRules).to.eql([
            {
              created_at: detectionRules[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something 2',
                },
              ],
              id: detectionRules[0].id,
              name: 'endpoint description 2',
              os_types: [],
              rule_version: detectionRules[0].rule_version,
            },
            {
              created_at: detectionRules[1].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something 1',
                },
              ],
              id: detectionRules[1].id,
              name: 'endpoint description 1',
              os_types: [],
              rule_version: detectionRules[1].rule_version,
            },
            {
              name: 'Security Solution Detection Rule Lists Telemetry',
              passed: true,
            },
          ]);
        });
      });
    });
  });
};
