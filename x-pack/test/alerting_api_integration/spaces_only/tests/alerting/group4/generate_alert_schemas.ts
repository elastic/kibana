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

  describe('check alert schemas', () => {
    it('should', async () => {
      // Generate base alert schema
      createSchemaFromFieldMap(`schemas/generated/alert_schema.ts`, alertFieldMap, 'Alert');

      // Generate legacy alert schema
      createSchemaFromFieldMap(
        `schemas/generated/legacy_alert_schema.ts`,
        legacyAlertFieldMap,
        'LegacyAlert'
      );

      // Generate ECS schema
      createSchemaFromFieldMap(`schemas/generated/ecs_schema.ts`, ecsFieldMap, 'Ecs');

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

            createSchemaFromFieldMap(
              `schemas/generated/${alertsDefinition.context.replaceAll('.', '_')}_schema.ts`,
              alertsDefinition.mappings.fieldMap,
              name,
              true,
              alertsDefinition.useEcs ?? false,
              alertsDefinition.useLegacyAlerts ?? false
            );
            processedContexts.push(alertsDefinition.context);
          }
        });

      const { stdout } = await execa('git', ['ls-files', '--modified']);
      expect(stdout).not.to.contain('packages/kbn-alerts-as-data-utils/src/schemas/generated');
    });
  });
}
