/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { getTemplate } from '../../../legacy/plugins/integrations_manager/server/lib/template/template';

export default function({ getService }: FtrProviderContext) {
  // This test was inspired by https://github.com/elastic/kibana/blob/master/x-pack/test/api_integration/apis/monitoring/common/mappings_exist.js
  describe('load template', async () => {
    const indexPattern = 'foo';
    const templateName = 'bar';
    const es = getService('es');

    const body = getTemplate(indexPattern);

    const response = await es.indices.putTemplate({
      name: templateName,
      body,
    });
    expect(response).to.eql({ acknowledged: true });

    const indexTemplate = await es.indices.getTemplate({ name: templateName });
    expect(indexTemplate[templateName].index_patterns).to.eql([indexPattern]);
  });
}
