/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import Papa from 'papaparse';
import { isEmpty, toLower, trim } from 'lodash';
import { ALL_ENTITY_TYPES, EntityType } from '@kbn/entity-store/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ENGINE_METADATA_TYPE_FIELD } from '@kbn/entity-store/server';
import type { HapiReadableStream } from '../../../../../types';
import { REQUIRED_CSV_HEADERS, TYPE_HEADER } from './constants';

export const createCsvStream = (fileStream: HapiReadableStream) =>
  fileStream.pipe(
    Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      transformHeader: (header) => toLower(trim(header)),
      transform: (value) => (typeof value === 'string' ? trim(value) : value),
    })
  );

export const validateCsvHeader = (header: string[]): void => {
  const missing = REQUIRED_CSV_HEADERS.filter((required) => !header.includes(required));
  if (missing.length > 0) {
    throw Boom.badRequest(`CSV header is missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Validates and extracts the entity type from a CSV row.
 * Throws if the type is missing or not a valid EntityType.
 */
export const parseEntityType = (row: Record<string, unknown>): EntityType => {
  const raw = row[TYPE_HEADER];
  const type = typeof raw === 'string' ? toLower(raw) : raw;

  if (!EntityType.safeParse(type).success) {
    throw new Error(
      `Invalid entity type: "${type}". Must be one of: ${ALL_ENTITY_TYPES.join(', ')}`
    );
  }
  return type as EntityType;
};

/**
 * Builds ES term query filters from the non-required CSV columns,
 * plus a type filter on the entity engine metadata field.
 */
export const buildEntityFilters = (
  row: Record<string, unknown>,
  type: EntityType
): QueryDslQueryContainer[] => {
  const identityFilters = Object.entries(row)
    .filter(([field, value]) => !REQUIRED_CSV_HEADERS.includes(field) && !isEmpty(value))
    .map(([field, value]) => {
      if (typeof value !== 'string') {
        throw new Error(`Invalid value for field "${field}": must be a non-empty string`);
      }
      return { term: { [field]: value as string } } satisfies QueryDslQueryContainer;
    });

  if (identityFilters.length === 0) {
    throw new Error('Row has no identifying fields');
  }

  return [
    ...identityFilters,
    { term: { [ENGINE_METADATA_TYPE_FIELD]: type } } satisfies QueryDslQueryContainer,
  ];
};
