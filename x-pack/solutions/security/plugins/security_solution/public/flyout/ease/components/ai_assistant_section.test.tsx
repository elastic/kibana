/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import {
  AI_ASSISTANT_SECTION_TEST_ID,
  AIAssistantSection,
  SUGGESTED_PROMPTS_SECTION_TEST_ID,
} from './ai_assistant_section';
import { useEaseDetailsContext } from '../context';
import { TestProviders } from '../../../common/mock';

vi.mock('../context');

describe('AIAssistantSection', () => {
  it('should the AI assistant section', () => {
    (useEaseDetailsContext as Mock).mockReturnValue({
      eventId: 'eventId',
      getFieldsData: vi.fn(),
    });

    const getPromptContext = vi.fn();

    const { getByTestId } = render(
      <TestProviders>
        <AIAssistantSection getPromptContext={getPromptContext} />
      </TestProviders>
    );

    expect(getByTestId(AI_ASSISTANT_SECTION_TEST_ID)).toHaveTextContent('AI Assistant');
    expect(getByTestId(SUGGESTED_PROMPTS_SECTION_TEST_ID)).toHaveTextContent('Suggested prompts');
  });
});
