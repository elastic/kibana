/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');

  describe('Risk Engine - Install Resources', () => {
    it('should install resources on startup', async () => {
      const ilmPolicyName = '.risk-score-ilm-policy';
      const componentTemplateName = '.risk-score-mappings';
      const indexTemplateName = '.risk-score.risk-score-default-index-template';
      const indexName = 'risk-score.risk-score-default';

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
      expect(indexTemplate.index_template.index_patterns).to.eql(['risk-score.risk-score-default']);
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
        index: indexName,
      });

      const dataStream = Object.values(dsResponse).find((ds) => ds.data_stream === indexName);

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
    });
  });
};
