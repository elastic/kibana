/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchSearchItems } from './match_search_items';

const items = [
  { id: 'nginx', name: 'nginx', title: 'Nginx', description: 'Web server logs and metrics.' },
  { id: 'redis', name: 'redis', title: 'Redis', description: 'Key-value store.' },
  {
    id: 'aws_ec2',
    name: 'aws_ec2',
    title: 'AWS EC2',
    description: 'Compute instances on Amazon Web Services.',
  },
];

describe('matchSearchItems', () => {
  it('matches on name', () => {
    expect(matchSearchItems(items, 'redis')).toEqual([items[1]]);
  });

  it('matches token prefixes like Fleet useLocalSearch', () => {
    expect(matchSearchItems(items, 'ngi')).toEqual([items[0]]);
  });

  it('is case-insensitive', () => {
    expect(matchSearchItems(items, 'NGINX')).toEqual([items[0]]);
  });

  it('requires every token to match (multi-token AND)', () => {
    expect(matchSearchItems(items, 'amazon services')).toEqual([items[2]]);
    expect(matchSearchItems(items, 'amazon nginx')).toEqual([]);
  });

  it('does not match mid-word fragments', () => {
    expect(matchSearchItems(items, 'maz')).toEqual([]);
  });

  it('preserves input order for multiple matches', () => {
    // 'web' prefix-matches a description token of nginx and of aws_ec2
    expect(matchSearchItems(items, 'web')).toEqual([items[0], items[2]]);
  });

  it('returns all items for an empty or whitespace term', () => {
    expect(matchSearchItems(items, '')).toEqual(items);
    expect(matchSearchItems(items, '   ')).toEqual(items);
  });

  it('handles items without a description', () => {
    const noDescription = [{ id: 'docker', name: 'docker', title: 'Docker' }];
    expect(matchSearchItems(noDescription, 'docker')).toEqual(noDescription);
    expect(matchSearchItems(noDescription, 'container')).toEqual([]);
  });
});
