/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceData } from '../../../../../../../common/siem_migrations/model/common.gen';

interface QradarReferenceSetExportEntry {
  value?: string | number | boolean;
  [key: string]: unknown;
}

interface QradarReferenceSetExport {
  name?: string;
  data?: QradarReferenceSetExportEntry[];
}

export interface ConvertQradarReferenceSetToLookupParams {
  fileContent: string;
  fallbackName: string;
}

/**
 * Converts a QRadar reference set export (JSON) into a lookup resource that the backend
 * understands. Reference sets only expose a single column named `value`.
 */
export const convertQradarReferenceSetToLookup = ({
  fileContent,
  fallbackName,
}: ConvertQradarReferenceSetToLookupParams): SiemMigrationResourceData => {
  const parsed = parseReferenceSet(fileContent);

  const name = parsed.name?.trim() || fallbackName;
  if (!name) {
    throw new Error('Reference set name is missing.');
  }

  const values = extractValues(parsed.data);
  const content = values.length > 0 ? convertToCsv(values) : '';

  return {
    type: 'lookup',
    name,
    content,
  };
};

const parseReferenceSet = (fileContent: string): QradarReferenceSetExport => {
  try {
    const parsed = JSON.parse(fileContent) as QradarReferenceSetExport;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid reference set export.');
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('QRadar reference set export must be valid JSON.');
    }
    throw error;
  }
};

const extractValues = (entries: QradarReferenceSetExportEntry[] | undefined): string[] => {
  if (!entries) {
    return [];
  }
  return entries
    .map((entry) => entry?.value)
    .filter((value): value is string | number | boolean => value !== undefined && value !== null)
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);
};

const convertToCsv = (values: string[]): string => {
  const header = 'value';
  const rows = values.map((value) => escapeCsvValue(value));
  return [header, ...rows].join('\r\n');
};

const escapeCsvValue = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};
