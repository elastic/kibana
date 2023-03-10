/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiExplainLogRateSpikes } from '@kbn/aiops-plugin/common/api';
import type { SignificantTerm, SignificantTermGroup } from '@kbn/ml-agg-utils';

export interface TestData {
  testName: string;
  esArchive?: string;
  dataGenerator?: string;
  requestBody: ApiExplainLogRateSpikes['body'];
  expected: {
    chunksLength: number;
    actionsLength: number;
    noIndexChunksLength: number;
    noIndexActionsLength: number;
    significantTermFilter: 'add_significant_terms';
    groupFilter: 'add_significant_terms_group';
    groupHistogramFilter: 'add_significant_terms_group_histogram';
    histogramFilter: 'add_significant_terms_histogram';
    errorFilter: 'add_error';
    significantTerms: SignificantTerm[];
    groups: SignificantTermGroup[];
    histogramLength: number;
  };
}
