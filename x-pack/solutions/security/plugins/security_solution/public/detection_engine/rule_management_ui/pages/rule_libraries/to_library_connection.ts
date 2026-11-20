/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateRuleLibraryRequestBody,
  RuleLibraryConnection,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { NewRuleLibraryInput } from './types';

// The connection settings of the form, as the routes take them.
export const toLibraryConnection = ({
  source,
  url,
  branch,
  region,
  authType,
  username,
  secret,
  knownHosts,
  pinnedVersion,
}: NewRuleLibraryInput): RuleLibraryConnection => ({
  provider: {
    type: source === 's3' ? 's3' : 'git',
    url: url.trim(),
    ...(branch ? { branch } : {}),
    ...(source === 's3' && region ? { region } : {}),
    auth_type: authType,
    ...(username ? { username } : {}),
    ...(knownHosts ? { known_hosts: knownHosts } : {}),
  },
  ...(secret ? { secret } : {}),
  ...(pinnedVersion ? { pinned_version: pinnedVersion } : {}),
});

export const toCreateLibraryRequest = (
  input: NewRuleLibraryInput
): CreateRuleLibraryRequestBody => ({
  ...toLibraryConnection(input),
  scope: input.scope,
});
