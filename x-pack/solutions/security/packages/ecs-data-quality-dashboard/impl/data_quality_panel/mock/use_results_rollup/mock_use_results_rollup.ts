/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { auditbeatWithAllResults } from '../pattern_rollup/mock_auditbeat_pattern_rollup';

export const mockUseResultsRollup = {
  onCheckCompleted: jest.fn(),
  patternIndexNames: {
    'auditbeat-*': [
      '.ds-auditbeat-8.6.1-2023.02.07-000001',
      'auditbeat-custom-index-1',
      'auditbeat-custom-empty-index-1',
    ],
  },
  patternRollups: {
    'auditbeat-*': auditbeatWithAllResults,
  },
  totalDocsCount: 19127,
  totalIncompatible: 4,
  totalIndices: 3,
  totalIndicesChecked: 3,
  totalSameFamily: 0,
  totalSizeInBytes: 18820446,
  updatePatternIndexNames: jest.fn(),
  updatePatternRollup: jest.fn(),
};
