/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import {
  HUNT_COVERAGE_AI_INDEX_DEST,
  HUNT_COVERAGE_AI_INDEX_ID,
} from '../../common/step_types/package_report';

/**
 * Backing index for Attack Discovery fingerprints. The match step in
 * security_solution searches and writes `ai-index-idx-security-attack-fingerprints`
 * directly; this id is what makes the index managed so Context Engine resolves it.
 */
export const ATTACK_FINGERPRINT_AI_INDEX_ID = 'security-attack-fingerprints';

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
    memory_enabled: false,
    dest: HUNT_COVERAGE_AI_INDEX_DEST,
    automations: [],
    sources: [],
    traces: [],
  });

  contextEngine.registerAiIndex(ATTACK_FINGERPRINT_AI_INDEX_ID, {
    description:
      'Attack Discovery fingerprints used to attach a later attack to the Investigation ' +
      'that already describes it. Not a forensics handoff.',
    memory_enabled: false,
    dest: getAiIndexDest('index', ATTACK_FINGERPRINT_AI_INDEX_ID),
    automations: [],
    sources: [],
    traces: [],
  });
};
