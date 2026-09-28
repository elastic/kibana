/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactEntityView } from '@kbn/agentic-investigations-common';
import { investigationFlyoutHistoryKey } from '@kbn/agentic-investigations-common';

/**
 * Opens an Impact entity as a child of the investigation flyout.
 * Security Solution registers this after AlertZero starts, so the handler is read at click time.
 */
export type ImpactEntityOpener = (entity: ImpactEntityView, historyKey: symbol) => void;

let opener: ImpactEntityOpener | undefined;

export const registerImpactEntityOpener = (next: ImpactEntityOpener): void => {
  opener = next;
};

export const openImpactEntity = (entity: ImpactEntityView): void => {
  opener?.(entity, investigationFlyoutHistoryKey);
};
