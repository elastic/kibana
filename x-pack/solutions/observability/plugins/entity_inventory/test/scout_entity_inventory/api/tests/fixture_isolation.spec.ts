/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, K8S_FIXTURE_DATA_STREAM_TEMPLATES } from '../fixtures';

apiTest.describe(
  'k8s_deployment archive templates',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('are named for Scout and match only their own fixture stream', async ({ esClient }) => {
      for (const [dataStream, name] of Object.entries(K8S_FIXTURE_DATA_STREAM_TEMPLATES)) {
        const { index_templates: templates } = await esClient.indices.getIndexTemplate({ name });

        expect(templates).toHaveLength(1);
        expect(templates[0].index_template.index_patterns).toStrictEqual([dataStream]);
      }
    });

    apiTest('leave no template under an integration name', async ({ esClient }) => {
      const { index_templates: templates } = await esClient.indices.getIndexTemplate({
        name: 'metrics-kubernetes.state_*',
      });

      // A Fleet integration template may exist on a shared cluster; the archive must not be its source.
      for (const { index_template: template } of templates) {
        expect(template.index_patterns).not.toContain('metrics-kubernetes.state_container-default');
        expect(template.index_patterns).not.toContain(
          'metrics-kubernetes.state_deployment-default'
        );
      }
    });
  }
);
