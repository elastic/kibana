/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTemplate } from '../../../../plugins/ingest_manager/server/services/epm/elasticsearch/template/template';

export default function ({ getService }: FtrProviderContext) {
  const indexPattern = 'foo';
  const templateName = 'bar';
  const es = getService('es');
  const mappings = {
    properties: {
      foo: {
        type: 'keyword',
      },
    },
  };
  // This test was inspired by https://github.com/elastic/kibana/blob/master/x-pack/test/api_integration/apis/monitoring/common/mappings_exist.js
  describe('EPM - template', async () => {
    it('can be loaded', async () => {
      const template = getTemplate({
        type: 'logs',
        templateName,
        mappings,
        packageName: 'system',
        composedOfTemplates: [],
      });

      // This test is not an API integration test with Kibana
      // We want to test here if the template is valid and for this we need a running ES instance.
      // If the ES instance takes the template, we assume it is a valid template.
      const { body: response1 } = await es.indices.putTemplate({
        name: templateName,
        body: template,
      });
      // Checks if template loading worked as expected
      expect(response1).to.eql({ acknowledged: true });

      const { body: response2 } = await es.indices.getTemplate({ name: templateName });
      // Checks if the content of the template that was loaded is as expected
      // We already know based on the above test that the template was valid
      // but we check here also if we wrote the index pattern inside the template as expected
      expect(response2[templateName].index_patterns).to.eql([`${indexPattern}-*`]);
    });
  });
}
