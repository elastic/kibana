/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { IndicesIndexTemplate } from '@elastic/elasticsearch/lib/api/types';

export async function addIntegrationToLogIndexTemplate({
  esClient,
  name,
  managedBy = 'fleet',
}: {
  esClient: Client;
  name: string;
  managedBy?: string;
}) {
  const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate({
    name: 'logs',
  });

  // Remove properties from the GET response that cannot be in the PUT request
  const {
    created_date: createdDate,
    modification_date: modificationDate,
    created_date_millis: createdDateMillis,
    modified_date_millis: modifiedDateMillis,
    ...safeTemplate
  } = indexTemplates[0].index_template as IndicesIndexTemplate & {
    created_date: number;
    created_date_millis: number;
    modification_date: number;
    modified_date_millis: number;
  };

  await esClient.indices.putIndexTemplate({
    name: 'logs',
    ...safeTemplate,
    _meta: {
      ...safeTemplate._meta,
      package: {
        name,
      },
      managed_by: managedBy,
    },
    // PUT expects string[] while GET might return string | string[]
    ignore_missing_component_templates: safeTemplate.ignore_missing_component_templates
      ? [safeTemplate.ignore_missing_component_templates].flat()
      : undefined,
  });
}

export async function cleanLogIndexTemplate({ esClient }: { esClient: Client }) {
  const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate({
    name: 'logs',
  });

  // Remove properties from the GET response that cannot be in the PUT request
  const {
    created_date: createdDate,
    modification_date: modificationDate,
    created_date_millis: createdDateMillis,
    modified_date_millis: modifiedDateMillis,
    ...safeTemplate
  } = indexTemplates[0].index_template as IndicesIndexTemplate & {
    created_date: number;
    created_date_millis: number;
    modification_date: number;
    modified_date_millis: number;
  };

  await esClient.indices.putIndexTemplate({
    name: 'logs',
    ...safeTemplate,
    _meta: {
      ...safeTemplate._meta,
      package: undefined,
      managed_by: undefined,
    },
    // PUT expects string[] while GET might return string | string[]
    ignore_missing_component_templates: safeTemplate.ignore_missing_component_templates
      ? [safeTemplate.ignore_missing_component_templates].flat()
      : undefined,
  });
}
