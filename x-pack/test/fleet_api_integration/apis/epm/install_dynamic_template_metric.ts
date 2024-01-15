/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('metric_type with dynamic_templates', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    after(async () => {
      await deletePackage('no_tsdb_to_tsdb', '0.2.0');
    });

    it('should install with metric_type added as time_series_metric', async function () {
      const templateName = 'metrics-no_tsdb_to_tsdb.test@package';

      await supertest
        .post(`/api/fleet/epm/packages/no_tsdb_to_tsdb/0.2.0`)
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
      const dynamicTemplates = template.template.mappings.dynamic_templates;
      const mappingName = 'test.metrics.*.counter';
      const counter = dynamicTemplates.find((tmpl: any) => Object.keys(tmpl)[0] === mappingName);

      expect(counter[mappingName].mapping.time_series_metric).to.eql('counter');
    });
  });
}
