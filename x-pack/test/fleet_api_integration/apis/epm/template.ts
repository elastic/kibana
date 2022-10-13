/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { appContextService } from '@kbn/fleet-plugin/server/services';
import { getTemplate } from '@kbn/fleet-plugin/server/services/epm/elasticsearch/template/template';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const templateName = 'bar';
  const templateIndexPattern = 'bar-*';
  const es = getService('es');

  // This test was inspired by https://github.com/elastic/kibana/blob/main/x-pack/test/api_integration/apis/monitoring/common/mappings_exist.js
  describe('EPM - template', async () => {
    beforeEach(async () => {
      appContextService.start({
        // @ts-ignore
        elasticsearch: { client: {} },
        // @ts-ignore
        logger: {
          warn: () => {},
        },
      });
    });

    it('can be loaded', async () => {
      const template = getTemplate({
        templateIndexPattern,
        packageName: 'system',
        composedOfTemplates: [],
        templatePriority: 200,
      });

      // This test is not an API integration test with Kibana
      // We want to test here if the template is valid and for this we need a running ES instance.
      // If the ES instance takes the template, we assume it is a valid template.
      const { body: response1 } = await es.transport.request(
        {
          method: 'PUT',
          path: `/_index_template/${templateName}`,
          body: template,
        },
        { meta: true }
      );

      // Checks if template loading worked as expected
      expect(response1).to.eql({ acknowledged: true });

      const { body: response2 } = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_index_template/${templateName}`,
        },
        { meta: true }
      );

      // Checks if the content of the template that was loaded is as expected
      // We already know based on the above test that the template was valid
      // but we check here also if we wrote the index pattern inside the template as expected
      expect(response2.index_templates[0].index_template.index_patterns).to.eql([
        templateIndexPattern,
      ]);
    });
  });
}
