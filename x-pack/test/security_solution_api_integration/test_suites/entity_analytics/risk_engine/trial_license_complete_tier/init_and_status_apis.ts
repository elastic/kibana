/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/saved_object';

import {
  legacyTransformIds,
  createLegacyTransforms,
  clearLegacyTransforms,
  riskEngineRouteHelpersFactory,
  installLegacyRiskScore,
  getLegacyRiskScoreDashboards,
  clearLegacyDashboards,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const expectTaskIsNotRunning = (taskStatus?: string) => {
  expect(['idle', 'claiming']).contain(taskStatus);
};

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/191637
  describe.skip('@ess @serverless @serverlessQA init_and_status_apis', () => {
    before(async () => {
      await riskEngineRoutes.cleanUp();
    });

    afterEach(async () => {
      await riskEngineRoutes.cleanUp();
      await clearLegacyTransforms({ es, log });
      await clearLegacyDashboards({ supertest, log });
    });

    describe('init api', () => {
      it('should return response with success status', async () => {
        const response = await riskEngineRoutes.init();
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
        const componentTemplateName = '.risk-score-mappings';
        const indexTemplateName = '.risk-score.risk-score-default-index-template';
        const dataStreamName = 'risk-score.risk-score-default';
        const latestIndexName = 'risk-score.risk-score-latest-default';
        const transformId = 'risk_score_latest_transform_default';

        await riskEngineRoutes.init();

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
              ignore_malformed: false,
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
            mapping: {
              total_fields: {
                limit: '1000',
              },
            },
          },
        });

        expect(indexTemplate.index_template.template!.lifecycle).to.eql({
          enabled: true,
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

        expect(dataStream?.settings?.index?.mapping).to.eql({
          total_fields: {
            limit: '1000',
          },
        });

        expect(dataStream?.settings?.index?.hidden).to.eql('true');
        expect(dataStream?.settings?.index?.number_of_shards).to.eql(1);

        const indexExist = await es.indices.exists({
          index: latestIndexName,
        });

        expect(indexExist).to.eql(true);

        const transformStats = await es.transform.getTransformStats({
          transform_id: transformId,
        });

        expect(transformStats.transforms[0].state).to.eql('stopped');
      });

      it('should create configuration saved object', async () => {
        await riskEngineRoutes.init();
        const response = await kibanaServer.savedObjects.find({
          type: riskEngineConfigurationTypeName,
        });

        expect(response?.saved_objects?.[0]?.attributes).to.eql({
          dataViewId: '.alerts-security.alerts-default',
          enabled: true,
          filter: {},
          interval: '1h',
          pageSize: 3500,
          range: {
            end: 'now',
            start: 'now-30d',
          },
        });
      });

      it('should create configuration saved object only once', async () => {
        await riskEngineRoutes.init();
        const firstResponse = await kibanaServer.savedObjects.find({
          type: riskEngineConfigurationTypeName,
        });

        await riskEngineRoutes.init();
        const secondResponse = await kibanaServer.savedObjects.find({
          type: riskEngineConfigurationTypeName,
        });

        expect(secondResponse?.saved_objects?.length).to.eql(1);
        expect(secondResponse?.saved_objects?.[0]?.id).to.eql(
          firstResponse?.saved_objects?.[0]?.id
        );
      });

      describe('remove legacy risk score transform', function () {
        this.tags('skipFIPS');
        it('should remove legacy risk score transform if it exists', async () => {
          await installLegacyRiskScore({ supertest });

          for (const transformId of legacyTransformIds) {
            const tr = await es.transform.getTransform({
              transform_id: transformId,
            });

            expect(tr?.transforms?.[0]?.id).to.eql(transformId);
          }

          const legacyDashboards = await getLegacyRiskScoreDashboards({
            kibanaServer,
          });

          expect(legacyDashboards.length).to.eql(4);

          await riskEngineRoutes.init();

          for (const transformId of legacyTransformIds) {
            try {
              await es.transform.getTransform({
                transform_id: transformId,
              });
            } catch (err) {
              expect(err).to.not.be(undefined);
            }
          }

          const legacyDashboardsAfterInit = await getLegacyRiskScoreDashboards({
            kibanaServer,
          });

          expect(legacyDashboardsAfterInit.length).to.eql(0);
        });
      });
    });

    describe('status api', () => {
      it('should disable / enable risk engine', async () => {
        const status1 = await riskEngineRoutes.getStatus();

        expect(status1.body).to.eql({
          risk_engine_status: 'NOT_INSTALLED',
          legacy_risk_engine_status: 'NOT_INSTALLED',
        });

        await riskEngineRoutes.init();

        const status2 = await riskEngineRoutes.getStatus();

        expect(status2.body.risk_engine_status).to.be('ENABLED');
        expect(status2.body.legacy_risk_engine_status).to.be('NOT_INSTALLED');

        expect(status2.body.risk_engine_task_status?.runAt).to.be.a('string');
        expectTaskIsNotRunning(status2.body.risk_engine_task_status?.status);
        expect(status2.body.risk_engine_task_status?.startedAt).to.be(undefined);

        await riskEngineRoutes.disable();
        const status3 = await riskEngineRoutes.getStatus();

        expect(status3.body).to.eql({
          risk_engine_status: 'DISABLED',
          legacy_risk_engine_status: 'NOT_INSTALLED',
        });

        await riskEngineRoutes.enable();
        const status4 = await riskEngineRoutes.getStatus();

        expect(status4.body.risk_engine_status).to.be('ENABLED');
        expect(status4.body.legacy_risk_engine_status).to.be('NOT_INSTALLED');

        expect(status4.body.risk_engine_task_status?.runAt).to.be.a('string');
        expectTaskIsNotRunning(status4.body.risk_engine_task_status?.status);
        expect(status4.body.risk_engine_task_status?.startedAt).to.be(undefined);
      });

      it('should return status of legacy risk engine', async () => {
        await createLegacyTransforms({ es });
        const status1 = await riskEngineRoutes.getStatus();

        expect(status1.body).to.eql({
          risk_engine_status: 'NOT_INSTALLED',
          legacy_risk_engine_status: 'ENABLED',
        });

        await riskEngineRoutes.init();

        const status2 = await riskEngineRoutes.getStatus();

        expect(status2.body.risk_engine_status).to.be('ENABLED');
        expect(status2.body.legacy_risk_engine_status).to.be('NOT_INSTALLED');

        expect(status2.body.risk_engine_task_status?.runAt).to.be.a('string');
        expectTaskIsNotRunning(status2.body.risk_engine_task_status?.status);
        expect(status2.body.risk_engine_task_status?.startedAt).to.be(undefined);
      });
    });
  });
};
