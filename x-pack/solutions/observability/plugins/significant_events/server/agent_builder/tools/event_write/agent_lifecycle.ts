/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decideLifecycle } from '../../../lib/significant_events/events/lifecycle_state_machine';
import type { LifecycleResolver } from './handler';

/**
 * What a discovery write means for the event's status: it asserts a breach. The state machine
 * decides the resulting status, so an agent never picks one: it opens or continues an event as
 * `active`, and onto a `recovering` series it carries evidence while status and count stay put
 * (only a status evaluation moves that series).
 */
export const agentLifecycle: LifecycleResolver = ({ latest }) =>
  decideLifecycle({
    state: {
      status: latest?.status,
      evaluations: latest?.status_evaluations ?? 0,
    },
    input: { kind: 'breach_asserted' },
  });
