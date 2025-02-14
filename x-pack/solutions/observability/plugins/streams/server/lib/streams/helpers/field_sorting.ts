/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition } from '@kbn/streams-schema';
import { otelPrefixes } from '../component_templates/otel_layer';

/**
 * Takes a map of fields and returns a sorted array of field names.
 * The sorting sorts fields alphabetically, but puts fields with otelPrefixes at the end in the order of the
 * prefixes array.
 */
export function getSortedFields(fields: FieldDefinition) {
  return Object.entries(fields).sort(([a], [b]) => {
    const aPrefixIndex = otelPrefixes.findIndex((prefix) => a.startsWith(prefix));
    const bPrefixIndex = otelPrefixes.findIndex((prefix) => b.startsWith(prefix));

    if (aPrefixIndex !== -1 && bPrefixIndex === -1) {
      return 1;
    }
    if (aPrefixIndex === -1 && bPrefixIndex !== -1) {
      return -1;
    }
    if (aPrefixIndex !== -1 && bPrefixIndex !== -1) {
      return aPrefixIndex - bPrefixIndex;
    }
    return a.localeCompare(b);
  });
}
