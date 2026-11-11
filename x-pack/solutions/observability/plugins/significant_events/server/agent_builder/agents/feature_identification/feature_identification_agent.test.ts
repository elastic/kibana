/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { FEATURE_IDENTIFICATION_SKILL_ID } from '../../skills/feature_identification';
import { featureIdentificationAgentType } from './feature_identification_agent';

describe('featureIdentificationAgentType', () => {
  it('keeps stable registry tools on the agent type', () => {
    expect(featureIdentificationAgentType.baseConfiguration.skill_ids).toEqual([
      FEATURE_IDENTIFICATION_SKILL_ID,
    ]);
    expect(featureIdentificationAgentType.baseConfiguration.tools).toEqual([
      {
        tool_ids: [
          platformSignificantEventsTools.searchSimilarFeatures,
          platformSignificantEventsTools.searchEvent,
        ],
      },
    ]);
    expect(isAllowedBuiltinSkill(FEATURE_IDENTIFICATION_SKILL_ID)).toBe(true);
  });
});
