/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SynonymsSynonymRule } from '@elastic/elasticsearch/lib/api/types';
import { Page, Paginate, pageToPagination } from '../../common/pagination';

export const fetchSynonymsSet = async (
  client: ElasticsearchClient,
  synonymsSetId: string,
  { from, size }: Page
): Promise<Paginate<SynonymsSynonymRule> & { id: string }> => {
  const result = await client.synonyms.getSynonym({
    id: synonymsSetId,
    from,
    size,
  });
  const _meta = pageToPagination({ from, size, total: result.count });
  return { _meta, id: synonymsSetId, data: result.synonyms_set };
};
