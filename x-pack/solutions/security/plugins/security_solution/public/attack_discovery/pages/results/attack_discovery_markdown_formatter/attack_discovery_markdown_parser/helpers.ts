/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedField } from '../types';

const iconLookup: Record<string, string> = {
  'host.name': 'desktop',
  'user.name': 'user',
  'process.name': 'gear',
  'file.name': 'document',
  'network.name': 'globe',
  'source.ip': 'globe',
  'destination.ip': 'globe',
  'user.id': 'user',
  'process.pid': 'gear',
  'file.path': 'document',
  'network.ip': 'globe',
  'source.port': 'globe',
  'destination.port': 'globe',
};

export const getIconFromFieldName = (fieldName: string): string => {
  return iconLookup[fieldName] || '';
};

/**
 * Matches every `{{ fieldName value }}` token in a string.
 * Capture group 1 = field name, capture group 2 = field value.
 */
export const FIELD_TOKEN_REGEX = /\{\{\s*(\S+)\s+(.*?)\s*\}\}/g;

/**
 * Constructs a `ParsedField` from the two capture groups of `FIELD_TOKEN_REGEX`.
 */
export const parseFieldToken = (fieldName: string, fieldValue: string): ParsedField => ({
  name: fieldName,
  icon: getIconFromFieldName(fieldName),
  operator: ':',
  value: fieldValue,
});
