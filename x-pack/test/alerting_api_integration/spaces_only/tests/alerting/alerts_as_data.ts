/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap } from '@kbn/alerting-plugin/common/alert_schema';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common/alert_schema/field_maps/mapping_from_field_map';
import expect from '@kbn/expect';
import { Space } from '@kbn/spaces-plugin/common';
import { getTestRuleData, getUrlPrefix } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertsAsDataTest({ getService }: FtrProviderContext, space: Space) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const commonFrameworkMappings = mappingFromFieldMap(alertFieldMap, 'strict');

  describe('alerts as data', () => {
    it('should install common alerts as data resources on startup', async () => {
      const ilmPolicyName = 'alerts-default-ilm-policy';
      const componentTemplateName = 'alerts-common-component-template';

      const commonIlmPolicy = await es.ilm.getLifecycle({
        name: ilmPolicyName,
      });

      expect(commonIlmPolicy[ilmPolicyName].policy).to.eql({
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

      const { component_templates: componentTemplates } = await es.cluster.getComponentTemplate({
        name: componentTemplateName,
      });

      expect(componentTemplates.length).to.eql(1);
      const commonComponentTemplate = componentTemplates[0];

      expect(commonComponentTemplate.name).to.eql(componentTemplateName);
      expect(commonComponentTemplate.component_template.template.mappings).to.eql(
        commonFrameworkMappings
      );
      expect(commonComponentTemplate.component_template.template.settings).to.eql({
        index: {
          number_of_shards: 1,
          mapping: {
            total_fields: {
              limit: 100,
            },
          },
        },
      });
    });

    it('should install context specific alerts as data resources on startup', async () => {
      const componentTemplateName = 'alerts-test.patternFiring-component-template';
      const indexTemplateName = '.alerts-test.patternFiring-default-template';
      const indexName = '.alerts-test.patternFiring-default-000001';
      const contextSpecificMappings = {
        patternIndex: {
          type: 'long',
        },
        instancePattern: {
          type: 'boolean',
        },
      };

      const { component_templates: componentTemplates } = await es.cluster.getComponentTemplate({
        name: componentTemplateName,
      });
      expect(componentTemplates.length).to.eql(1);
      const contextComponentTemplate = componentTemplates[0];
      expect(contextComponentTemplate.name).to.eql(componentTemplateName);
      expect(contextComponentTemplate.component_template.template.mappings).to.eql({
        dynamic: 'strict',
        properties: contextSpecificMappings,
      });
      expect(contextComponentTemplate.component_template.template.settings).to.eql({
        index: {
          number_of_shards: 1,
          mapping: {
            total_fields: {
              limit: 100,
            },
          },
        },
      });

      const { index_templates: indexTemplates } = await es.indices.getIndexTemplate({
        name: indexTemplateName,
      });
      expect(indexTemplates.length).to.eql(1);
      const contextIndexTemplate = indexTemplates[0];
      expect(contextIndexTemplate.name).to.eql(indexTemplateName);
      expect(contextIndexTemplate.index_template.index_patterns).to.eql([
        '.alerts-test.patternFiring-default-*',
      ]);
      expect(contextIndexTemplate.index_template.composed_of).to.eql([
        'alerts-common-component-template',
        'alerts-test.patternFiring-component-template',
      ]);
      expect(contextIndexTemplate.index_template.template!.mappings).to.eql({
        dynamic: false,
      });
      expect(contextIndexTemplate.index_template.template!.settings).to.eql({
        index: {
          lifecycle: {
            name: 'alerts-default-ilm-policy',
            rollover_alias: '.alerts-test.patternFiring-default',
          },
          mapping: {
            total_fields: {
              limit: '2500',
            },
          },
          hidden: 'true',
          auto_expand_replicas: '0-1',
        },
      });

      const contextIndex = await es.indices.get({
        index: indexName,
      });

      expect(contextIndex[indexName].aliases).to.eql({
        '.alerts-test.patternFiring-default': {
          is_write_index: true,
        },
      });

      expect(contextIndex[indexName].mappings).to.eql({
        dynamic: 'false',
        properties: {
          ...contextSpecificMappings,
          ...commonFrameworkMappings.properties,
        },
      });

      expect(contextIndex[indexName].settings?.index?.lifecycle).to.eql({
        name: 'alerts-default-ilm-policy',
        rollover_alias: '.alerts-test.patternFiring-default',
      });

      expect(contextIndex[indexName].settings?.index?.mapping).to.eql({
        total_fields: {
          limit: '2500',
        },
      });

      expect(contextIndex[indexName].settings?.index?.hidden).to.eql('true');
      expect(contextIndex[indexName].settings?.index?.number_of_shards).to.eql(1);
      expect(contextIndex[indexName].settings?.index?.auto_expand_replicas).to.eql('0-1');
      expect(contextIndex[indexName].settings?.index?.provided_name).to.eql(
        '.alerts-test.patternFiring-default-000001'
      );
    });

    it('should write alert docs during rule execution', async () => {
      const pattern = {
        alertA: [true, true, true], // stays active across executions
        alertB: [true, false, false], // active then recovers
        alertC: [true, false, true], // active twice
      };
      const createdRule = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '1h' },
            throttle: null,
            params: {
              pattern,
            },
            actions: [],
          })
        );
    });
  });
}
