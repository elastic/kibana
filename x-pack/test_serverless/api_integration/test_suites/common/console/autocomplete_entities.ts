/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';
import { InternalRequestHeader } from '../../../../shared/services/svl_common_api';

export default ({ getService }: FtrProviderContext) => {
  const svlCommonApi = getService('svlCommonApi');
  const consoleService = getService('console');

  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let internalRequestHeader: InternalRequestHeader;
  let roleAuthc: RoleCredentials;

  const sendRequest = async (query: object) => {
    return await supertestWithoutAuth
      .get('/api/console/autocomplete_entities')
      .set(internalRequestHeader)
      .set(roleAuthc.apiKeyHeader)
      .query(query);
  };

  describe('/api/console/autocomplete_entities', function () {
    let createIndex: (typeof consoleService)['helpers']['createIndex'];
    let createAlias: (typeof consoleService)['helpers']['createAlias'];
    let createIndexTemplate: (typeof consoleService)['helpers']['createIndexTemplate'];
    let createComponentTemplate: (typeof consoleService)['helpers']['createComponentTemplate'];
    let createDataStream: (typeof consoleService)['helpers']['createDataStream'];
    let deleteIndex: (typeof consoleService)['helpers']['deleteIndex'];
    let deleteAlias: (typeof consoleService)['helpers']['deleteAlias'];
    let deleteIndexTemplate: (typeof consoleService)['helpers']['deleteIndexTemplate'];
    let deleteComponentTemplate: (typeof consoleService)['helpers']['deleteComponentTemplate'];
    let deleteDataStream: (typeof consoleService)['helpers']['deleteDataStream'];

    const indexName = 'test-index-1';
    const aliasName = 'test-alias-1';
    const indexTemplateName = 'test-index-template-1';
    const componentTemplateName = 'test-component-template-1';
    const dataStreamName = 'test-data-stream-1';

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalRequestHeader = svlCommonApi.getInternalRequestHeader();
      ({
        helpers: {
          createIndex,
          createAlias,
          createIndexTemplate,
          createComponentTemplate,
          createDataStream,
          deleteIndex,
          deleteAlias,
          deleteIndexTemplate,
          deleteComponentTemplate,
          deleteDataStream,
        },
      } = consoleService);

      // Setup indices, aliases, templates, and data streams
      await createIndex(indexName);
      await createAlias(indexName, aliasName);
      await createComponentTemplate(componentTemplateName);
      await createIndexTemplate(indexTemplateName, [dataStreamName], [componentTemplateName]);
      await createDataStream(dataStreamName);
    });

    after(async () => {
      // Cleanup indices, aliases, templates, and data streams
      await deleteAlias(indexName, aliasName);
      await deleteIndex(indexName);
      await deleteDataStream(dataStreamName);
      await deleteIndexTemplate(indexTemplateName);
      await deleteComponentTemplate(componentTemplateName);

      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should not succeed if no settings are provided in query params', async () => {
      const response = await sendRequest({});
      const { status } = response;
      expect(status).to.be(400);
    });

    it('should return an object with properties of "mappings", "aliases", "dataStreams", "legacyTemplates", "indexTemplates", "componentTemplates"', async () => {
      const response = await sendRequest({
        indices: true,
        fields: true,
        templates: true,
        dataStreams: true,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body).sort()).to.eql([
        'aliases',
        'componentTemplates',
        'dataStreams',
        'indexTemplates',
        'legacyTemplates',
        'mappings',
      ]);
    });

    it('should return empty payload with all settings are set to false', async () => {
      const response = await sendRequest({
        indices: false,
        fields: false,
        templates: false,
        dataStreams: false,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.legacyTemplates).to.eql({});
      expect(body.indexTemplates).to.eql({});
      expect(body.componentTemplates).to.eql({});
      expect(body.aliases).to.eql({});
      expect(body.mappings).to.eql({});
      expect(body.dataStreams).to.eql({});
    });

    it('should return empty templates with templates setting is set to false', async () => {
      const response = await sendRequest({
        templates: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.legacyTemplates).to.eql({});
      expect(body.indexTemplates).to.eql({});
      expect(body.componentTemplates).to.eql({});
    });

    it('should return empty data streams with dataStreams setting is set to false', async () => {
      const response = await sendRequest({
        dataStreams: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.dataStreams).to.eql({});
    });

    it('should return empty aliases with indices setting is set to false', async () => {
      const response = await sendRequest({
        indices: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.aliases).to.eql({});
    });

    it('should return empty mappings with fields setting is set to false', async () => {
      const response = await sendRequest({
        fields: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.mappings).to.eql({});
    });

    it('should not return mappings with fields setting is set to true without the list of indices is provided', async () => {
      const response = await sendRequest({ fields: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body.mappings)).to.not.contain(indexName);
    });

    it('should return mappings with fields setting is set to true and the list of indices is provided', async () => {
      const response = await sendRequest({ fields: true, fieldsIndices: indexName });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body.mappings)).to.contain(indexName);
    });

    it('should return aliases with indices setting is set to true', async () => {
      const response = await sendRequest({ indices: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.aliases[indexName].aliases).to.eql({ [aliasName]: {} });
    });

    it('should return data streams with dataStreams setting is set to true', async () => {
      const response = await sendRequest({ dataStreams: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.dataStreams.data_streams.map((ds: { name: string }) => ds.name)).to.contain(
        dataStreamName
      );
    });

    it('should return all templates with templates setting is set to true', async () => {
      const response = await sendRequest({ templates: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.indexTemplates.index_templates.map((it: { name: string }) => it.name)).to.contain(
        indexTemplateName
      );
      expect(
        body.componentTemplates.component_templates.map((ct: { name: string }) => ct.name)
      ).to.contain(componentTemplateName);
    });
  });
};
