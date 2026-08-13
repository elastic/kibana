/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedField } from '../types';

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
  operator: ':',
  value: fieldValue,
});
