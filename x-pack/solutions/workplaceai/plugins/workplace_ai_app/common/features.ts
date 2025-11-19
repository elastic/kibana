/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WORKPLACE_AI_FEATURE_ID = 'workplace_ai';
export const WORKPLACE_AI_FEATURE_NAME = 'Workplace AI';
export const WORKPLACE_AI_APP_ID = 'workplace_ai';

export const uiCapabilities = {
  show: 'show',
  showManagement: 'showManagement',
};

export const apiCapabilities = {
  useWorkplaceAI: 'workplace_ai_use',
  manageWorkplaceAI: 'workplace_ai_manage',
};

// defining feature groups here because it's less error prone when adding new capabilities
export const capabilityGroups = {
  ui: {
    read: [uiCapabilities.show],
    all: [uiCapabilities.show, uiCapabilities.showManagement],
  },
  api: {
    read: [apiCapabilities.useWorkplaceAI],
    all: [apiCapabilities.useWorkplaceAI, apiCapabilities.manageWorkplaceAI],
  },
};
