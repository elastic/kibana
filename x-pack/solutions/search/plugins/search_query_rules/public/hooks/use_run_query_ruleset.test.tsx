/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { UseRunQueryRuleset } from './use_run_query_ruleset';
import { useKibana } from './use_kibana';
import { useFetchQueryRuleset } from './use_fetch_query_ruleset';
import { TryInConsoleButton } from '@kbn/try-in-console';

// Mock dependencies
jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_fetch_query_ruleset', () => ({
  useFetchQueryRuleset: jest.fn(),
}));

jest.mock('@kbn/try-in-console', () => ({
  TryInConsoleButton: jest.fn(() => (
    <div data-test-subj="tryInConsoleButton">Try in Console Button</div>
  )),
}));

describe('UseRunQueryRuleset', () => {
  const mockApplication = { navigateToUrl: jest.fn() };
  const mockShare = { toggleShareContextMenu: jest.fn() };
  const mockConsole = { openInConsole: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: mockApplication,
        share: mockShare,
        console: mockConsole,
      },
    });

    // Default mock for ruleset data
    (useFetchQueryRuleset as jest.Mock).mockReturnValue({
      data: {
        rules: [
          {
            actions: {
              docs: [
                {
                  _index: 'test-index',
                  _id: 'test-id',
                },
              ],
            },
            criteria: [
              {
                metadata: 'user_query',
                values: ['test-query'],
                type: 'exact',
              },
            ],
          },
        ],
      },
      isInitialLoading: false,
      isError: false,
    });
  });

  it('renders correctly with default props', () => {
    render(<UseRunQueryRuleset rulesetId="test-ruleset" />);

    expect(TryInConsoleButton).toHaveBeenCalledWith(
      expect.objectContaining({
        application: mockApplication,
        sharePlugin: mockShare,
        consolePlugin: mockConsole,
        request: expect.stringContaining('test-ruleset'),
        type: 'emptyButton',
        showIcon: true,
      }),
      expect.anything()
    );

    const buttonProps = (TryInConsoleButton as jest.Mock).mock.calls[0][0];
    // Verify that the request contains the index from the fetched data
    expect(buttonProps.request).toContain('test-index');
    // Verify the request contains retriever structure
    expect(buttonProps.request).toContain('retriever');
    // Verify the request contains the expected query
    expect(buttonProps.request).toContain('"match_all": {}');
    // Verify ruleset_ids are included
    expect(buttonProps.request).toContain('test-ruleset');
  });

  it('renders with custom type and content', () => {
    const customContent = 'Custom Test Button';
    render(<UseRunQueryRuleset rulesetId="test-ruleset" type="button" content={customContent} />);

    expect(TryInConsoleButton).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'button',
        content: customContent,
      }),
      expect.anything()
    );
  });

  it('uses fallback index when ruleset data is not available', () => {
    (useFetchQueryRuleset as jest.Mock).mockReturnValue({
      data: null,
      isInitialLoading: false,
      isError: false,
    });

    render(<UseRunQueryRuleset rulesetId="test-ruleset" />);

    const buttonProps = (TryInConsoleButton as jest.Mock).mock.calls[0][0];
    expect(buttonProps.request).toContain('my_index');
  });

  it('handles multiple indices from ruleset data', () => {
    (useFetchQueryRuleset as jest.Mock).mockReturnValue({
      data: {
        rules: [
          {
            actions: {
              docs: [
                { _index: 'index1', _id: 'id1' },
                { _index: 'index2', _id: 'id2' },
              ],
            },
          },
        ],
      },
      isInitialLoading: false,
      isError: false,
    });

    render(<UseRunQueryRuleset rulesetId="test-ruleset" />);

    const buttonProps = (TryInConsoleButton as jest.Mock).mock.calls[0][0];
    expect(buttonProps.request).toContain('index1,index2');
  });

  it('creates match criteria from ruleset data', () => {
    (useFetchQueryRuleset as jest.Mock).mockReturnValue({
      data: {
        rules: [
          {
            criteria: [
              {
                metadata: 'user_query',
                values: 'search term',
                type: 'exact',
              },
              {
                metadata: 'user_location',
                values: ['US', 'UK'],
                type: 'exact',
              },
            ],
          },
        ],
      },
      isInitialLoading: false,
      isError: false,
    });

    render(<UseRunQueryRuleset rulesetId="test-ruleset" />);

    const buttonProps = (TryInConsoleButton as jest.Mock).mock.calls[0][0];
    expect(buttonProps.request).toContain('"user_query": "search term"');
    expect(buttonProps.request).toMatch(/"user_location":\s*\[\s*"US",\s*"UK"\s*\]/);
  });

  it('handles complex nested criteria values', () => {
    (useFetchQueryRuleset as jest.Mock).mockReturnValue({
      data: {
        rules: [
          {
            criteria: [
              {
                values: {
                  nested_field: 'nested value',
                  another_field: ['array', 'of', 'values'],
                },
                type: 'exact',
              },
            ],
          },
        ],
      },
      isInitialLoading: false,
      isError: false,
    });

    render(<UseRunQueryRuleset rulesetId="test-ruleset" />);

    const buttonProps = (TryInConsoleButton as jest.Mock).mock.calls[0][0];
    expect(buttonProps.request).toContain('"nested_field": "nested value"');
    expect(buttonProps.request).toMatch(/"another_field":\s*\[\s*"array",\s*"of",\s*"values"\s*\]/);
  });
});
