/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Process } from '@kbn/session-view-plugin/common';
import type { CustomProcess } from '../../../../../flyout/document_details/session_view/context';

// Small function to check if the selectedProcess is a Process
// TODO delete when the expandable flyout is removed
export const isProcess = (p: CustomProcess | Process | null): p is Process => {
  return p != null && typeof (p as Process).getAlerts === 'function';
};

// Small function to check if the selectedProcess is a CustomProcess
// TODO delete when the expandable flyout is removed
export const isCustomProcess = (p: CustomProcess | Process | null): p is CustomProcess => {
  return p != null && !isProcess(p);
};
