/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMUNITY_LIBRARY_ID, ELASTIC_LIBRARY_ID } from './constants';
import type { RuleLibraryDefinition } from './types';

export const RULE_LIBRARY_DEFINITIONS: readonly RuleLibraryDefinition[] = [
  {
    id: ELASTIC_LIBRARY_ID,
    provider: { type: 'fleet' },
    name: 'security_detection_engine',
    title: 'Prebuilt Security Detection Rules',
    description: 'Prebuilt detection rules maintained by Elastic.',
    license: 'Elastic-2.0',
    owner: { type: 'elastic' },
  },
  {
    id: COMMUNITY_LIBRARY_ID,
    provider: {
      type: 'git',
      url: 'https://github.com/sdesalas/community-rules-library',
      branch: 'main',
      authType: 'none',
    },
    name: 'elastic_community_rules',
    title: 'Elastic Community Rules',
    description: 'Detection rules contributed by the Elastic community.',
    license: 'Elastic-2.0',
    owner: { type: 'community' },
  },
];
