/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleLibraryAttributes } from '@kbn/security-rule-libraries';
import type { RuleLibraryConnection } from '../../../../../../common/api/detection_engine/prebuilt_rules';

// Library settings from the request, in the shape the providers read. Nothing here is saved.
export const toLibraryAttributes = ({
  provider: { type, url, branch, region, auth_type: authType, username, known_hosts: knownHosts },
}: RuleLibraryConnection): RuleLibraryAttributes['provider'] => ({
  type,
  url,
  ...(branch ? { branch } : {}),
  ...(region ? { region } : {}),
  authType,
  ...(username ? { username } : {}),
  ...(knownHosts ? { known_hosts: knownHosts } : {}),
});
