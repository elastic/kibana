/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processInRounds } from '../round_processor';

describe('processInRounds', () => {
  it('should process alerts in rounds', async () => {
    const alerts = Array.from({ length: 150 }, (_, i) => ({
      id: `alert-${i}`,
      content: `Alert ${i}`,
      timestamp: new Date().toISOString(),
    }));

    const mockLLM = jest.fn(async (alertBatch) => [
      {
        title: 'Attack',
        summaryMarkdown: `Found in ${alertBatch.length} alerts`,
        detailsMarkdown: 'Details',
        alertIds: alertBatch.map((a: any) => a.id),
      },
    ]);

    const result = await processInRounds({
      alerts,
      alertsPerRound: 50,
      maxRounds: 10,
      generateInsights: mockLLM,
      existingInsights: [],
    });

    expect(result.rounds).toHaveLength(3);  // 150/50 = 3 rounds
    expect(mockLLM).toHaveBeenCalledTimes(3);
  });
});
