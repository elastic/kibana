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

  it('says no start of the type counts, in one message, when none does', () => {
    // There may be warm starts, or cold ones the guard leaves out: not "the SDK sent none"
    expect(appStartTooltip('cold', 0)).toMatch(
      /seconds are left out: .+ No cold starts of 60 seconds or less in the time range and filters\.$/
    );
  });

  it('keeps the starts of the previous period while comparing when none counts now', () => {
    expect(appStartTooltip('cold', 0, 5)).toMatch(
      / No cold starts of 60 seconds or less in the time range and filters\. The previous period has 5 cold starts\.$/
    );
  });
});
