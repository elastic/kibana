/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { createOrUpdateIndexAssets } from '../utils/index_assets';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  describe('index assets: creating mappings, templates, aliases and write indices', () => {
    before(async () => {
      const { indexPatterns, indexTemplate, componentTemplate } = resourceNames;

      // delete concrete write indices
      const response = await es.indices.get({ index: Object.values(indexPatterns) });
      const indicesToDelete = Object.keys(response);
      await es.indices.delete({ index: indicesToDelete, ignore_unavailable: true });

      // delete index templates
      await es.indices.deleteIndexTemplate({ name: Object.values(indexTemplate) });

      // delete component templates
      await es.cluster.deleteComponentTemplate({ name: Object.values(componentTemplate) });

      // create index assets from scratch
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
    });

    for (const componentTemplateName of Object.values(resourceNames.componentTemplate)) {
      it(`should create components template: ${componentTemplateName}`, async () => {
        const exists = await es.cluster.existsComponentTemplate({ name: componentTemplateName });
        expect(exists).to.be(true);
      });
    }

    for (const indexTemplateName of Object.values(resourceNames.indexTemplate)) {
      it(`should create index template: "${indexTemplateName}"`, async () => {
        const exists = await es.indices.existsIndexTemplate({ name: indexTemplateName });
        expect(exists).to.be(true);
      });
    }

    for (const writeIndexName of Object.values(resourceNames.concreteWriteIndexName)) {
      it(`should create write index: "${writeIndexName}"`, async () => {
        const exists = await es.indices.exists({ index: writeIndexName });
        expect(exists).to.be(true);
      });
    }

    it('should be able to setup index assets multiple times without creating additional write indices', async () => {
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);

      const indices = await es.cat.indices({
        index: Object.values(resourceNames.indexPatterns),
        format: 'json',
        h: 'index',
      });

      expect(indices).to.have.length(2);

      expect(indices.map(({ index }) => index)).to.eql(
        Object.values(resourceNames.concreteWriteIndexName)
      );
    });
  });
}
