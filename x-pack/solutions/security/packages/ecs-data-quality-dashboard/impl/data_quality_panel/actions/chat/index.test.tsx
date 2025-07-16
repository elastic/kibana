/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { ChatAction } from '.';
import { TestDataQualityProviders } from '../../mock/test_providers/test_providers';
import { NewChat, useFindPrompts } from '@kbn/elastic-assistant';
import {
  DATA_QUALITY_PROMPT_CONTEXT_PILL,
  DATA_QUALITY_SUGGESTED_USER_PROMPT,
} from '../../translations';
import { getFormattedCheckTime } from '../../data_quality_details/indices_details/pattern/index_check_flyout/utils/get_formatted_check_time';

jest.mock('@kbn/elastic-assistant', () => ({
  NewChat: jest.fn(({ children }) => (
    <button type="button" data-test-subj="newChatLink">
      {children}
    </button>
  )),
  useFindPrompts: jest.fn().mockReturnValue({
    data: { prompts: [] },
  }),
}));

const useFindPromptsMock = useFindPrompts as unknown as jest.Mock<
  Pick<ReturnType<typeof useFindPrompts>, 'data'>
>;
const NewChatMock = NewChat as jest.MockedFunction<typeof NewChat>;

describe('ChatAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render new chat link', async () => {
    render(
      <TestDataQualityProviders>
        <ChatAction markdownComment="test markdown" indexName="test-index" />
      </TestDataQualityProviders>
    );

    expect(screen.getByTestId('newChatLink')).toHaveTextContent('Ask Assistant');
  });

  it('should pass correct props to NewChat with minimal required props', () => {
    const markdownComment = 'test markdown comment';
    const indexName = 'test-index-name';

    render(
      <TestDataQualityProviders>
        <ChatAction markdownComment={markdownComment} indexName={indexName} />
      </TestDataQualityProviders>
    );

    expect(NewChatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        asLink: true,
        category: 'data-quality-dashboard',
        conversationTitle: '--',
        description: expect.any(String),
        getPromptContext: expect.any(Function),
        suggestedUserPrompt: expect.any(String),
        tooltip: expect.any(String),
        isAssistantEnabled: true,
        iconType: null,
      }),
      {}
    );
  });

  it('should pass index name in NewChat description prop', () => {
    const markdownComment = 'test markdown';
    const indexName = 'specific-test-index';

    render(
      <TestDataQualityProviders>
        <ChatAction markdownComment={markdownComment} indexName={indexName} />
      </TestDataQualityProviders>
    );

    const callArgs = NewChatMock.mock.calls[0][0];

    expect(callArgs.description).toBe(DATA_QUALITY_PROMPT_CONTEXT_PILL(indexName));
  });

  describe('when checkedAt timestamp is provided', () => {
    it('should pass correct conversation title with formatted timestamp', () => {
      const markdownComment = 'test markdown';
      const indexName = 'test-index';
      const checkedAt = 1640995200000;

      render(
        <TestDataQualityProviders>
          <ChatAction
            markdownComment={markdownComment}
            indexName={indexName}
            checkedAt={checkedAt}
          />
        </TestDataQualityProviders>
      );

      const expectedTitle = `${indexName} - ${getFormattedCheckTime(checkedAt)}`;

      expect(NewChatMock).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationTitle: expectedTitle,
        }),
        {}
      );
    });
  });

  describe('when checkedAt timestamp is not provided', () => {
    it('should replace conversation title with empty stat "--" fallback', () => {
      const markdownComment = 'test markdown';
      const indexName = 'test-index';

      render(
        <TestDataQualityProviders>
          <ChatAction markdownComment={markdownComment} indexName={indexName} />
        </TestDataQualityProviders>
      );

      expect(NewChatMock).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationTitle: '--',
        }),
        {}
      );
    });
  });

  describe('when dataQualityAnalysis prompt is available', () => {
    it('should use it', () => {
      const dqdPrompt = 'Custom data quality analysis prompt';
      const markdownComment = 'test markdown';
      const indexName = 'test-index';

      useFindPromptsMock.mockReturnValue({
        data: {
          prompts: [
            { promptId: 'dataQualityAnalysis', prompt: dqdPrompt },
            { promptId: 'other', prompt: 'Other prompt' },
          ],
        },
      });

      render(
        <TestDataQualityProviders>
          <ChatAction markdownComment={markdownComment} indexName={indexName} />
        </TestDataQualityProviders>
      );

      expect(NewChatMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedUserPrompt: dqdPrompt,
        }),
        {}
      );
    });
  });

  describe('when dataQualityAnalysis prompt is not available', () => {
    it('should use fallback prompt', () => {
      const markdownComment = 'test markdown';
      const indexName = 'test-index';

      (useFindPrompts as jest.Mock).mockReturnValue({
        data: {
          prompts: [{ promptId: 'other', prompt: 'Other prompt' }],
        },
      });

      render(
        <TestDataQualityProviders>
          <ChatAction markdownComment={markdownComment} indexName={indexName} />
        </TestDataQualityProviders>
      );

      expect(NewChatMock).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedUserPrompt: DATA_QUALITY_SUGGESTED_USER_PROMPT,
        }),
        {}
      );
    });
  });

  it('should call useFindPrompts hook with correct context and params', () => {
    const markdownComment = 'test markdown';
    const indexName = 'test-index';

    render(
      <TestDataQualityProviders>
        <ChatAction markdownComment={markdownComment} indexName={indexName} />
      </TestDataQualityProviders>
    );

    expect(useFindPromptsMock).toHaveBeenCalledWith({
      context: {
        isAssistantEnabled: true,
        httpFetch: expect.any(Function),
        toasts: expect.any(Object),
      },
      params: {
        prompt_group_id: 'aiAssistant',
        prompt_ids: ['dataQualityAnalysis'],
      },
    });
  });

  it('should provide NewChat getPromptContext function that returns markdownComment', async () => {
    const markdownComment = 'test markdown comment for context';
    const indexName = 'test-index';

    render(
      <TestDataQualityProviders>
        <ChatAction markdownComment={markdownComment} indexName={indexName} />
      </TestDataQualityProviders>
    );

    const callArgs = NewChatMock.mock.calls[0][0];
    const getPromptContext = callArgs.getPromptContext;

    await expect(getPromptContext()).resolves.toBe(markdownComment);
  });
});
