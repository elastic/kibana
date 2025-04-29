/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Retrieves the latest version of index template
 * There are can be multiple index templates across different Kibana spaces,
 * so we get them all and return the latest(greatest) number
 */
export const getLatestIndexTemplateVersion = async ({
  esClient,
  name,
}: {
  esClient: ElasticsearchClient;
  name: string;
}): Promise<number> => {
  let latestTemplateVersion: number;
  try {
    const response = await esClient.indices.getIndexTemplate({ name });
    const versions = response.index_templates.map(
      (template) => template.index_template.version ?? 0
    );

    latestTemplateVersion = versions.length ? Math.max(...versions) : 0;
  } catch (e) {
    latestTemplateVersion = 0;
  }

  return latestTemplateVersion;
};
