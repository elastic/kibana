/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import type { SiemMigrationResourceData } from '../../../../../../common/siem_migrations/model/common.gen';
import { initPromisePool } from '../../../../../utils/promise_pool';
import type { SiemMigrationsDataLookupsClient } from '../../../common/data/siem_migrations_data_lookups_client';

interface LookupWithData extends SiemMigrationResourceData {
  data: object[] | null;
}

export const processLookups = async (
  resources: SiemMigrationResourceData[],
  migrationsClient: SiemMigrationsDataLookupsClient
): Promise<SiemMigrationResourceData[]> => {
  const lookupsData: Record<string, LookupWithData> = {};

  resources.forEach((resource) => {
    if (resource.type === 'lookup' && !lookupsData[resource.name]) {
      try {
        lookupsData[resource.name] = { ...resource, data: parseContent(resource.content) };
      } catch (error) {
        throw new Error(`Invalid content for lookup ${resource.name}: ${error.message}`);
      }
    }
  });

  const lookups: SiemMigrationResourceData[] = [];
  const result = await initPromisePool({
    concurrency: 10,
    items: Object.entries(lookupsData),
    executor: async ([name, { data, ...resource }]) => {
      if (!data) {
        lookups.push({ ...resource, content: '' }); // empty content will make lookup be ignored during translation
        return;
      }
      const indexName = await migrationsClient.create(name, data);
      lookups.push({ ...resource, content: indexName }); // lookup will be translated using the index name
    },
  });
  const [error] = result.errors;
  if (error) {
    throw new Error(`Failed to process lookups: ${error.error}`);
  }

  return lookups;
};

const parseContent = (fileContent: string): object[] | null => {
  const trimmedContent = fileContent.trim();
  if (trimmedContent === '') {
    return null;
  }
  let arrayContent: object[];

  if (trimmedContent.startsWith('[')) {
    arrayContent = parseJSONArray(trimmedContent);
  } else if (trimmedContent.startsWith('{')) {
    arrayContent = parseNDJSON(trimmedContent);
  } else {
    arrayContent = parseCSV(trimmedContent);
  }
  return arrayContent;
};

const parseCSV = (fileContent: string): object[] => {
  const config: Papa.ParseConfig = {
    header: true, // If header is false, rows are arrays; otherwise they are objects of data keyed by the field name.
    skipEmptyLines: true,
  };
  const { data, errors } = Papa.parse(fileContent, config);
  if (!data && errors.length > 0) {
    throw new Error('Invalid CSV ');
  }
  return data as object[];
};

const parseNDJSON = (fileContent: string): object[] => {
  return fileContent
    .split(/\n(?=\{)/) // split at newline followed by '{'.
    .filter((entry) => entry.trim() !== '') // Remove empty entries.
    .map(parseJSON); // Parse each entry as JSON.
};

const parseJSONArray = (fileContent: string): object[] => {
  const parsedContent = parseJSON(fileContent);
  if (!Array.isArray(parsedContent)) {
    throw new Error('invalid JSON');
  }
  return parsedContent;
};

const parseJSON = (fileContent: string) => {
  try {
    return JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error('File is too large');
    }
    throw new Error('Invalid JSON');
  }
};
