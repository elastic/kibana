/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  RISK_ENGINE_INIT_URL,
  RISK_ENGINE_DISABLE_URL,
  RISK_ENGINE_ENABLE_URL,
  RISK_ENGINE_STATUS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/risk_engine/saved_object';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  cleanRiskEngineConfig,
  legacyTransformIds,
  createTransforms,
  clearLegacyTransforms,
  clearTransforms,
} from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');

  describe('Risk Engine', () => {
    afterEach(async () => {
      await cleanRiskEngineConfig({
        kibanaServer,
      });
      await clearLegacyTransforms({
        es,
        log,
      });
      await clearTransforms({
        es,
        log,
      });
    });

    const initRiskEngine = async () =>
      await supertest.post(RISK_ENGINE_INIT_URL).set('kbn-xsrf', 'true').send().expect(200);

    const getRiskEngineStatus = async () =>
      await supertest.get(RISK_ENGINE_STATUS_URL).set('kbn-xsrf', 'true').send().expect(200);

    const enableRiskEngine = async () =>
      await supertest.post(RISK_ENGINE_ENABLE_URL).set('kbn-xsrf', 'true').send().expect(200);

    const disableRiskEngine = async () =>
      await supertest.post(RISK_ENGINE_DISABLE_URL).set('kbn-xsrf', 'true').send().expect(200);

    describe('init api', () => {
      it('should return response with success status', async () => {
        const response = await initRiskEngine();
        expect(response.body).to.eql({
          result: {
            errors: [],
            legacy_risk_engine_disabled: true,
            risk_engine_configuration_created: true,
            risk_engine_enabled: true,
            risk_engine_resources_installed: true,
          },
        });
      });

      it('should install resources on init call', async () => {
        const ilmPolicyName = '.risk-score-ilm-policy';
        const componentTemplateName = '.risk-score-mappings';
        const indexTemplateName = '.risk-score.risk-score-default-index-template';
        const dataStreamName = 'risk-score.risk-score-default';
        const latestIndexName = 'risk-score.risk-score-latest-default';
        const transformId = 'risk_score_latest_transform_default';

        await initRiskEngine();

        const ilmPolicy = await es.ilm.getLifecycle({
          name: ilmPolicyName,
        });

        expect(ilmPolicy[ilmPolicyName].policy).to.eql({
          _meta: {
            managed: true,
          },
          phases: {
            hot: {
              min_age: '0ms',
              actions: {
                rollover: {
                  max_age: '30d',
                  max_primary_shard_size: '50gb',
                },
              },
            },
          },
        });

        const { component_templates: componentTemplates1 } = await es.cluster.getComponentTemplate({
          name: componentTemplateName,
        });

        expect(componentTemplates1.length).to.eql(1);
        const componentTemplate = componentTemplates1[0];

        expect(componentTemplate.name).to.eql(componentTemplateName);
        expect(componentTemplate.component_template.template.mappings).to.eql({
          dynamic: 'strict',
          properties: {
            '@timestamp': {
              type: 'date',
            },
            host: {
              properties: {
                name: {
                  type: 'keyword',
                },
                risk: {
                  properties: {
                    calculated_level: {
                      type: 'keyword',
                    },
                    calculated_score: {
                      type: 'float',
                    },
                    calculated_score_norm: {
                      type: 'float',
                    },
                    category_1_count: {
                      type: 'long',
                    },
                    category_1_score: {
                      type: 'float',
                    },
                    id_field: {
                      type: 'keyword',
                    },
                    id_value: {
                      type: 'keyword',
                    },
                    notes: {
                      type: 'keyword',
                    },
                    inputs: {
                      properties: {
                        id: {
                          type: 'keyword',
                        },
                        index: {
                          type: 'keyword',
                        },
                        category: {
                          type: 'keyword',
                        },
                        description: {
                          type: 'keyword',
                        },
                        risk_score: {
                          type: 'float',
                        },
                        timestamp: {
                          type: 'date',
                        },
                      },
                      type: 'object',
                    },
                  },
                  type: 'object',
                },
              },
            },
            user: {
              properties: {
                name: {
                  type: 'keyword',
                },
                risk: {
                  properties: {
                    calculated_level: {
                      type: 'keyword',
                    },
                    calculated_score: {
                      type: 'float',
                    },
                    calculated_score_norm: {
                      type: 'float',
                    },
                    category_1_count: {
                      type: 'long',
                    },
                    category_1_score: {
                      type: 'float',
                    },
                    id_field: {
                      type: 'keyword',
                    },
                    id_value: {
                      type: 'keyword',
                    },
                    notes: {
                      type: 'keyword',
                    },
                    inputs: {
                      properties: {
                        id: {
                          type: 'keyword',
                        },
                        index: {
                          type: 'keyword',
                        },
                        category: {
                          type: 'keyword',
                        },
                        description: {
                          type: 'keyword',
                        },
                        risk_score: {
                          type: 'float',
                        },
                        timestamp: {
                          type: 'date',
                        },
                      },
                      type: 'object',
                    },
                  },
                  type: 'object',
                },
              },
            },
          },
        });

        const { index_templates: indexTemplates } = await es.indices.getIndexTemplate({
          name: indexTemplateName,
        });
        expect(indexTemplates.length).to.eql(1);
        const indexTemplate = indexTemplates[0];
        expect(indexTemplate.name).to.eql(indexTemplateName);
        expect(indexTemplate.index_template.index_patterns).to.eql([
          'risk-score.risk-score-default',
        ]);
        expect(indexTemplate.index_template.composed_of).to.eql(['.risk-score-mappings']);
        expect(indexTemplate.index_template.template!.mappings?.dynamic).to.eql(false);
        expect(indexTemplate.index_template.template!.mappings?._meta?.managed).to.eql(true);
        expect(indexTemplate.index_template.template!.mappings?._meta?.namespace).to.eql('default');
        expect(indexTemplate.index_template.template!.mappings?._meta?.kibana?.version).to.be.a(
          'string'
        );
        expect(indexTemplate.index_template.template!.settings).to.eql({
          index: {
            lifecycle: {
              name: '.risk-score-ilm-policy',
            },
            mapping: {
              total_fields: {
                limit: '1000',
              },
            },
            hidden: 'true',
            auto_expand_replicas: '0-1',
          },
        });

        const dsResponse = await es.indices.get({
          index: dataStreamName,
        });

        const dataStream = Object.values(dsResponse).find(
          (ds) => ds.data_stream === dataStreamName
        );

        expect(dataStream?.mappings?._meta?.managed).to.eql(true);
        expect(dataStream?.mappings?._meta?.namespace).to.eql('default');
        expect(dataStream?.mappings?._meta?.kibana?.version).to.be.a('string');
        expect(dataStream?.mappings?.dynamic).to.eql('false');

        expect(dataStream?.settings?.index?.lifecycle).to.eql({
          name: '.risk-score-ilm-policy',
        });

        expect(dataStream?.settings?.index?.mapping).to.eql({
          total_fields: {
            limit: '1000',
          },
        });

        expect(dataStream?.settings?.index?.hidden).to.eql('true');
        expect(dataStream?.settings?.index?.number_of_shards).to.eql(1);
        expect(dataStream?.settings?.index?.auto_expand_replicas).to.eql('0-1');

        const indexExist = await es.indices.exists({
          index: latestIndexName,
        });

        expect(indexExist).to.eql(true);

        const transformStats = await es.transform.getTransformStats({
          transform_id: transformId,
        });

        expect(transformStats.transforms[0].state).to.eql('started');
      });

      it('should create configuration saved object', async () => {
        await initRiskEngine();
        const response = await kibanaServer.savedObjects.find({
          type: riskEngineConfigurationTypeName,
        });

        expect(response?.saved_objects?.[0]?.attributes).to.eql({
          enabled: true,
        });
      });

      it('should create configuration saved object only once', async () => {
        await initRiskEngine();
        const firstResponse = await kibanaServer.savedObjects.find({
          type: riskEngineConfigurationTypeName,
        });

        await initRiskEngine();
        const secondResponse = await kibanaServer.savedObjects.find({
          type: riskEngineConfigurationTypeName,
        });

        expect(secondResponse?.saved_objects?.length).to.eql(1);
        expect(secondResponse?.saved_objects?.[0]?.id).to.eql(
          firstResponse?.saved_objects?.[0]?.id
        );
      });

      it('should remove legacy risk score transform if it exists', async () => {
        await createTransforms({ es });

        for (const transformId of legacyTransformIds) {
          const tr = await es.transform.getTransform({
            transform_id: transformId,
          });

          expect(tr?.transforms?.[0]?.id).to.eql(transformId);
        }

        await initRiskEngine();

        for (const transformId of legacyTransformIds) {
          try {
            await es.transform.getTransform({
              transform_id: transformId,
            });
          } catch (err) {
            expect(err).to.not.be(undefined);
          }
        }
      });
    });

    describe('status api', () => {
      it('should disable / enable risk engige', async () => {
        const status1 = await getRiskEngineStatus();

        expect(status1.body).to.eql({
          risk_engine_status: 'NOT_INSTALLED',
          legacy_risk_engine_status: 'NOT_INSTALLED',
          is_max_amount_of_risk_engines_reached: false,
        });

        await initRiskEngine();

        const status2 = await getRiskEngineStatus();

        expect(status2.body).to.eql({
          risk_engine_status: 'ENABLED',
          legacy_risk_engine_status: 'NOT_INSTALLED',
          is_max_amount_of_risk_engines_reached: false,
        });

        await disableRiskEngine();
        const status3 = await getRiskEngineStatus();

        expect(status3.body).to.eql({
          risk_engine_status: 'DISABLED',
          legacy_risk_engine_status: 'NOT_INSTALLED',
          is_max_amount_of_risk_engines_reached: false,
        });

        await enableRiskEngine();
        const status4 = await getRiskEngineStatus();

        expect(status4.body).to.eql({
          risk_engine_status: 'ENABLED',
          legacy_risk_engine_status: 'NOT_INSTALLED',
          is_max_amount_of_risk_engines_reached: false,
        });
      });

      it('should return status of legacy risk engine', async () => {
        await createTransforms({ es });
        const status1 = await getRiskEngineStatus();

        expect(status1.body).to.eql({
          risk_engine_status: 'NOT_INSTALLED',
          legacy_risk_engine_status: 'ENABLED',
          is_max_amount_of_risk_engines_reached: false,
        });

        await initRiskEngine();

        const status2 = await getRiskEngineStatus();

        expect(status2.body).to.eql({
          risk_engine_status: 'ENABLED',
          legacy_risk_engine_status: 'NOT_INSTALLED',
          is_max_amount_of_risk_engines_reached: false,
        });
      });
    });
  });
};
