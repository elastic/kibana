/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Internal Risk Score routes
 */
export const INTERNAL_RISK_SCORE_URL = '/internal/risk_score' as const;
export const PUBLIC_RISK_SCORE_URL = '/api/risk_score' as const;
export const DEV_TOOL_PREBUILT_CONTENT =
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/dev_tool/{console_id}` as const;
export const devToolPrebuiltContentUrl = (spaceId: string, consoleId: string) =>
  `/s/${spaceId}${INTERNAL_RISK_SCORE_URL}/prebuilt_content/dev_tool/${consoleId}` as const;
export const PREBUILT_SAVED_OBJECTS_BULK_CREATE =
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_create/{template_name}` as const;
export const prebuiltSavedObjectsBulkCreateUrl = (templateName: string) =>
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_create/${templateName}` as const;
export const PREBUILT_SAVED_OBJECTS_BULK_DELETE =
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_delete/{template_name}` as const;
export const prebuiltSavedObjectsBulkDeleteUrl = (templateName: string) =>
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_delete/${templateName}` as const;
export const RISK_SCORE_CREATE_INDEX = `${INTERNAL_RISK_SCORE_URL}/indices/create` as const;
export const RISK_SCORE_DELETE_INDICES = `${INTERNAL_RISK_SCORE_URL}/indices/delete` as const;
export const RISK_SCORE_CREATE_STORED_SCRIPT =
  `${INTERNAL_RISK_SCORE_URL}/stored_scripts/create` as const;
export const RISK_SCORE_DELETE_STORED_SCRIPT =
  `${INTERNAL_RISK_SCORE_URL}/stored_scripts/delete` as const;
export const RISK_SCORE_PREVIEW_URL = `${INTERNAL_RISK_SCORE_URL}/preview` as const;
export const RISK_SCORE_ENTITY_CALCULATION_URL =
  `${INTERNAL_RISK_SCORE_URL}/calculation/entity` as const;
