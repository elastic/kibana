/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizedAlert } from '../../../../../common/step_types/shared_schemas';

/**
 * Field name -> raw value (everything after the first comma on the line).
 * Multi-value fields (e.g. `event.category`, `threat.tactic.id`) keep their
 * comma-joined form; use {@link splitMultiValue} to expand them.
 */
export type ParsedAlertFields = Record<string, string>;

/**
 * Parse a single anonymized-alert `page_content` CSV. The format is one
 * `field,value[,value2,...]` per line (see the anonymization layer), so we
 * split on the FIRST comma only and keep the remainder verbatim.
 */
const parsePageContent = (pageContent: string): ParsedAlertFields => {
  const fields: ParsedAlertFields = {};

  for (const line of pageContent.split('\n')) {
    const commaIndex = line.indexOf(',');
    if (commaIndex === -1) {
      continue;
    }
    const field = line.slice(0, commaIndex);
    if (field.length === 0) {
      continue;
    }
    fields[field] = line.slice(commaIndex + 1);
  }

  return fields;
};

/**
 * Build a lookup of parsed alert fields keyed by the real ES `_id` (which is
 * NOT anonymized and matches `discovery.alert_ids`). No ES call: the CSV is
 * already in-hand as a workflow input.
 */
export const parseAnonymizedAlertsCsv = (
  anonymizedAlerts: AnonymizedAlert[]
): Map<string, ParsedAlertFields> => {
  const byId = new Map<string, ParsedAlertFields>();

  for (const alert of anonymizedAlerts) {
    const fields = parsePageContent(alert.page_content ?? '');
    const id = fields._id ?? alert.id;
    if (id != null && id.length > 0) {
      byId.set(id, fields);
    }
  }

  return byId;
};

/**
 * Expand a comma-joined multi-value field into a trimmed, de-duplicated list.
 */
export const splitMultiValue = (value: string | undefined): string[] => {
  if (value == null || value.length === 0) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
};
