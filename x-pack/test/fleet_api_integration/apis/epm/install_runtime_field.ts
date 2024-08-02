/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-console */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');

  const testPackage = 'runtime_fields';
  const testPackageVersion = '0.0.1';

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('package with runtime fields', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    after(async () => {
      if (isDockerRegistryEnabledOrSkipped(providerContext)) {
        await deletePackage(testPackage, testPackageVersion);
      }
    });

    it('should install with runtime fields added in component template', async function () {
      const templateName = 'logs-runtime_fields.foo@package';

      await supertest
        .post(`/api/fleet/epm/packages/${testPackage}/${testPackageVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      const { body: resp } = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_component_template/${templateName}`,
        },
        { meta: true }
      );

      const template = resp.component_templates[0].component_template;
      const runtimeFieldDefinitions = template.template.mappings.runtime;
      console.log(JSON.stringify(runtimeFieldDefinitions, null, 2));

      expect(runtimeFieldDefinitions).to.eql({
        day_of_week_two: {
          script: {
            source:
              "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
          },
          type: 'keyword',
        },
        'responses.runtime_group_boolean': {
          type: 'boolean',
        },
        'runtime.date': {
          format: 'yyyy-MM-dd',
          script: {
            source: "emit(doc['@timestamp'].value.toEpochMilli())",
          },
          type: 'date',
        },
        'runtime.day': {
          script: {
            source:
              "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
          },
          type: 'keyword',
        },
        'runtime.epoch_milli': {
          type: 'long',
          script: {
            source: "emit(doc['@timestamp'].value.toEpochMilli())",
          },
        },
        runtime_boolean: {
          type: 'boolean',
        },
        to_be_long: {
          type: 'long',
        },
        lowercase: {
          type: 'keyword',
          script: {
            source: "emit(doc['uppercase'].value.toLowerCase())",
          },
        },
      });

      const dynamicTemplates = template.template.mappings.dynamic_templates;
      expect(dynamicTemplates).to.eql([
        {
          'labels.*': {
            path_match: 'labels.*',
            match_mapping_type: 'double',
            runtime: {
              type: 'long',
            },
          },
        },
      ]);
    });
  });
}
