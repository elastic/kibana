/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from './experimental_features';

describe('parseExperimentalConfigValue', () => {
  it('accepts retired entityAnalyticsNewHomePageEnabled so existing kibana.yml entries stay valid', () => {
    expect(parseExperimentalConfigValue(['entityAnalyticsNewHomePageEnabled']).invalid).toEqual([]);
    expect(
      parseExperimentalConfigValue(['disable:entityAnalyticsNewHomePageEnabled']).invalid
    ).toEqual([]);
  });
});
