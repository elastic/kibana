/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extract Markdown fields, transforming {{ field value }} to value
 */
export const getMarkdownFields = (field: string): string => {
  return field.replace(/\{\{\s*[^}]+\s+([^}]+)\s*\}\}/g, '$1');
};
