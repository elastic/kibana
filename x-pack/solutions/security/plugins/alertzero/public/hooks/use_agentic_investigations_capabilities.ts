/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
  ESCALATIONS_UI_CAPABILITY_SHOW,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATIONS_UI_CAPABILITY_MANAGE,
} from '@kbn/agentic-investigations-plugin/common';

export interface AgenticInvestigationsCapabilities {
  showEscalations: boolean;
  manageEscalations: boolean;
  manageInvestigations: boolean;
}

/**
 * Derives the agentic-investigations UI capability flags from the Kibana capabilities object.
 * Pure function — safe to call from plugin `start` and from React components alike.
 */
export const getAgenticInvestigationsCapabilities = (
  capabilities: Capabilities
): AgenticInvestigationsCapabilities => {
  const cap = capabilities[AGENTIC_INVESTIGATIONS_PLUGIN_ID];
  return {
    showEscalations: cap?.[ESCALATIONS_UI_CAPABILITY_SHOW] === true,
    manageEscalations: cap?.[ESCALATIONS_UI_CAPABILITY_MANAGE] === true,
    manageInvestigations: cap?.[INVESTIGATIONS_UI_CAPABILITY_MANAGE] === true,
  };
};

/**
 * React hook wrapper around `getAgenticInvestigationsCapabilities`. Use inside components;
 * use the pure function in `plugin.ts` and `routes.tsx`.
 */
export const useAgenticInvestigationsCapabilities = (): AgenticInvestigationsCapabilities => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  return getAgenticInvestigationsCapabilities(application.capabilities);
};
