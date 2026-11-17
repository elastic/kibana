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
 * Binds the signal store to `.rule-events`. The store is not a singleton: it writes with the
 * `Request` of the tick scope it is resolved in, so it must be resolved from that scope.
 */
export function bindSignals({ bind }: ContainerModuleLoadOptions): void {
  bind(RuleEventsSignalStore).toSelf();
  bind(DetectionSignalStore).toService(RuleEventsSignalStore);
}
