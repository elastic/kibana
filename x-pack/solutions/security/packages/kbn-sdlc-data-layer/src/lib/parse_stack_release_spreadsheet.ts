/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { ReleaseCalendarEvent } from './release_calendar_types';

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-\w.]*)?$/;

const SKIP_VERSION_VALUES = new Set([
  'previous 6.x releases',
  'stack version',
  'version',
  'this is deprecated. use the',
]);

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export const parseReleaseScheduleDate = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && /^\d+(\.\d+)?$/.test(trimmed)) {
    const date = new Date(EXCEL_EPOCH_MS + Math.round(numeric) * 86_400_000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  const humanMatch = trimmed.match(
    /^(?:\w{3},\s*)?(\w{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i
  );
  if (humanMatch) {
    const monthKey = humanMatch[1].slice(0, 3).toLowerCase();
    const month = MONTHS[monthKey];
    const day = Number(humanMatch[2]);
    const year = humanMatch[3] ? Number(humanMatch[3]) : new Date().getUTCFullYear();
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
    }
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return undefined;
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const normalizeHeader = (value: string): string => value.trim().toLowerCase();

const findColumnIndex = (headers: string[], candidates: string[]): number => {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate);
    if (index >= 0) {
      return index;
    }
  }
  return -1;
};

const inferStackProduct = (version: string): string => 'elastic-stack';

const isSkippableVersion = (version: string): boolean => {
  const normalized = version.trim().toLowerCase();
  if (!normalized || SKIP_VERSION_VALUES.has(normalized)) {
    return true;
  }
  if (normalized.startsWith('previous ')) {
    return true;
  }
  return !VERSION_PATTERN.test(version.trim());
};

export interface ParseStackReleaseSpreadsheetInput {
  readonly csv: string;
  readonly spreadsheetId?: string;
  readonly sheetGid?: string;
  readonly sheetName?: string;
}

export const parseStackReleaseSpreadsheet = ({
  csv,
  spreadsheetId,
  sheetGid,
  sheetName,
}: ParseStackReleaseSpreadsheetInput): ReleaseCalendarEvent[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headerIndex = lines.findIndex((line) => normalizeHeader(parseCsvLine(line)[0] ?? '') === 'version');
  if (headerIndex < 0) {
    return [];
  }

  const headers = parseCsvLine(lines[headerIndex]);
  const versionIndex = findColumnIndex(headers, ['version']);
  const featureFreezeIndex = findColumnIndex(headers, ['feature freeze']);
  const buildCandidateIndex = findColumnIndex(headers, ['build candidate']);
  const publicReleaseIndex = findColumnIndex(headers, ['public release']);
  const releaseManagerIndex = findColumnIndex(headers, ['stack & solutions release manager']);

  if (versionIndex < 0) {
    return [];
  }

  const events: ReleaseCalendarEvent[] = [];

  for (const line of lines.slice(headerIndex + 1)) {
    const columns = parseCsvLine(line);
    const version = columns[versionIndex]?.trim();
    if (!version || isSkippableVersion(version)) {
      continue;
    }

    const releaseManager =
      releaseManagerIndex >= 0 ? columns[releaseManagerIndex]?.trim() || undefined : undefined;
    const product = inferStackProduct(version);
    const sourceBase = {
      type: 'spreadsheet' as const,
      spreadsheetId,
      sheetGid,
      sheetName,
    };

    const milestoneDates: Array<{
      milestone: ReleaseCalendarEvent['milestone'];
      rawDate?: string;
    }> = [
      { milestone: 'feature_freeze', rawDate: columns[featureFreezeIndex] },
      { milestone: 'build_candidate', rawDate: columns[buildCandidateIndex] },
      { milestone: 'public_release', rawDate: columns[publicReleaseIndex] },
    ];

    for (const { milestone, rawDate } of milestoneDates) {
      const targetDate = parseReleaseScheduleDate(rawDate);
      if (!targetDate) {
        continue;
      }

      events.push({
        releaseLine: 'stack',
        product,
        version,
        milestone,
        targetDate,
        status: 'scheduled',
        releaseManager,
        source: sourceBase,
      });
    }
  }

  return events;
};
