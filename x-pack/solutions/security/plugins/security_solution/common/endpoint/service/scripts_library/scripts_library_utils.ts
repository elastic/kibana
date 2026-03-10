/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';

/**
 * List of fields that can be used in KQL and their associated mapping in the SO type
 */
export const KUERY_FIELD_TO_SO_FIELD_MAP = Object.freeze({
  id: 'id',
  name: 'name',
  platform: 'platform',
  requiresInput: 'requires_input',
  description: 'description',
  instructions: 'instructions',
  example: 'example',
  pathToExecutable: 'path_to_executable',
  tags: 'tags',
  createdBy: 'created_by',
  createdAt: 'created_at',
  updatedBy: 'updated_by',
  updatedAt: 'updated_at',
  fileId: 'file_id',
  fileName: 'file_name',
  fileSize: 'file_size',
  fileHash: 'file_hash_sha256',
});

interface ScriptsLibraryKqlFilterValidationResult {
  isValid: boolean;
  error?: string;
}

export const isScriptsLibraryKqlFilterValid = (
  kuery: string
): ScriptsLibraryKqlFilterValidationResult => {
  const response: ScriptsLibraryKqlFilterValidationResult = { isValid: true, error: undefined };

  if (!kuery.trim()) {
    return response;
  }

  const allowedFields = Object.keys(KUERY_FIELD_TO_SO_FIELD_MAP);
  const fields = esKuery.getKqlFieldNamesFromExpression(kuery);

  for (const field of fields) {
    if (!allowedFields.includes(field as keyof typeof KUERY_FIELD_TO_SO_FIELD_MAP)) {
      response.isValid = false;
      response.error = `Invalid KQL filter field: ${field}`;

      return response;
    }
  }

  return response;
};
