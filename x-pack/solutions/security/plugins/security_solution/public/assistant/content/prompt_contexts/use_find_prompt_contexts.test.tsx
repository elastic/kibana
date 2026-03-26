/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { UseFindPromptContextsParams } from './use_find_prompt_contexts';
import { useFindPromptContexts } from './use_find_prompt_contexts';
import { useFindPrompts } from '@kbn/elastic-assistant';
import { DATA_QUALITY_SUGGESTED_USER_PROMPT } from '@kbn/ecs-data-quality-dashboard';
import { EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS } from '../../../detection_engine/common/translations';
import { EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE } from '../prompts/user/translations';
import { ASSET_INVENTORY_ENTITY_PROMPT } from '../../../flyout/entity_details/shared/translations';

const mockPrompts = [
  {
    promptId: 'alertEvaluation',
    prompt: 'ALERT EVALUATION',
  },
  {
    promptId: 'dataQualityAnalysis',
    prompt: 'DATA QUALITY ANALYSIS',
  },
  {
    promptId: 'ruleAnalysis',
    prompt: 'RULE ANALYSIS',
  },
  {
    promptId: 'assetAnalysis',
    prompt: 'ASSET ANALYSIS',
  },
];
jest.mock('@kbn/elastic-assistant');

describe('useFindPromptContexts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFindPrompts as jest.Mock).mockReturnValue({ data: { prompts: mockPrompts } });
  });

  it('calls getPromptContexts with the correct prompts mapped by category', () => {
    const params = {} as unknown as UseFindPromptContextsParams;

    renderHook(() => useFindPromptContexts(params));

    const mockReturn = {
      alert: {
        category: 'alert',
        description: 'Alert (from view)',
        suggestedUserPrompt: 'ALERT EVALUATION',
        tooltip: 'Add this alert as context',
      },
      asset: {
        category: 'asset',
        description: 'Entity details',
        suggestedUserPrompt: 'ASSET ANALYSIS',
        tooltip: 'Asset details from inventory',
      },
      'data-quality-dashboard': {
        category: 'data-quality-dashboard',
        description: 'Data Quality (index)',
        suggestedUserPrompt: 'DATA QUALITY ANALYSIS',
        tooltip: 'Add this Data Quality report as context',
      },
      'detection-rules': {
        category: 'detection-rules',
        description: 'Selected Detection Rules',
        suggestedUserPrompt: 'RULE ANALYSIS',
        tooltip: 'Add this alert as context',
      },
      event: {
        category: 'event',
        description: 'Event (from view)',
        suggestedUserPrompt: 'ALERT EVALUATION',
        tooltip: 'Add this event as context',
      },
    };
    const { result } = renderHook(() => useFindPromptContexts(params));
    expect(result.current).toStrictEqual(mockReturn);
  });

  it('uses correct fallback values when the API does not contain the expected results', () => {
    (useFindPrompts as jest.Mock).mockReturnValue({ data: { prompts: [] } });
    const params = {} as unknown as UseFindPromptContextsParams;

    renderHook(() => useFindPromptContexts(params));

    const mockReturn = {
      alert: {
        category: 'alert',
        description: 'Alert (from view)',
        suggestedUserPrompt: EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE,
        tooltip: 'Add this alert as context',
      },
      asset: {
        category: 'asset',
        description: 'Entity details',
        suggestedUserPrompt: ASSET_INVENTORY_ENTITY_PROMPT,
        tooltip: 'Asset details from inventory',
      },
      'data-quality-dashboard': {
        category: 'data-quality-dashboard',
        description: 'Data Quality (index)',
        suggestedUserPrompt: DATA_QUALITY_SUGGESTED_USER_PROMPT,
        tooltip: 'Add this Data Quality report as context',
      },
      'detection-rules': {
        category: 'detection-rules',
        description: 'Selected Detection Rules',
        suggestedUserPrompt: EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS,
        tooltip: 'Add this alert as context',
      },
      event: {
        category: 'event',
        description: 'Event (from view)',
        suggestedUserPrompt: EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE,
        tooltip: 'Add this event as context',
      },
    };
    const { result } = renderHook(() => useFindPromptContexts(params));
    expect(result.current).toStrictEqual(mockReturn);
  });
});
