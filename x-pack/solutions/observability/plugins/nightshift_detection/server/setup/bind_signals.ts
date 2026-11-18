/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { RuleEventsSignalStore } from '../lib/signals/rule_events_signal_store';
import { DetectionSignalStore } from '../lib/signals/signal_store';

/**
 * Binds the signal store to `.rule-events`. Core's container binds in singleton scope unless told
 * otherwise, and the store holds the `Request` of the tick that resolved it, so it is bound in
 * request scope: every tick scope gets its own.
 */
export function bindSignals({ bind }: ContainerModuleLoadOptions): void {
  bind(RuleEventsSignalStore).toSelf().inRequestScope();
  bind(DetectionSignalStore).toService(RuleEventsSignalStore);
}
