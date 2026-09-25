/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventService } from './event_service';
import { EventClient } from './event_client';
import { RuleEventsClient } from './rule_events_client';

describe('EventService', () => {
  const baseOptions = {
    dataStreamClient: {} as never,
    esClient: {} as never,
    space: 'default',
  };

  it('returns an EventClient when useRuleEventsRead is omitted (default false)', () => {
    const client = new EventService().getClient(baseOptions);

    expect(client).toBeInstanceOf(EventClient);
  });

  it('returns an EventClient when useRuleEventsRead is explicitly false', () => {
    const client = new EventService().getClient({ ...baseOptions, useRuleEventsRead: false });

    expect(client).toBeInstanceOf(EventClient);
  });

  it('returns a RuleEventsClient when useRuleEventsRead is true', () => {
    const client = new EventService().getClient({ ...baseOptions, useRuleEventsRead: true });

    expect(client).toBeInstanceOf(RuleEventsClient);
  });
});
