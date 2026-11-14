/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StixFrameworkSource } from './types';

export const ENTERPRISE_STIX_SOURCE: StixFrameworkSource = {
  killChainName: 'mitre-attack',
  sourceNames: ['mitre-attack'],
};

export const ATLAS_STIX_SOURCE: StixFrameworkSource = {
  killChainName: 'mitre-atlas',
  sourceNames: ['mitre-atlas'],
};

// The ICS bundle tags its techniques with the 'mitre-ics-attack' kill chain, but the
// canonical external reference is 'mitre-attack' on most objects and 'mitre-ics-attack' on
// the rest; no object carries both.
export const ICS_STIX_SOURCE: StixFrameworkSource = {
  killChainName: 'mitre-ics-attack',
  sourceNames: ['mitre-attack', 'mitre-ics-attack'],
};
