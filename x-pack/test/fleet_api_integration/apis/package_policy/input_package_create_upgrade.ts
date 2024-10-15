/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
const PACKAGE_NAME = 'input_package_upgrade';
const START_VERSION = '1.0.0';
const UPGRADE_VERSION = '1.1.0';

const expectIdArraysEqual = (arr1: any[], arr2: any[]) => {
  expect(sortBy(arr1, 'id')).to.eql(sortBy(arr2, 'id'));
};
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = async (name: string, version: string) => {
    return await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const getInstallationSavedObject = async (name: string, version: string) => {
    const res = await supertest.get(`/api/fleet/epm/packages/${name}/${version}`).expect(200);
    return res.body.item.savedObject.attributes;
  };

  const createPackagePolicyWithDataset = async (
    agentPolicyId: string,
    dataset: string,
    expectStatusCode = 200,
    force = false
  ) => {
    const policy = {
      force,
      policy_id: agentPolicyId,
      package: {
        name: PACKAGE_NAME,
        version: START_VERSION,
      },
      name: 'test-policy-' + dataset,
      description: '',
      namespace: 'default',
      inputs: {
        'logs-logfile': {
          enabled: true,
          streams: {
            'input_package_upgrade.logs': {
              enabled: true,
              vars: {
                paths: ['/tmp/test/log'],
                tags: ['tag1'],
                ignore_older: '72h',
                'data_stream.dataset': dataset,
              },
            },
          },
        },
      },
    };
    const res = await supertest
      .post(`/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send(policy)
      .expect(expectStatusCode);

    return res.body.item;
  };

  const createAgentPolicy = async (name = 'Input Package Test 3') => {
    const res = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name,
        namespace: 'default',
      })
      .expect(200);
    return res.body.item;
  };

  const deleteAgentPolicy = async (agentPolicyId: string) => {
    if (!agentPolicyId) return;
    return supertest
      .post(`/api/fleet/agent_policies/delete`)
      .set('kbn-xsrf', 'xxxx')
      .send({ agentPolicyId });
  };

  const getComponentTemplate = async (name: string) => {
    try {
      const { component_templates: templates } = await es.cluster.getComponentTemplate({ name });

      return templates?.[0] || null;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }

      throw e;
    }
  };

  const getIndexTemplate = async (name: string) => {
    try {
      const { index_templates: templates } = await es.indices.getIndexTemplate({ name });

      return templates?.[0]?.index_template || null;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
    }
  };

  const createFakeFleetIndexTemplate = async (dataset: string, pkgName = PACKAGE_NAME) => {
    const templateName = `logs-${dataset}`;
    const template = {
      name: templateName,
      index_patterns: [`${templateName}-*`],
      priority: 200,
      _meta: {
        package: {
          name: pkgName,
        },
        managed_by: 'fleet',
        managed: true,
      },
      data_stream: {},
      template: {
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          properties: {},
        },
      },
    };
    await es.indices.putIndexTemplate(template);
  };

  const createFakeFleetDataStream = async (dataset: string, pkgName = PACKAGE_NAME) => {
    const indexName = `logs-${dataset}-default`;
    await createFakeFleetIndexTemplate(dataset, pkgName);

    await es.index({
      index: indexName,
      body: {
        '@timestamp': new Date().toISOString(),
        message: 'test',
      },
    });
  };

  const deleteDataStream = async (templateName: string) => {
    await es.indices.deleteDataStream({ name: templateName + '-default' });
    await deleteIndexTemplate(templateName);
  };

  const deleteIndexTemplate = async (templateName: string) => {
    await es.indices.deleteIndexTemplate({ name: templateName });
  };

  describe('Package Policy - input package behavior', function () {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    let agentPolicyId: string;
    beforeEach(async () => {
      await installPackage(PACKAGE_NAME, START_VERSION);
      const agentPolicy = await createAgentPolicy();
      agentPolicyId = agentPolicy.id;
    });

    afterEach(async () => {
      await deleteAgentPolicy(agentPolicyId);

      await uninstallPackage(PACKAGE_NAME, START_VERSION);
    });

    it('should not have created any ES assets on install', async () => {
      const installation = await getInstallationSavedObject(PACKAGE_NAME, START_VERSION);
      expect(installation.installed_es).to.eql([]);
    });

    it('should create index templates and update installed_es on package policy creation', async () => {
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset1');
      const installation = await getInstallationSavedObject(PACKAGE_NAME, START_VERSION);
      expectIdArraysEqual(installation.installed_es, [
        { id: 'logs-dataset1-1.0.0', type: 'ingest_pipeline' },
        { id: 'logs-dataset1', type: 'index_template' },
        { id: 'logs-dataset1@package', type: 'component_template' },
        { id: 'logs-dataset1@custom', type: 'component_template' },
        { id: 'logs@custom', type: 'component_template' },
      ]);

      // now check the package component template was created correctly
      const packageComponentTemplate = await getComponentTemplate('logs-dataset1@package');
      expect(packageComponentTemplate).eql({
        name: 'logs-dataset1@package',
        component_template: {
          template: {
            settings: {
              index: {
                lifecycle: { name: 'logs' },
                default_pipeline: 'logs-dataset1-1.0.0',
                mapping: {
                  total_fields: { limit: '1000' },
                },
              },
            },
            mappings: {
              properties: {
                input: {
                  properties: {
                    name: {
                      type: 'constant_keyword',
                      value: 'logs',
                    },
                  },
                },
              },
            },
          },
          _meta: {
            package: { name: 'input_package_upgrade' },
            managed_by: 'fleet',
            managed: true,
          },
        },
      });
    });

    it('should create index templates and update installed_es on second package policy creation', async () => {
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset2');
      const installation = await getInstallationSavedObject(PACKAGE_NAME, START_VERSION);
      let found = 0;
      [
        { id: 'logs-dataset2-1.0.0', type: 'ingest_pipeline' },
        { id: 'logs-dataset2', type: 'index_template' },
        { id: 'logs-dataset2@package', type: 'component_template' },
        { id: 'logs-dataset2@custom', type: 'component_template' },
      ].forEach((obj) => {
        if (installation.installed_es.find((installed: any) => installed.id === obj.id)) {
          found++;
        }
      });
      expect(found).to.eql(4);
    });

    it('should allow data to be sent to existing stream if owned by package and should not create templates', async () => {
      await createFakeFleetDataStream('dataset3');

      await createPackagePolicyWithDataset(agentPolicyId, 'dataset3');
      const installation = await getInstallationSavedObject(PACKAGE_NAME, START_VERSION);
      let found = 0;
      [
        { id: 'logs-dataset3-1.0.0', type: 'ingest_pipeline' },
        { id: 'logs-dataset3', type: 'index_template' },
        { id: 'logs-dataset3@package', type: 'component_template' },
        { id: 'logs-dataset3@custom', type: 'component_template' },
      ].forEach((obj) => {
        if (installation.installed_es.find((installed: any) => installed.id === obj.id)) {
          found++;
        }
      });
      expect(found).to.eql(0);

      const dataset3PkgComponentTemplate = await getComponentTemplate('logs-dataset3@package');
      expect(dataset3PkgComponentTemplate).eql(null);

      await deleteDataStream('logs-dataset3');
    });

    it('should not allow data to be sent to existing stream if not owned by package', async () => {
      await createFakeFleetDataStream('dataset4', 'different_package');

      const expectedStatusCode = 400;
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset4', expectedStatusCode);

      const dataset4PkgComponentTemplate = await getComponentTemplate('logs-dataset4@package');
      expect(dataset4PkgComponentTemplate).eql(null);

      await deleteDataStream('logs-dataset4');
    });

    it('should not allow existing index template to be overwritten if not owned by package', async () => {
      await createFakeFleetIndexTemplate('dataset4', 'different_package');

      const expectedStatusCode = 400;
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset4', expectedStatusCode);

      const dataset4PkgComponentTemplate = await getComponentTemplate('logs-dataset4@package');
      expect(dataset4PkgComponentTemplate).eql(null);

      await deleteIndexTemplate('logs-dataset4');
    });

    it('should allow data to be sent to existing stream if not owned by package if force flag provided', async () => {
      await createFakeFleetDataStream('dataset5', 'different_package');

      const expectedStatusCode = 200;
      const force = true;
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset5', expectedStatusCode, force);

      const dataset5PkgComponentTemplate = await getComponentTemplate('logs-dataset5@package');
      expect(dataset5PkgComponentTemplate).eql(null);

      const dataset5IndexTemplate = await getIndexTemplate('logs-dataset5');
      expect(dataset5IndexTemplate?._meta?.package?.name).eql('different_package');

      await deleteDataStream('logs-dataset5');
    });

    it('should not override existing index template with no associated streams ', async () => {
      await createFakeFleetIndexTemplate('dataset6', 'different_package');

      const expectedStatusCode = 200;
      const force = true;
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset6', expectedStatusCode, force);

      const dataset6PkgComponentTemplate = await getComponentTemplate('logs-dataset6@package');
      expect(dataset6PkgComponentTemplate).eql(null);

      const dataset6IndexTemplate = await getIndexTemplate('logs-dataset6');
      expect(dataset6IndexTemplate?._meta?.package?.name).eql('different_package');

      await deleteIndexTemplate('logs-dataset6');
    });

    it('should update all index templates created by package policies when the package is upgraded', async () => {
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset1');
      // version 1.1.0 of the test package introduces elasticsearch mappings to the index
      // templates, upgrading the package should add this field to both package component templates
      await installPackage(PACKAGE_NAME, UPGRADE_VERSION);

      const dataset1PkgComponentTemplate = await getComponentTemplate('logs-dataset1@package');
      expect(dataset1PkgComponentTemplate).not.eql(null);
      const mappingsWithTimestamp = {
        '@timestamp': { ignore_malformed: false, type: 'date' },
        input: {
          properties: {
            name: {
              type: 'constant_keyword',
              value: 'logs',
            },
          },
        },
      };
      expect(dataset1PkgComponentTemplate!.component_template.template?.mappings?.properties).eql(
        mappingsWithTimestamp
      );

      await uninstallPackage(PACKAGE_NAME, UPGRADE_VERSION);
    });
    it('should delete all index templates created by package policies when the package is uninstalled', async () => {
      await createPackagePolicyWithDataset(agentPolicyId, 'dataset1');
      await deleteAgentPolicy(agentPolicyId);
      await uninstallPackage(PACKAGE_NAME, UPGRADE_VERSION);

      const dataset1PkgComponentTemplate = await getComponentTemplate('logs-dataset1@package');
      expect(dataset1PkgComponentTemplate).eql(null);
    });
  });
}
