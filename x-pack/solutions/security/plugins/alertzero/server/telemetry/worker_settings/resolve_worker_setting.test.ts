/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveWorkerSetting } from './resolve_worker_setting';

describe('resolveWorkerSetting', () => {
  it.each([
    ['autonomy', 'autonomy'],
    ['scheduleInterval', 'schedule_interval'],
    ['extras', 'extras'],
    ['serviceAccountId', 'service_account'],
  ])('maps the settings key %s to %s', (key, setting) => {
    expect(resolveWorkerSetting(key)).toBe(setting);
  });

  it.each([
    ['workerId'],
    ['analysisWindowDays'],
    ['schedule_interval'],
    ['enabled'],
    ['toString'],
    [''],
  ])('maps the non-allowlisted key %p to other', (key) => {
    expect(resolveWorkerSetting(key)).toBe('other');
  });
});
