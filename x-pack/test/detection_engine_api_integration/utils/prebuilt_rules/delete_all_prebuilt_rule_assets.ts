/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Remove all prebuilt rule assets from the .kibana index
 * @param es The ElasticSearch handle
 */
export const deleteAllPrebuiltRuleAssets = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:security-rule',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};
