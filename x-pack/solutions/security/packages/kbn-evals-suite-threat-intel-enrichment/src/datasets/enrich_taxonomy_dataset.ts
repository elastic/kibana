/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichTaxonomyExample } from '../types';
import { ALL_PACKS } from './packs';

/**
 * Fixture-derived: each pack carries its labelled closed-set categories and
 * regions. Scored by set overlap rather than exact match, since a model may
 * reasonably return a superset or miss a secondary label.
 */
const fixtureDerived: EnrichTaxonomyExample[] = ALL_PACKS.map((pack) => ({
  input: { text: pack.body, title: pack.title, report_id: `pack-${pack.packId}` },
  output: { categories: pack.categories, regions: pack.regions },
  metadata: {
    Title: `enrich_taxonomy: ${pack.packId}`,
    source: 'fixture-derived',
    pack: pack.packId,
  },
}));

/**
 * Authored multi-category example to exercise taxonomy breadth (ransomware +
 * data-breach across two regions) not densely represented by the demo packs.
 */
const authored: EnrichTaxonomyExample[] = [
  {
    input: {
      title: 'Ransomware group exfiltrates and encrypts EU and US hospital networks',
      text:
        'A financially motivated ransomware group breached hospital networks across Germany and the ' +
        'United States, exfiltrating patient records before deploying encryptors. The double-extortion ' +
        'campaign leaked stolen data on a dark-web site to pressure victims into paying. Affected ' +
        'organizations reported disrupted clinical systems and confirmed theft of protected health ' +
        'information. Techniques include T1486 for data encryption and T1567 for exfiltration.',
      report_id: 'authored-ransomware-healthcare',
    },
    output: {
      categories: ['ransomware', 'data-breach'],
      regions: ['north-america', 'europe'],
    },
    metadata: {
      Title: 'enrich_taxonomy: multi-category ransomware + data-breach',
      source: 'authored',
    },
  },
];

export const enrichTaxonomyDataset: EnrichTaxonomyExample[] = [...fixtureDerived, ...authored];
