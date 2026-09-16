/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { Worker, WorkerSettings } from '@kbn/alertzero-common';

export interface WatchCustomSettingsProps {
  worker: Worker;
  settings: WorkerSettings;
  isDisabled?: boolean;
  onSettingsChange: (patch: { extras: WorkerSettings['extras'] }) => void;
}

export type WatchCustomSettingsComponent = FC<WatchCustomSettingsProps> & {
  coveredFields: Readonly<Record<string, readonly string[]>>;
};
