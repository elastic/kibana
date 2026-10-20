/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_FEATURE_ID } from '@kbn/alertzero-common';
import type { Capabilities, CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  getAgenticInvestigationsCapabilities,
  type AgenticInvestigationsCapabilities,
} from '@kbn/agentic-investigations-plugin/public';

/**
 * The agentic-investigations UI capability flags as they apply inside AlertZero: the manage
 * flags additionally require the AlertZero All privilege.
 */
export const getAlertZeroInvestigationsCapabilities = (
  capabilities: Capabilities
): AgenticInvestigationsCapabilities => {
  const canWrite = capabilities[ALERTZERO_FEATURE_ID]?.write === true;
  const { showEscalations, manageEscalations, manageInvestigations } =
    getAgenticInvestigationsCapabilities(capabilities);
  return {
    showEscalations,
    manageEscalations: canWrite && manageEscalations,
    manageInvestigations: canWrite && manageInvestigations,
  };
};

/** React hook wrapper around `getAlertZeroInvestigationsCapabilities`. */
export const useAlertZeroInvestigationsCapabilities = (): AgenticInvestigationsCapabilities => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  return getAlertZeroInvestigationsCapabilities(application.capabilities);
};
