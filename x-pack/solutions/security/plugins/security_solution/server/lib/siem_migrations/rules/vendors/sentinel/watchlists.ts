/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import type { SiemMigrationResourceData } from '../../../../../../common/siem_migrations/model/common.gen';
import {
  SentinelWatchlistResource,
  SentinelWatchlistTemplate,
} from '../../../../../../common/siem_migrations/model/vendor/common/sentinel.gen';

type WatchlistCsvRow = Record<string, string>;

const SUPPORTED_CONTENT_TYPE = 'text/csv';

export const transformSentinelWatchlistResource = (
  resource: SiemMigrationResourceData
): SiemMigrationResourceData => {
  if (resource.type !== 'watchlist') {
    throw new Error(`Unsupported Sentinel resource type: ${resource.type}`);
  }

  const watchlist = parseWatchlistResource(resource.content);
  const { properties } = watchlist;
  const { contentType, itemsSearchKey, rawContent, watchlistAlias } = properties;

  if (contentType && contentType !== SUPPORTED_CONTENT_TYPE) {
    throw new Error(`Unsupported Sentinel watchlist content type: ${contentType}`);
  }

  const rows = parseCsv(rawContent);
  const denormalizedRows = itemsSearchKey ? denormalizeSearchKeyColumn(rows, itemsSearchKey) : rows;

  return {
    type: 'lookup',
    name: watchlistAlias,
    content: JSON.stringify(denormalizedRows),
    metadata: {
      ...resource.metadata,
      itemsSearchKey,
    },
  };
};

const parseWatchlistResource = (content: string): SentinelWatchlistResource => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error('Sentinel watchlist must be valid JSON');
  }

  const result = SentinelWatchlistResource.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  const templateResult = SentinelWatchlistTemplate.safeParse(parsed);
  if (templateResult.success) {
    return templateResult.data.resources[0];
  }

  throw new Error('Invalid Sentinel watchlist resource');
};

const parseCsv = (rawContent: string): WatchlistCsvRow[] => {
  const { data, errors } = Papa.parse<WatchlistCsvRow>(rawContent, {
    delimiter: ',',
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    throw new Error(`Invalid Sentinel watchlist CSV: ${errors[0].message}`);
  }

  return data;
};

const denormalizeSearchKeyColumn = (
  rows: WatchlistCsvRow[],
  itemsSearchKey: string
): WatchlistCsvRow[] => {
  return rows.flatMap((row) => {
    const rawValue = row[itemsSearchKey];
    if (rawValue === undefined) {
      return [row];
    }

    const values = rawValue
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (values.length === 0) {
      return [row];
    }

    return values.map((value) => ({
      ...row,
      [itemsSearchKey]: value,
    }));
  });
};
