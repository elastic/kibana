/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type {
  RuleLibraryRule,
  RuleLibrarySummary,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { LibraryRuleRow, RuleLibraryGroup, RuleLibraryListItem } from './types';

// Only the libraries that ship with Kibana are grouped as Elastic. A manifest cannot claim a place there.
const getGroup = (builtIn: boolean): RuleLibraryGroup => (builtIn ? 'elastic' : 'custom');

const getIcon = (id: string, builtIn: boolean, ownerType: string | undefined): string => {
  if (id === 'elastic') return 'logoSecurity';
  if (builtIn && ownerType === 'community') return 'users';
  return 'package';
};

export const toRuleLibraryListItem = ({
  id,
  title,
  description,
  provider,
  built_in: builtIn,
  owner_type: ownerType,
  license,
  scope,
  version,
  sync_status: syncStatus,
  synced_at: syncedAt,
  last_error: lastError,
  sync_progress: syncProgress,
  rule_count: ruleCount,
  source_url: sourceUrl,
  branch,
}: RuleLibrarySummary): RuleLibraryListItem => ({
  id,
  group: getGroup(builtIn),
  title,
  description: description ?? '',
  icon: getIcon(id, builtIn, ownerType),
  provider,
  version,
  ruleCount,
  syncStatus: syncStatus ?? 'never_synced',
  syncedAt,
  lastError,
  syncProgress,
  owner: ownerType ?? '',
  license: license ?? '',
  scope,
  sourceUrl: sourceUrl?.replace(/^https?:\/\//, ''),
  branch,
});

export const toLibraryRuleRow = ({
  rule_id: ruleId,
  version,
  library_id: libraryId,
  name,
  description,
  severity,
  risk_score: riskScore,
  tags,
  related_integrations: relatedIntegrations,
  install_state: installState,
  installed_from_library: installedFromLibrary,
}: RuleLibraryRule): LibraryRuleRow => ({
  id: `${libraryId}_${ruleId}`,
  ruleId,
  version,
  libraryId,
  name,
  description,
  integrations: uniqBy(relatedIntegrations, 'package').map(({ package: packageName }) => ({
    packageName,
    title: packageName,
  })),
  tags,
  severity,
  riskScore,
  installState,
  installedFromLibraryTitle: installedFromLibrary?.title,
});
