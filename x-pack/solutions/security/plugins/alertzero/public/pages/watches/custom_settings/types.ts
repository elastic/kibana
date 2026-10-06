/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { Worker, WorkerSettings, WorkerSettingsExtras } from '@kbn/alertzero-common';

/**
 * Contract for a Watch-owned Worker settings component. It renders real controls for the Worker's
 * `extras`, feeds edits into the shared page draft through `onExtrasChange` with the complete
 * replacement object, and never calls an API itself.
 */
export interface WorkerCustomSettingsProps {
  worker: Worker;
  settings: WorkerSettings;
  isDisabled?: boolean;
  onExtrasChange: (extras: WorkerSettingsExtras) => void;
}

export type WorkerCustomSettingsComponent = FC<WorkerCustomSettingsProps>;
