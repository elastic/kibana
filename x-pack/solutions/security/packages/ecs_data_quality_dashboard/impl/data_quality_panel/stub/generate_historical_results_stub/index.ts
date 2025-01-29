/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHistoricalResult } from '../../mock/historical_results/mock_historical_results_response';
import { HistoricalResult } from '../../types';

const dayInMs = 24 * 60 * 60 * 1000;

export const generateHistoricalResultsStub = (indexName: string, amount = 1): HistoricalResult[] =>
  Array.from({ length: amount }, (_, i) => ({
    ...mockHistoricalResult,
    indexName,
    checkedAt: mockHistoricalResult.checkedAt + i * dayInMs,
    markdownComments: [
      `### ${indexName}\n`,
      `| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | ${indexName} | 618,675 (29.4%) | 1 | \`unmanaged\` | 81.2MB |\n\n`,
      '### **Incompatible fields** `1` **Same family** `3` **Custom fields** `64` **ECS compliant fields** `44` **All fields** `112`\n',
      "#### 1 incompatible field\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.11.0.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
      `\n\n#### Incompatible field values - ${indexName}\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | \`api\`, \`authentication\`, \`configuration\`, \`database\`, \`driver\`, \`email\`, \`file\`, \`host\`, \`iam\`, \`intrusion_detection\`, \`library\`, \`malware\`, \`network\`, \`package\`, \`process\`, \`registry\`, \`session\`, \`threat\`, \`vulnerability\`, \`web\` | \`siem\` (110616) |\n\n`,
    ],
    '@timestamp': mockHistoricalResult['@timestamp'] + i * dayInMs,
  }));
