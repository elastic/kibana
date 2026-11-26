/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appStartTooltip } from './app_start_labels';

describe('appStartTooltip', () => {
  it('names the starts the average is based on', () => {
    expect(appStartTooltip('cold', 42)).toMatch(/ Based on 42 cold starts\.$/);
  });

  it('names the starts of the previous period too while comparing', () => {
    expect(appStartTooltip('warm', 1, 2)).toMatch(
      / Based on 1 warm start, and 2 warm starts in the previous period\.$/
    );
  });

  it('says the SDK sent no app starts, in one message, when there were none', () => {
    expect(appStartTooltip('cold', 0, 5)).toMatch(
      /seconds are left out: .+ The SDK sent no app start events \(elastic\.app\.start\) in the time range and filters\.$/
    );
  });
});
