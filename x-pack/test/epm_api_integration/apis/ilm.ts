/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { getTemplate } from '../../../legacy/plugins/integrations_manager/server/lib/template/template';

export default function({ getService }: FtrProviderContext) {
  describe('load ilm', async () => {
    const indexPattern = 'foo';
    const templateName = 'bar';
    const es = getService('es');

    const body = getTemplate(indexPattern);

    const response = await es.indices.putTemplate({
      name: templateName,
      body,
    });
    // Checks if template loading worked as expected
    expect(response).to.eql({ acknowledged: true });

    const indexTemplate = await es.indices.getTemplate({ name: templateName });
    // Checks if the content of the template that was loaded is as expected
    expect(indexTemplate[templateName].index_patterns).to.eql([indexPattern]);
  });
}
