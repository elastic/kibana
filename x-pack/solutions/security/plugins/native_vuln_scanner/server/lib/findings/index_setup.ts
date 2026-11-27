/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { FINDINGS_ALIAS, FINDINGS_INDEX, FINDINGS_INDEX_TEMPLATE } from './constants';
import { findingsMappings } from './mappings';

/**
 * Searches through the alias never see fixed findings. The CNVM UI knows nothing about
 * finding state and would otherwise list a fixed CVE as open until it ages out of its
 * 90-day `@timestamp` window. The scanner itself reads the concrete index and sees everything.
 */
export const OPEN_FINDINGS_FILTER: QueryDslQueryContainer = {
  bool: { must_not: [{ term: { 'native_vuln_scanner.state': 'fixed' } }] },
};

const aliases = { [FINDINGS_ALIAS]: { filter: OPEN_FINDINGS_FILTER, is_write_index: true } };

const isAlreadyExists = (error: unknown): boolean =>
  (error as { body?: { error?: { type?: string } } })?.body?.error?.type ===
  'resource_already_exists_exception';

/** Installs the template, then creates the versioned index or updates its mapping and alias. */
export const ensureFindingsIndex = async (es: ElasticsearchClient): Promise<void> => {
  await es.indices.putIndexTemplate({
    name: FINDINGS_INDEX_TEMPLATE,
    index_patterns: [`${FINDINGS_ALIAS}-*`],
    priority: 500,
    template: {
      mappings: findingsMappings,
      aliases,
    },
    _meta: { managed: true, managed_by: 'native_vuln_scanner' },
  });

  try {
    await es.indices.create({ index: FINDINGS_INDEX });
    return;
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }
  await es.indices.putMapping({ index: FINDINGS_INDEX, ...findingsMappings });
  await es.indices.putAlias({
    index: FINDINGS_INDEX,
    name: FINDINGS_ALIAS,
    ...aliases[FINDINGS_ALIAS],
  });
};
