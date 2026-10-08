/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import { agentLifecycle } from './agent_lifecycle';

const latest = (
  status: SignificantEvent['status'],
  status_evaluations?: number
): SignificantEvent => ({ event_id: 'e1', status, status_evaluations } as SignificantEvent);

describe('agentLifecycle', () => {
  it('opens a new event as active', () => {
    expect(agentLifecycle({ latest: undefined })).toEqual({ write: true, status: 'active' });
  });

  it.each<SignificantEvent['status']>(['active', 'inactive'])('writes active onto %s', (status) => {
    expect(agentLifecycle({ latest: latest(status) })).toEqual({ write: true, status: 'active' });
  });

  it('carries evidence onto a recovering event and leaves its status and count alone', () => {
    expect(agentLifecycle({ latest: latest('recovering', 2) })).toEqual({
      write: true,
      status: 'recovering',
      evaluations: 2,
    });
  });

  it('treats a recovering event with no stored count as having spent none', () => {
    expect(agentLifecycle({ latest: latest('recovering') })).toEqual({
      write: true,
      status: 'recovering',
      evaluations: 0,
    });
  });
});
