/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTriggerDisplay } from './trigger_display';

describe('getTriggerDisplay', () => {
  it('maps each trigger row to its label and icon', () => {
    expect(getTriggerDisplay({ kind: 'alert' })).toEqual({
      label: 'Alert triggered',
      icon: 'logoElastic',
    });
    expect(getTriggerDisplay({ kind: 'schedule', schedulePreset: 'hourly' })).toEqual({
      label: 'Scheduled',
      icon: 'calendar',
    });
    expect(getTriggerDisplay({ kind: 'slack', event: 'message' })).toEqual({
      label: 'New message in channel',
      icon: 'logoSlack',
    });
  });

  it('labels a webhook by the payload it takes', () => {
    expect(getTriggerDisplay({ kind: 'webhook' })).toEqual({
      label: 'Webhook request',
      icon: 'link',
    });
    expect(getTriggerDisplay({ kind: 'webhook', mode: 'generic' }).label).toBe('Webhook request');
    expect(getTriggerDisplay({ kind: 'webhook', mode: 'alert' })).toEqual({
      label: 'Remote Elastic alert',
      icon: 'logoElastic',
    });
  });
});
