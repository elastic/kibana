/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTriggerDisplay, TRIGGER_LABEL_ORDER } from './trigger_display';

describe('getTriggerDisplay', () => {
  it('maps each trigger row to its label and icon', () => {
    expect(getTriggerDisplay({ kind: 'alert' })).toEqual({
      label: 'Alert triggered',
      icon: 'logoElastic',
    });
    expect(getTriggerDisplay({ kind: 'schedule' })).toEqual({
      label: 'Scheduled',
      icon: 'calendar',
    });
    expect(getTriggerDisplay({ kind: 'slack', event: 'mention' })).toEqual({
      label: 'Agent mentioned in channel',
      icon: 'logoSlack',
    });
  });

  it('orders alert, Slack, and scheduled triggers', () => {
    expect(TRIGGER_LABEL_ORDER).toEqual([
      'Alert triggered',
      'New message in channel',
      'Agent mentioned in channel',
      'Agent invited to channel',
      'Scheduled',
    ]);
  });
});
