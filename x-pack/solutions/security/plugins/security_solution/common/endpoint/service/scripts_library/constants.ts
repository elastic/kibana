/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SortableScriptLibraryFields } from '../../types';

/**
 * List of Tags that can be used with scripts
 */
export const SCRIPT_TAGS = Object.freeze({
  remediationAction: i18n.translate(
    'xpack.securitySolution.scriptsLibrary.tags.remediationAction',
    { defaultMessage: 'Remediation Action' }
  ),
  dataCollection: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.dataCollection', {
    defaultMessage: 'Data Collection',
  }),
  networkDiagnostics: i18n.translate(
    'xpack.securitySolution.scriptsLibrary.tags.networkDiagnostics',
    { defaultMessage: 'Network Diagnostics' }
  ),
  networkAction: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.networkAction', {
    defaultMessage: 'Network Action',
  }),
  systemInventory: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.systemInventory', {
    defaultMessage: 'System Inventory',
  }),
  forensicCollection: i18n.translate(
    'xpack.securitySolution.scriptsLibrary.tags.forensicCollection',
    { defaultMessage: 'Forensic Collection' }
  ),
  threatHunting: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.threatHunting', {
    defaultMessage: 'Threat Hunting',
  }),
  discovery: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.discovery', {
    defaultMessage: 'Discovery',
  }),
  systemManagement: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.systemManagement', {
    defaultMessage: 'System Management',
  }),
  userManagement: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.userManagement', {
    defaultMessage: 'User Management',
  }),
  troubleshooting: i18n.translate('xpack.securitySolution.scriptsLibrary.tags.troubleshooting', {
    defaultMessage: 'Troubleshooting',
  }),
});

export type ScriptTagKey = keyof typeof SCRIPT_TAGS;
export const SORTED_SCRIPT_TAGS_KEYS = Object.freeze(
  Object.keys(SCRIPT_TAGS).sort() as ScriptTagKey[]
);

export const SCRIPT_LIBRARY_SORTABLE_FIELDS: readonly SortableScriptLibraryFields[] = Object.freeze(
  ['name', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'fileSize']
);
