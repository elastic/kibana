/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LanguageDefinitionSnippetArguments } from '@kbn/search-api-panels';

export const ingestKeysToJSON = (
  extraIngestDocumentValues: LanguageDefinitionSnippetArguments['extraIngestDocumentValues']
) =>
  extraIngestDocumentValues
    ? Object.entries(extraIngestDocumentValues).reduce((result, value) => {
        result += `, "${value[0]}": ${value[1]}`;
        return result;
      }, '')
    : '';

export const ingestKeysToPHP = (
  extraIngestDocumentValues: LanguageDefinitionSnippetArguments['extraIngestDocumentValues']
) =>
  extraIngestDocumentValues
    ? Object.entries(extraIngestDocumentValues).reduce((result, value) => {
        result += `\n    '${value[0]}' => ${value[1]},`;
        return result;
      }, '')
    : '';

export const ingestKeysToRuby = (
  extraIngestDocumentValues: LanguageDefinitionSnippetArguments['extraIngestDocumentValues']
) =>
  extraIngestDocumentValues
    ? Object.entries(extraIngestDocumentValues).reduce((result, value) => {
        result += `, ${value[0]}: ${value[1]}`;
        return result;
      }, '')
    : '';
