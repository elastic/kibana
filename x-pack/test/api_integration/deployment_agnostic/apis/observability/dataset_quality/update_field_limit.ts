/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials, SupertestWithRoleScopeType } from '../../../services';
import { createBackingIndexNameWithoutVersion, rolloverDataStream } from './utils/es_utils';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const esClient = getService('es');
  const packageApi = getService('packageApi');
  const start = '2024-10-17T11:00:00.000Z';
  const end = '2024-10-17T11:01:00.000Z';
  const type = 'logs';
  const invalidDataset = 'invalid';
  const integrationsDataset = 'nginx.access';
  const pkg = 'nginx';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const invalidDataStreamName = `${type}-${invalidDataset}-${namespace}`;
  const integrationsDataStreamName = `${type}-${integrationsDataset}-${namespace}`;

  async function callApiAs({
    roleScopedSupertestWithCookieCredentials,
    apiParams: { dataStream, fieldLimit },
  }: {
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
    apiParams: {
      dataStream: string;
      fieldLimit: number;
    };
  }) {
    return roleScopedSupertestWithCookieCredentials
      .put(`/internal/dataset_quality/data_streams/${dataStream}/update_field_limit`)
      .send({
        newFieldLimit: fieldLimit,
      });
  }

  describe('Update field limit', function () {
    let adminRoleAuthc: RoleCredentials;
    let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
    let synthtraceLogsEsClient: LogsSynthtraceEsClient;

    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
      await packageApi.installPackage({
        roleAuthc: adminRoleAuthc,
        pkg,
      });

      synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
      await synthtraceLogsEsClient.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(integrationsDataset)
              .namespace(namespace)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': serviceName,
                'host.name': hostName,
              })
          ),
      ]);
    });

    after(async () => {
      await synthtraceLogsEsClient.clean();
      await packageApi.uninstallPackage({
        roleAuthc: adminRoleAuthc,
        pkg,
      });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('should handles failure gracefully when invalid datastream provided ', async () => {
      const resp = await callApiAs({
        roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        apiParams: {
          dataStream: invalidDataStreamName,
          fieldLimit: 10,
        },
      });

      expect(resp.body.statusCode).to.be(400);
      expect(resp.body.message).to.be(
        `Data stream does not exists. Received value "${invalidDataStreamName}"`
      );
    });

    it('should update last backing index and custom component template', async () => {
      // We rollover the data stream to create a new backing index
      await rolloverDataStream(esClient, integrationsDataStreamName);

      const resp = await callApiAs({
        roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        apiParams: {
          dataStream: integrationsDataStreamName,
          fieldLimit: 50,
        },
      });

      expect(resp.body.isComponentTemplateUpdated).to.be(true);
      expect(resp.body.isLatestBackingIndexUpdated).to.be(true);
      expect(resp.body.customComponentTemplateName).to.be(`${type}-${integrationsDataset}@custom`);
      expect(resp.body.error).to.be(undefined);

      const { component_templates: componentTemplates } =
        await esClient.cluster.getComponentTemplate({
          name: `${type}-${integrationsDataset}@custom`,
        });

      const customTemplate = componentTemplates.filter(
        (tmp) => tmp.name === `${type}-${integrationsDataset}@custom`
      );

      expect(customTemplate).to.have.length(1);
      expect(
        customTemplate[0].component_template.template.settings?.index?.mapping?.total_fields?.limit
      ).to.be('50');

      const settingsForAllIndices = await esClient.indices.getSettings({
        index: integrationsDataStreamName,
      });

      const backingIndexWithoutVersion = createBackingIndexNameWithoutVersion({
        type,
        dataset: integrationsDataset,
        namespace,
      });
      const settingsForLastBackingIndex =
        settingsForAllIndices[backingIndexWithoutVersion + '-000002'].settings;
      const settingsForPreviousBackingIndex =
        settingsForAllIndices[backingIndexWithoutVersion + '-000001'].settings;

      // Only the Last Backing Index should have the updated limit and not the one previous to it
      expect(settingsForLastBackingIndex?.index?.mapping?.total_fields?.limit).to.be('50');

      // The previous one should have the default limit of 1000
      expect(settingsForPreviousBackingIndex?.index?.mapping?.total_fields?.limit).to.be('1000');

      // Rollover to test custom component template
      await rolloverDataStream(esClient, integrationsDataStreamName);

      const settingsForLatestBackingIndex = await esClient.indices.getSettings({
        index: backingIndexWithoutVersion + '-000003',
      });

      // The new backing index should read settings from custom component template
      expect(
        settingsForLatestBackingIndex[backingIndexWithoutVersion + '-000003'].settings?.index
          ?.mapping?.total_fields?.limit
      ).to.be('50');
    });
  });
}
