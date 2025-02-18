/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/saved_object';

import { riskEngineRouteHelpersFactory } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const expectTaskIsNotRunning = (taskStatus?: string) => {
  expect(['idle', 'claiming']).contain(taskStatus);
};

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  const customSpaceName = 'ea-customspace-it';
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const riskEngineRoutesWithNamespace = riskEngineRouteHelpersFactory(supertest, customSpaceName);

  describe('@ess @serverless @serverlessQA init_and_status_apis', () => {
    before(async () => {
      await spaces.create({
        id: customSpaceName,
        name: customSpaceName,
        description: 'Space for ${customSpaceName}',
        disabledFeatures: [],
      });
      await riskEngineRoutes.cleanUp();
      await riskEngineRoutesWithNamespace.cleanUp();
    });

    afterEach(async () => {
      await riskEngineRoutes.cleanUp();
      await riskEngineRoutesWithNamespace.cleanUp();
      await spaces.delete(customSpaceName);
    });

    describe('init api', () => {
      it('should return response with success status', async () => {
        const response = await riskEngineRoutes.init();
        expect(response.body).to.eql({
          result: {
            errors: [],
            risk_engine_configuration_created: true,
            risk_engine_enabled: true,
            risk_engine_resources_installed: true,
          },
        });

        const customNamespaceResponse = await riskEngineRoutesWithNamespace.init();
        expect(customNamespaceResponse.body).to.eql({
          result: {
            errors: [],
            risk_engine_configuration_created: true,
            risk_engine_enabled: true,
            risk_engine_resources_installed: true,
          },
        });
      });

      it('should install resources on init call in the default namespace', async () => {
        const componentTemplateName = '.risk-score-mappings-default';
        const indexTemplateName = '.risk-score.risk-score-default-index-template';
        const dataStreamName = 'risk-score.risk-score-default';
        const latestIndexName = 'risk-score.risk-score-latest-default';
        const transformId = 'risk_score_latest_transform_default';
        const defaultPipeline =
          'entity_analytics_create_eventIngest_from_timestamp-pipeline-default';

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
            event: {
              properties: {
                ingested: {
                  type: 'date',
                },
              },
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
            service: {
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
                    inputs: {
                      properties: {
                        category: {
                          type: 'keyword',
                        },
                        description: {
                          type: 'keyword',
                        },
                        id: {
                          type: 'keyword',
                        },
                        index: {
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
                    notes: {
                      type: 'keyword',
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
        expect(indexTemplate.index_template.composed_of).to.eql(['.risk-score-mappings-default']);
        expect(indexTemplate.index_template.template!.mappings?.dynamic).to.eql(false);
        expect(indexTemplate.index_template.template!.mappings?._meta?.managed).to.eql(true);
        expect(indexTemplate.index_template.template!.mappings?._meta?.namespace).to.eql('default');
        expect(indexTemplate.index_template.template!.mappings?._meta?.kibana?.version).to.be.a(
          'string'
        );

        expect(indexTemplate.index_template.template!.settings).to.eql({
          index: {
            default_pipeline: defaultPipeline,
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

      it('should install resources on init call in the custom namespace', async () => {
        const componentTemplateName = `.risk-score-mappings-${customSpaceName}`;
        const indexTemplateName = `.risk-score.risk-score-${customSpaceName}-index-template`;
        const dataStreamName = `risk-score.risk-score-${customSpaceName}`;
        const latestIndexName = `risk-score.risk-score-latest-${customSpaceName}`;
        const transformId = `risk_score_latest_transform_${customSpaceName}`;
        const defaultPipeline = `entity_analytics_create_eventIngest_from_timestamp-pipeline-${customSpaceName}`;

        await riskEngineRoutesWithNamespace.init();

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
            event: {
              properties: {
                ingested: {
                  type: 'date',
                },
              },
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
            service: {
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
                    inputs: {
                      properties: {
                        category: {
                          type: 'keyword',
                        },
                        description: {
                          type: 'keyword',
                        },
                        id: {
                          type: 'keyword',
                        },
                        index: {
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
                    notes: {
                      type: 'keyword',
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
          `risk-score.risk-score-${customSpaceName}`,
        ]);
        expect(indexTemplate.index_template.composed_of).to.eql([
          `.risk-score-mappings-${customSpaceName}`,
        ]);
        expect(indexTemplate.index_template.template!.mappings?.dynamic).to.eql(false);
        expect(indexTemplate.index_template.template!.mappings?._meta?.managed).to.eql(true);
        expect(indexTemplate.index_template.template!.mappings?._meta?.namespace).to.eql(
          customSpaceName
        );
        expect(indexTemplate.index_template.template!.mappings?._meta?.kibana?.version).to.be.a(
          'string'
        );

        expect(indexTemplate.index_template.template!.settings).to.eql({
          index: {
            default_pipeline: defaultPipeline,
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
        expect(dataStream?.mappings?._meta?.namespace).to.eql(customSpaceName);
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
          _meta: {
            mappingsVersion: 3,
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

      it('should update the existing component template and index template without any errors', async () => {
        const componentTemplateName = '.risk-score-mappings';
        const indexTemplateName = '.risk-score.risk-score-default-index-template';
        const newComponentTemplateName = '.risk-score-mappings-default';

        // Call API to put the component template and index template

        await es.cluster.putComponentTemplate({
          name: componentTemplateName,
          body: {
            template: {
              settings: {
                number_of_shards: 1,
              },
              mappings: {
                properties: {
                  timestamp: {
                    type: 'date',
                  },
                  user: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'text',
                      },
                    },
                  },
                },
              },
            },
            version: 1,
          },
        });

        // Call an API to put the index template

        await es.indices.putIndexTemplate({
          name: indexTemplateName,
          body: {
            index_patterns: [indexTemplateName],
            composed_of: [componentTemplateName],
            template: {
              settings: {
                number_of_shards: 1,
              },
              mappings: {
                properties: {
                  timestamp: {
                    type: 'date',
                  },
                  user: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'text',
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const response = await riskEngineRoutes.init();
        expect(response.status).to.eql(200);
        expect(response.body.result.errors).to.eql([]);

        const response2 = await es.cluster.getComponentTemplate({
          name: newComponentTemplateName,
        });
        expect(response2.component_templates.length).to.eql(1);
        expect(response2.component_templates[0].name).to.eql(newComponentTemplateName);
      });
    });

    describe('status api', () => {
      it('should disable / enable risk engine', async () => {
        const status1 = await riskEngineRoutes.getStatus();

        expect(status1.body).to.eql({
          risk_engine_status: 'NOT_INSTALLED',
        });

        await riskEngineRoutes.init();

        const status2 = await riskEngineRoutes.getStatus();

        expect(status2.body.risk_engine_status).to.be('ENABLED');

        expect(status2.body.risk_engine_task_status?.runAt).to.be.a('string');
        expectTaskIsNotRunning(status2.body.risk_engine_task_status?.status);
        expect(status2.body.risk_engine_task_status?.startedAt).to.be(undefined);

        await riskEngineRoutes.disable();
        const status3 = await riskEngineRoutes.getStatus();

        expect(status3.body).to.eql({
          risk_engine_status: 'DISABLED',
        });

        await riskEngineRoutes.enable();
        const status4 = await riskEngineRoutes.getStatus();

        expect(status4.body.risk_engine_status).to.be('ENABLED');

        expect(status4.body.risk_engine_task_status?.runAt).to.be.a('string');
        expectTaskIsNotRunning(status4.body.risk_engine_task_status?.status);
        expect(status4.body.risk_engine_task_status?.startedAt).to.be(undefined);
      });
    });
  });
};
