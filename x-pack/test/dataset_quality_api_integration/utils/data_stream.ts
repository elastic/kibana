/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

export async function getDataStreamSettingsOfFirstIndex(es: Client, name: string) {
  const matchingIndexesObj = await es.indices.getSettings({ index: name });
  return Object.values(matchingIndexesObj ?? {})[0]?.settings;
}
