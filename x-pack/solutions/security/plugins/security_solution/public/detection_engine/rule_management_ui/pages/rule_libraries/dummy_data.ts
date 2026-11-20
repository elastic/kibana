/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LibraryListPlaceholderRow } from './types';

export const DUMMY_EXCEPTION_LISTS: readonly LibraryListPlaceholderRow[] = [
  {
    id: 'community-internal-ip-ranges',
    libraryId: 'elastic-community',
    name: 'Community: Internal IP Ranges',
    description: 'Internal IP addresses to exclude from detection rule alerts.',
    listId: 'community-internal-ip-ranges',
    type: 'detection',
    itemCount: 1,
    summary:
      'source.ip is one of 192.168.1.1, 192.168.1.2, 192.168.1.3 … 192.168.1.255 (255 values)',
  },
];

export const DUMMY_VALUE_LISTS: readonly LibraryListPlaceholderRow[] = [
  {
    id: 'compromised-ips.txt',
    libraryId: 'elastic-community',
    name: 'Community: Compromised IPs',
    description: 'IP addresses reported as compromised, for use in rule exceptions and queries.',
    listId: 'compromised-ips.txt',
    type: 'ip',
    itemCount: 581,
    preview: [
      '35.88.9.149',
      '35.210.160.35',
      '35.210.9.177',
      '35.206.158.12',
      '124.217.230.149',
      '124.156.205.117',
      '179.43.153.10',
      '116.110.219.8',
      '35.210.75.155',
      '185.197.250.9',
      '27.79.45.215',
      '124.156.202.105',
    ],
  },
];
