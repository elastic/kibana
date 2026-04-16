/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getIndexPattern(namespace: string): string {
  return `logs-azure.auditlogs-${namespace}`;
}

/** Field holding the acting user's UPN (email) in Azure Audit Log documents. */
export const AZURE_AUDITLOGS_ACTOR_UPN_FIELD =
  'azure.auditlogs.properties.initiated_by.user.userPrincipalName';

/** Field holding the first target resource's UPN in Azure Audit Log documents. */
export const AZURE_AUDITLOGS_TARGET_UPN_FIELD =
  'azure.auditlogs.properties.target_resources.0.user_principal_name';

/** Field holding the first target resource's type in Azure Audit Log documents. */
export const AZURE_AUDITLOGS_TARGET_TYPE_FIELD =
  'azure.auditlogs.properties.target_resources.0.type';

/** Field holding the first target resource's display name (used for Device-type targets). */
export const AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD =
  'azure.auditlogs.properties.target_resources.0.display_name';
