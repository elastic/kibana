/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';

export async function rolloverDataStream(es: Client, name: string) {
  return es.indices.rollover({ alias: name });
}

export async function getDataStreamSettingsOfEarliestIndex(es: Client, name: string) {
  const matchingIndexesObj = await es.indices.getSettings({ index: name });

  const matchingIndexes = Object.keys(matchingIndexesObj ?? {});
  matchingIndexes.sort((a, b) => {
    return (
      Number(matchingIndexesObj[a].settings?.index?.creation_date) -
      Number(matchingIndexesObj[b].settings?.index?.creation_date)
    );
  });

  return matchingIndexesObj[matchingIndexes[0]].settings;
}

function getCurrentDateFormatted() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

export function createBackingIndexNameWithoutVersion({
  type,
  dataset,
  namespace = 'default',
}: {
  type: string;
  dataset: string;
  namespace: string;
}) {
  return `.ds-${type}-${dataset}-${namespace}-${getCurrentDateFormatted()}`;
}

export async function setDataStreamSettings(
  esClient: Client,
  name: string,
  settings: IndicesIndexSettings
) {
  return esClient.indices.putSettings({
    index: name,
    settings,
  });
}
