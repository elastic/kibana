/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SavedObjectReference } from 'kibana/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Rule } from '@kbn/alerting-plugin/common';

interface RuleSO {
  alert: Rule;
  references: SavedObjectReference[];
}

/**
 * Fetch legacy action sidecar SOs from the .kibana index
 * @param es The ElasticSearch service
 * @param id SO id
 */
export const getRuleSOById = async (es: Client, id: string): Promise<SearchResponse<RuleSO>> =>
  es.search({
    index: '.kibana',
    q: `type:alert AND _id:"alert:${id}"`,
  });
