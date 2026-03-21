/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeInsights } from '../insight_merger';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

describe('mergeInsights', () => {
  const existing: AttackDiscovery[] = [
    {
      title: 'SSH Brute Force',
      summaryMarkdown: 'SSH attack from 1.2.3.4',
      detailsMarkdown: 'Multiple failed attempts',
      alertIds: ['alert-1', 'alert-2'],
    },
  ];

  const newInsights: AttackDiscovery[] = [
    {
      title: 'PowerShell Execution',
      summaryMarkdown: 'Malicious PowerShell',
      detailsMarkdown: 'Encoded commands',
      alertIds: ['alert-3', 'alert-4'],
    },
  ];

  it('should concatenate non-overlapping insights', () => {
    const result = mergeInsights(existing, newInsights, { strategy: 'rule-based' });

    expect(result).toHaveLength(2);
  });

  it('should merge insights with alert ID overlap', () => {
    const overlapping: AttackDiscovery[] = [
      {
        title: 'SSH Brute Force Continued',
        summaryMarkdown: 'Attack continues',
        detailsMarkdown: 'More attempts',
        alertIds: ['alert-2', 'alert-5'],  // alert-2 overlaps!
      },
    ];

    const result = mergeInsights(existing, overlapping, { strategy: 'rule-based' });

    expect(result).toHaveLength(1);  // Merged
    expect(result[0].alertIds).toEqual(['alert-1', 'alert-2', 'alert-5']);
  });

  it('should merge insights with title similarity', () => {
    const similar: AttackDiscovery[] = [
      {
        title: 'SSH Brute Force Attack',  // Similar to "SSH Brute Force"
        summaryMarkdown: 'Related attack',
        detailsMarkdown: 'Details',
        alertIds: ['alert-10'],
      },
    ];

    const result = mergeInsights(existing, similar, {
      strategy: 'rule-based',
      similarityThreshold: 0.7,
    });

    expect(result).toHaveLength(1);  // Merged by title similarity
  });
});
