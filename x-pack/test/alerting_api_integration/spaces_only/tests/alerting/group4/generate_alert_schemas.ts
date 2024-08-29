/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import execa from 'execa';
import { RuleType } from '@kbn/alerting-plugin/server';
import {
  alertFieldMap,
  ecsFieldMap,
  legacyAlertFieldMap,
  createSchemaFromFieldMap,
} from '@kbn/alerts-as-data-utils';
import { contextToSchemaName } from '@kbn/alerting-plugin/common';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function checkAlertSchemasTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // We are using this test to generate the schemas and types for alerts as data objects
  // because we need to access the alert definition that rule types provide on registration,
  // which is easiest to do after Kibana has started up and we can get the list of registered
  // rule types. If you add a new field to the alert field map or to the field map specific
  // to your rule type, this test will fail. To resolve, run this test locally
  //
  // node scripts/functional_tests_server.js --config x-pack/test/alerting_api_integration/spaces_only/tests/alerting/group4/config.ts
  // node scripts/functional_test_runner --config=x-pack/test/alerting_api_integration/spaces_only/tests/alerting/group4/config.ts --grep "check alert schemas"
  //
  // and commit the changed schema files in packages/kbn-alerts-as-data-utils/src/schemas/generated/

  describe('check alert schemas', function () {
    this.tags('skipFIPS');
    it('should not have discrepancies from the alert field map or the field map specific to a rule type', async () => {
      // Generate base alert schema
      createSchemaFromFieldMap({
        outputFile: `schemas/generated/alert_schema.ts`,
        fieldMap: alertFieldMap,
        schemaPrefix: 'Alert',
      });

      // Generate legacy alert schema
      createSchemaFromFieldMap({
        outputFile: `schemas/generated/legacy_alert_schema.ts`,
        fieldMap: legacyAlertFieldMap,
        schemaPrefix: 'LegacyAlert',
      });

      // Generate ECS schema
      createSchemaFromFieldMap({
        outputFile: `schemas/generated/ecs_schema.ts`,
        fieldMap: ecsFieldMap,
        schemaPrefix: 'Ecs',
      });

      const ruleTypes = await supertest
        .get('/api/alerting/rule_types')
        .expect(200)
        .then((response) => response.body);

      const processedContexts: string[] = [];
      ruleTypes
        .filter((ruleType: RuleType) => !ruleType.id.startsWith('test.') && ruleType.alerts)
        .forEach((ruleType: RuleType) => {
          const alertsDefinition = ruleType.alerts!;
          if (!processedContexts.includes(alertsDefinition.context)) {
            // Generate schema for this context
            const name = contextToSchemaName(alertsDefinition.context);

            createSchemaFromFieldMap({
              outputFile: `schemas/generated/${alertsDefinition.context.replaceAll(
                /[.\-]/g,
                '_'
              )}_schema.ts`,
              fieldMap: alertsDefinition.mappings.fieldMap,
              schemaPrefix: name,
              useAlert: true,
              useEcs: alertsDefinition.useEcs ?? false,
              useLegacyAlerts: alertsDefinition.useLegacyAlerts ?? false,
            });
            processedContexts.push(alertsDefinition.context);
          }
        });

      const { stdout } = await execa('git', [
        'ls-files',
        '--modified',
        '--others',
        '--exclude-standard',
      ]);

      expect(stdout).not.to.contain('packages/kbn-alerts-as-data-utils/src/schemas/generated');
    });
  });
}
