/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assessMembers } from '../../../lib/significant_events/events/event_members';
import { decideLifecycle } from '../../../lib/significant_events/events/lifecycle/lifecycle_state_machine';
import type { LifecycleResolver } from './handler';

/**
 * What a discovery write means for the event's status. The agent states facts as per-rule
 * verdicts and never a status: the members' latest verdicts, after this write is merged, are
 * assessed (breaching, every member healthy, or not judgeable) and the state machine decides. A
 * breach opens, continues, reopens, or returns a recovering event to `active`; every member
 * healthy starts recovery; discovery never closes an event.
 */
export const agentLifecycle: LifecycleResolver = ({ latest, signals }) =>
  decideLifecycle({
    state: { status: latest?.status },
    input: { kind: 'assessment', outcome: assessMembers(signals) },
  });
