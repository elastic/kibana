/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnonymizedAlert } from '../types';

export interface ParsedAlert {
  id: string;
  /** Field name to its values, split on commas the way the product joins them. */
  fields: Readonly<Record<string, readonly string[]>>;
}

/** Parses the product `field,value` CSV back into a field map. */
export const parseAlertCsv = (pageContent: string): ParsedAlert => {
  const fields: Record<string, string[]> = {};
  for (const line of pageContent.split('\n')) {
    const comma = line.indexOf(',');
    if (comma > 0) {
      fields[line.slice(0, comma)] = line.slice(comma + 1).split(',');
    }
  }
  return { id: fields._id?.[0] ?? '', fields };
};

export const parseAlerts = (alerts: ReadonlyArray<AnonymizedAlert>): ParsedAlert[] =>
  alerts.map(({ pageContent }) => parseAlertCsv(pageContent));

const normalize = (value: string): string => value.trim().toLowerCase();

export const alertHasValue = (alert: ParsedAlert, field: string, value: string): boolean =>
  alert.fields[field]?.some((candidate) => normalize(candidate) === normalize(value)) ?? false;
