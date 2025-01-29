/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlPanels } from './types';

export const availableControlsPanels = {
  NAMESPACE: 'data_stream.namespace',
} as const;

export type AvailableControlPanels = typeof availableControlsPanels;

export const controlPanelConfigs: ControlPanels = {
  [availableControlsPanels.NAMESPACE]: {
    order: 0,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    fieldName: availableControlsPanels.NAMESPACE,
    title: 'Namespace',
  },
};

export const availableControlPanelFields = Object.values(availableControlsPanels);
