/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { getTemplate } from '../../../legacy/plugins/epm/server/lib/template/template';

export default function({ getService }: FtrProviderContext) {
  const indexPattern = 'foo';
  const templateName = 'bar';
  const es = getService('es');
  // This test was inspired by https://github.com/elastic/kibana/blob/master/x-pack/test/api_integration/apis/monitoring/common/mappings_exist.js
  describe('template', async () => {
    it('can be loaded', async () => {
      const body = getTemplate(indexPattern);

      const { body: response } = await es.indices.putTemplate({
        name: templateName,
        body,
      });
      expect(response).to.eql({ acknowledged: true });
      const { body: indexTemplate } = await es.indices.getTemplate({ name: templateName });
      expect(indexTemplate[templateName].index_patterns).to.eql([indexPattern]);
    });
  });
}
