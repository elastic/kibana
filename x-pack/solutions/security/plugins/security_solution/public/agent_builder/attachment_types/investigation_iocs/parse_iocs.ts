/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InvestigationIoc, InvestigationIocCategory } from './types';
import { INVESTIGATION_IOC_CATEGORIES } from './types';

export const CATEGORY_LABELS: Record<InvestigationIocCategory, string> = {
  shas: i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.category.shas', {
    defaultMessage: 'SHA256',
  }),
  ips: i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.category.ips', {
    defaultMessage: 'IP addresses',
  }),
  file_paths: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.filePaths',
    { defaultMessage: 'File paths' }
  ),
  malicious_commands: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.maliciousCommands',
    { defaultMessage: 'Malicious command lines' }
  ),
  ransom_note: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.ransomNote',
    { defaultMessage: 'Ransom notes' }
  ),
  encryption_marker: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.encryptionMarker',
    { defaultMessage: 'Encryption markers' }
  ),
  compromised_identities: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.compromisedIdentities',
    { defaultMessage: 'Compromised identities' }
  ),
  affected_hosts: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.affectedHosts',
    { defaultMessage: 'Affected hosts' }
  ),
};

/** Compact labels for the summary row, where space is limited. */
export const CATEGORY_SHORT_LABELS: Record<InvestigationIocCategory, string> = {
  shas: i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.shas', {
    defaultMessage: 'SHAs',
  }),
  ips: i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.ips', {
    defaultMessage: 'IPs',
  }),
  file_paths: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.filePaths',
    { defaultMessage: 'File paths' }
  ),
  malicious_commands: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.maliciousCommands',
    { defaultMessage: 'Commands' }
  ),
  ransom_note: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.ransomNote',
    { defaultMessage: 'Ransom notes' }
  ),
  encryption_marker: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.encryptionMarker',
    { defaultMessage: 'Encryption markers' }
  ),
  compromised_identities: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.compromisedIdentities',
    { defaultMessage: 'Identities' }
  ),
  affected_hosts: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.shortCategory.affectedHosts',
    { defaultMessage: 'Hosts' }
  ),
};

export interface IocCategoryRow {
  id: InvestigationIocCategory;
  typeLabel: string;
  shortLabel: string;
  items: InvestigationIoc[];
}

const isIoc = (value: unknown): value is InvestigationIoc => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as { value?: unknown; comment?: unknown };
  if (typeof item.value !== 'string' || item.value === '') {
    return false;
  }
  return item.comment === undefined || typeof item.comment === 'string';
};

const parseIocList = (value: unknown): InvestigationIoc[] =>
  Array.isArray(value) ? value.filter(isIoc) : [];

/** One row per filled category, in attack-reading order, dropping empty and invalid items. */
export const parseIocCategoryRows = (data: unknown): IocCategoryRow[] => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return [];
  }
  const payload = data as Record<string, unknown>;
  return INVESTIGATION_IOC_CATEGORIES.flatMap((category) => {
    const items = parseIocList(payload[category]);
    if (items.length === 0) {
      return [];
    }
    return [
      {
        id: category,
        typeLabel: CATEGORY_LABELS[category],
        shortLabel: CATEGORY_SHORT_LABELS[category],
        items,
      },
    ];
  });
};
