/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const INTEGRATION_NAME = 'my_nginx';
const INTEGRATION_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es');

  const uninstallPackage = async () => {
    await supertest
      .delete(`/api/fleet/epm/packages/${INTEGRATION_NAME}/${INTEGRATION_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('TESTME Installing custom integrations', async () => {
    afterEach(async () => {
      await uninstallPackage();
    });

    it('Correcty installs a custom integration and all of its assets', async () => {
      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: `${INTEGRATION_NAME}.access`, type: 'logs' },
            { name: `${INTEGRATION_NAME}.error`, type: 'metrics' },
            { name: `${INTEGRATION_NAME}.warning`, type: 'logs' },
          ],
        })
        .expect(200);

      const expectedIngestPipelines = [
        `logs-${INTEGRATION_NAME}.access-1.0.0`,
        `metrics-${INTEGRATION_NAME}.error-1.0.0`,
        `logs-${INTEGRATION_NAME}.warning-1.0.0`,
      ];
      const expectedIndexTemplates = [
        `logs-${INTEGRATION_NAME}.access`,
        `metrics-${INTEGRATION_NAME}.error`,
        `logs-${INTEGRATION_NAME}.warning`,
      ];
      const expectedComponentTemplates = [
        `logs-${INTEGRATION_NAME}.access@package`,
        `logs-${INTEGRATION_NAME}.access@custom`,
        `metrics-${INTEGRATION_NAME}.error@package`,
        `metrics-${INTEGRATION_NAME}.error@custom`,
        `logs-${INTEGRATION_NAME}.warning@package`,
        `logs-${INTEGRATION_NAME}.warning@custom`,
      ];

      expect(response.body._meta.install_source).to.be('custom');

      const actualIngestPipelines = response.body.items
        .filter((item: any) => item.type === 'ingest_pipeline')
        .map((pipeline: any) => pipeline.id);

      const actualIndexTemplates = response.body.items
        .filter((item: any) => item.type === 'index_template')
        .map((template: any) => template.id);

      const actualComponentTemplates = response.body.items
        .filter((item: any) => item.type === 'component_template')
        .map((template: any) => template.id);

      expectedIngestPipelines.forEach((pipeline) => {
        expect(actualIngestPipelines).to.contain(pipeline);
      });
      expectedIndexTemplates.forEach((template) => {
        expect(actualIndexTemplates).to.contain(template);
      });
      expectedComponentTemplates.forEach((template) => {
        expect(actualComponentTemplates).to.contain(template);
      });

      const installation = await kibanaServer.savedObjects.get({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        id: INTEGRATION_NAME,
      });
      expect(installation.attributes.name).to.be(INTEGRATION_NAME);
      expect(installation.attributes.version).to.be(INTEGRATION_VERSION);
      expect(installation.attributes.install_source).to.be('custom');
      expect(installation.attributes.install_status).to.be('installed');
    });

    it('Correctly sets up index templates to create an ECS compliant mapping', async () => {
      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: `${INTEGRATION_NAME}.access`, type: 'logs' }],
        })
        .expect(200);

      const indexName = `logs-${INTEGRATION_NAME}.access-000001`;

      // Actually index data to see if the mapping comes out as expected based on the component template stack
      await esClient.index({
        index: indexName,
        document: {
          'cloud.account.id': 'xyz',
          'cloud.availability_zone': 'xyz',
          'cloud.instance.id': 'xyz',
          'cloud.instance.name': 'xyz',
          'cloud.machine.type': 'xyz',
          'cloud.provider': 'xyz',
          'cloud.region': 'xyz',
          'cloud.project.id': 'xyz',
          'cloud.image.id': 'xyz',
          'container.id': 'xyz',
          'container.image.name': 'xyz',
          'container.labels': { foo_id: 'beef42' },
          'container.name': 'xyz',
          'host.architecture': 'xyz',
          'host.domain': 'xyz',
          'host.hostname': 'xyz',
          'host.id': 'xyz',
          'host.ip': '1.1.1.1',
          'host.mac': 'xyz',
          'host.name': 'xyz',
          'host.os.family': 'xyz',
          'host.os.kernel': 'xyz',
          'host.os.name': 'xyz',
          'host.os.platform': 'xyz',
          'host.os.version': 'xyz',
          'host.os.type': 'xyz',
          'host.os.containerized': true,
          'host.os.build': 'xyz',
          'host.os.codename': 'xyz',
          'input.type': 'xyz',
          'log.offset': 123,
          'data_stream.type': 'logs',
        },
      });
      const response = await esClient.indices.getMapping({ index: indexName });

      expect(Object.values(response)[0].mappings).to.eql({
        subobjects: false,
        _meta: {
          managed_by: 'fleet',
          managed: true,
          package: {
            name: 'my_nginx',
          },
        },
        _data_stream_timestamp: {
          enabled: true,
        },
        dynamic_templates: [
          {
            ecs_timestamp: {
              mapping: {
                ignore_malformed: false,
                type: 'date',
              },
              match: '@timestamp',
            },
          },
          {
            ecs_message_match_only_text: {
              mapping: {
                type: 'match_only_text',
              },
              path_match: ['message', '*.message'],
              unmatch_mapping_type: 'object',
            },
          },
          {
            ecs_non_indexed_keyword: {
              mapping: {
                doc_values: false,
                index: false,
                type: 'keyword',
              },
              path_match: 'event.original',
            },
          },
          {
            ecs_non_indexed_long: {
              mapping: {
                doc_values: false,
                index: false,
                type: 'long',
              },
              path_match: '*.x509.public_key_exponent',
            },
          },
          {
            ecs_ip: {
              path_match: ['ip', '*.ip', '*_ip'],
              match_mapping_type: 'string',
              mapping: {
                type: 'ip',
              },
            },
          },
          {
            ecs_wildcard: {
              path_match: ['*.io.text', '*.message_id', '*registry.data.strings', '*url.path'],
              unmatch_mapping_type: 'object',
              mapping: {
                type: 'wildcard',
              },
            },
          },
          {
            ecs_path_match_wildcard_and_match_only_text: {
              path_match: ['*.body.content', '*url.full', '*url.original'],
              unmatch_mapping_type: 'object',
              mapping: {
                fields: {
                  text: {
                    type: 'match_only_text',
                  },
                },
                type: 'wildcard',
              },
            },
          },
          {
            ecs_match_wildcard_and_match_only_text: {
              match: ['*command_line', '*stack_trace'],
              unmatch_mapping_type: 'object',
              mapping: {
                fields: {
                  text: {
                    type: 'match_only_text',
                  },
                },
                type: 'wildcard',
              },
            },
          },
          {
            ecs_path_match_keyword_and_match_only_text: {
              path_match: [
                '*.title',
                '*.executable',
                '*.name',
                '*.working_directory',
                '*.full_name',
                '*file.path',
                '*file.target_path',
                '*os.full',
                'email.subject',
                'vulnerability.description',
                'user_agent.original',
              ],
              unmatch_mapping_type: 'object',
              mapping: {
                fields: {
                  text: {
                    type: 'match_only_text',
                  },
                },
                type: 'keyword',
              },
            },
          },
          {
            ecs_date: {
              path_match: [
                '*.timestamp',
                '*_timestamp',
                '*.not_after',
                '*.not_before',
                '*.accessed',
                'created',
                '*.created',
                '*.installed',
                '*.creation_date',
                '*.ctime',
                '*.mtime',
                'ingested',
                '*.ingested',
                '*.start',
                '*.end',
              ],
              unmatch_mapping_type: 'object',
              mapping: {
                type: 'date',
              },
            },
          },
          {
            ecs_path_match_float: {
              path_match: ['*.score.*', '*_score*'],
              path_unmatch: '*.version',
              unmatch_mapping_type: 'object',
              mapping: {
                type: 'float',
              },
            },
          },
          {
            ecs_usage_double_scaled_float: {
              path_match: '*.usage',
              match_mapping_type: ['double', 'long', 'string'],
              mapping: {
                scaling_factor: 1000,
                type: 'scaled_float',
              },
            },
          },
          {
            ecs_geo_point: {
              path_match: '*.geo.location',
              mapping: {
                type: 'geo_point',
              },
            },
          },
          {
            ecs_flattened: {
              path_match: ['*structured_data', '*exports', '*imports'],
              match_mapping_type: 'object',
              mapping: {
                type: 'flattened',
              },
            },
          },
          {
            all_strings_to_keywords: {
              match_mapping_type: 'string',
              mapping: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          {
            strings_as_keyword: {
              match_mapping_type: 'string',
              mapping: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
        ],
        date_detection: false,
        properties: {
          '@timestamp': {
            type: 'date',
            ignore_malformed: false,
          },
          'cloud.account.id': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'cloud.availability_zone': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'cloud.image.id': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'cloud.instance.id': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'cloud.instance.name': {
            type: 'keyword',
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          'cloud.machine.type': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'cloud.project.id': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'cloud.provider': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'cloud.region': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'container.id': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'container.image.name': {
            type: 'keyword',
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          'container.labels.foo_id': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'container.name': {
            type: 'keyword',
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          'data_stream.dataset': {
            type: 'constant_keyword',
          },
          'data_stream.namespace': {
            type: 'constant_keyword',
          },
          'data_stream.type': {
            type: 'constant_keyword',
            value: 'logs',
          },
          'event.agent_id_status': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'event.ingested': {
            type: 'date',
            format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
            ignore_malformed: false,
          },
          'host.architecture': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.domain': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.hostname': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.id': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.ip': {
            type: 'ip',
          },
          'host.mac': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.name': {
            type: 'keyword',
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          'host.os.build': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.os.codename': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.os.containerized': {
            type: 'boolean',
          },
          'host.os.family': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.os.kernel': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.os.name': {
            type: 'keyword',
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          'host.os.platform': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.os.type': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'host.os.version': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'input.type': {
            type: 'keyword',
            ignore_above: 1024,
          },
          'log.offset': {
            type: 'long',
          },
        },
      });
    });

    it('Works correctly when there is an existing datastream with the same name', async () => {
      const INTEGRATION_NAME_1 = 'myintegration';
      const DATASET_NAME = 'test';
      await esClient.transport.request({
        method: 'POST',
        path: `logs-${INTEGRATION_NAME_1}.${DATASET_NAME}-default/_doc`,
        body: {
          '@timestamp': '2015-01-01',
          logs_test_name: `${DATASET_NAME}`,
          data_stream: {
            dataset: `${INTEGRATION_NAME_1}.${DATASET_NAME}_logs`,
            namespace: 'default',
            type: 'logs',
          },
        },
      });
      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME_1,
          datasets: [{ name: `${INTEGRATION_NAME_1}.${DATASET_NAME}`, type: 'logs' }],
        })
        .expect(200);
    });

    it('Throws an error when there is a naming collision with a current package installation', async () => {
      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: `${INTEGRATION_NAME}.access`, type: 'logs' },
            { name: `${INTEGRATION_NAME}.error`, type: 'metrics' },
            { name: `${INTEGRATION_NAME}.warning`, type: 'logs' },
          ],
        })
        .expect(200);

      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: `${INTEGRATION_NAME}.access`, type: 'logs' },
            { name: `${INTEGRATION_NAME}.error`, type: 'metrics' },
            { name: `${INTEGRATION_NAME}.warning`, type: 'logs' },
          ],
        })
        .expect(409);

      expect(response.body.message).to.be(
        `Failed to create the integration as an installation with the name ${INTEGRATION_NAME} already exists.`
      );
    });

    it('Throws an error when there is a naming collision with a registry package', async () => {
      const pkgName = 'apache';

      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: pkgName,
          datasets: [{ name: `${INTEGRATION_NAME}.error`, type: 'logs' }],
        })
        .expect(409);

      expect(response.body.message).to.be(
        `Failed to create the integration as an integration with the name ${pkgName} already exists in the package registry or as a bundled package.`
      );
    });

    it('Throws an error when dataset names are not prefixed correctly', async () => {
      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: 'error', type: 'logs' }],
        })
        .expect(422);

      expect(response.body.message).to.be(
        `Dataset names 'error' must either match integration name '${INTEGRATION_NAME}' exactly or be prefixed with integration name and a dot (e.g. '${INTEGRATION_NAME}.<dataset_name>').`
      );

      await uninstallPackage();

      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: INTEGRATION_NAME, type: 'logs' }],
        })
        .expect(200);

      await uninstallPackage();

      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: `${INTEGRATION_NAME}.error`, type: 'logs' }],
        })
        .expect(200);
    });
  });
}
