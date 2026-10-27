/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import {
  HUNT_COVERAGE_AI_INDEX_DEST,
  HUNT_COVERAGE_AI_INDEX_ID,
} from '../../common/step_types/package_report';

/**
 * Registers the indicator AI index as managed, so Context Engine resolves it in every space.
 *
 * Hunt writes indicators straight to the backing index, which never adds a registry entry.
 * Without one, `context-engine.updateKi` cannot resolve the id and the reviews' terminal
 * status writes fail.
 */
export const registerInvestigationsAiIndex = ({
  contextEngine,
}: {
  contextEngine: ContextEnginePluginSetup;
}): void => {
  contextEngine.registerAiIndex(HUNT_COVERAGE_AI_INDEX_ID, {
    description:
      'Security knowledge indicators that AlertZero Watches hand to each other, such as ' +
      'detection coverage gaps and forensics handoffs.',
    dest: HUNT_COVERAGE_AI_INDEX_DEST,
    automations: [],
    sources: [],
    traces: [],
  });
};
