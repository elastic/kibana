/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MeteringStatsIndex } from '../../types';

export const mockStats: Record<string, MeteringStatsIndex> = {
  '.ds-packetbeat-8.6.1-2023.02.04-000001': {
    uuid: 'x5Uuw4j4QM2YidHLNixCwg',
    num_docs: 1628343,
    size_in_bytes: 731583142,
    name: '.ds-packetbeat-8.6.1-2023.02.04-000001',
  },
  '.ds-packetbeat-8.5.3-2023.02.04-000001': {
    uuid: 'we0vNWm2Q6iz6uHubyHS6Q',
    num_docs: 1630289,
    size_in_bytes: 733175040,
    name: '.ds-packetbeat-8.5.3-2023.02.04-000001',
  },
  'auditbeat-custom-index-1': {
    uuid: 'uyJDDqGrRQqdBTN0mCF-iw',
    num_docs: 4,
    size_in_bytes: 28413,
    name: 'auditbeat-custom-index-1',
  },
};
