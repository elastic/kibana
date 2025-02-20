/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFetchConnectorsQuery } from '../../../detection_engine/rule_management/api/hooks/use_fetch_connectors_query';
import { StreamComment } from '.';
import { useStream } from './use_stream';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { AsApiContract } from '@kbn/actions-plugin/common';

const mockSetComplete = jest.fn();
jest.mock('../../../detection_engine/rule_management/api/hooks/use_fetch_connectors_query');

jest.mock('./use_stream');

jest.mock('../../../common/lib/kibana', () => ({
  useNavigation: jest.fn().mockReturnValue({
    navigateTo: jest.fn(),
  }),
  useKibana: jest.fn().mockReturnValue({
    services: {
      discover: {
        locator: jest.fn(),
      },
      application: {
        navigateToApp: jest.fn(),
      },
    },
  }),
}));

const content = 'Test Content';
const mockAbortStream = jest.fn();
const testProps = {
  abortStream: mockAbortStream,
  connectorId: 'test',
  content,
  index: 1,
  isControlsEnabled: true,
  refetchCurrentConversation: jest.fn(),
  regenerateMessage: jest.fn(),
  setIsStreaming: jest.fn(),
  transformMessage: jest.fn(),
  contentReferences: undefined,
};

const mockReader = jest.fn() as unknown as ReadableStreamDefaultReader<Uint8Array>;

describe('StreamComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useStream as jest.Mock).mockReturnValue({
      error: null,
      isLoading: false,
      isStreaming: false,
      pendingMessage: 'Test Message',
      setComplete: mockSetComplete,
    });
    const connectors: unknown[] = [
      {
        id: 'hi',
        name: 'OpenAI connector',
        actionTypeId: '.gen-ai',
      },
    ];
    jest.mocked(useFetchConnectorsQuery).mockReturnValue({
      data: connectors,
    } as unknown as UseQueryResult<Array<AsApiContract<Connector>>, unknown>);
  });
  it('renders content correctly', () => {
    render(<StreamComment {...testProps} />);

    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('renders citations correctly when content references are defined', () => {
    render(
      <StreamComment
        {...{
          ...testProps,
          content: 'the sky is blue {reference(1234)}',
          contentReferencesEnabled: true,
          contentReferencesVisible: true,
          contentReferences: {
            '1234': {
              id: '1234',
              type: 'SecurityAlertsPage',
            },
          },
        }}
      />
    );

    expect(screen.getByText('[1]')).toBeInTheDocument();
    expect(screen.getByTestId('ContentReferenceButton')).toBeEnabled();
  });

  it('renders citations correctly when content references null', () => {
    render(
      <StreamComment
        {...{
          ...testProps,
          content: 'the sky is blue {reference(1234)}',
          contentReferencesEnabled: true,
          contentReferencesVisible: true,
          contentReferences: null,
        }}
      />
    );

    expect(screen.getByText('[1]')).toBeInTheDocument();
    expect(screen.getByTestId('ContentReferenceButton')).not.toBeEnabled();
  });

  it('renders citations correctly when content references are undefined', () => {
    render(
      <StreamComment
        {...{
          ...testProps,
          content: 'the sky is blue {reference(1234)}',
          contentReferencesEnabled: true,
          contentReferencesVisible: true,
          contentReferences: undefined,
        }}
      />
    );

    expect(screen.queryByText('[1]')).not.toBeInTheDocument();
  });

  it('renders cursor when content is loading', () => {
    render(<StreamComment {...testProps} isFetching={true} />);
    expect(screen.getByTestId('cursor')).toBeInTheDocument();
    expect(screen.queryByTestId('stopGeneratingButton')).not.toBeInTheDocument();
  });

  it('renders cursor and stopGeneratingButton when reader is loading', () => {
    render(<StreamComment {...testProps} reader={mockReader} isFetching={true} />);
    expect(screen.getByTestId('stopGeneratingButton')).toBeInTheDocument();
    expect(screen.getByTestId('cursor')).toBeInTheDocument();
  });

  it('renders controls correctly when not loading', () => {
    render(<StreamComment {...testProps} reader={mockReader} />);

    expect(screen.getByTestId('regenerateResponseButton')).toBeInTheDocument();
  });

  it('calls setComplete and abortStream when StopGeneratingButton is clicked', () => {
    render(<StreamComment {...testProps} reader={mockReader} isFetching={true} />);

    fireEvent.click(screen.getByTestId('stopGeneratingButton'));

    expect(mockSetComplete).toHaveBeenCalled();
    expect(mockAbortStream).toHaveBeenCalled();
  });

  it('displays an error message correctly', () => {
    (useStream as jest.Mock).mockReturnValue({
      error: 'Test Error Message',
      isLoading: false,
      isStreaming: false,
      pendingMessage: 'Test Message',
      setComplete: mockSetComplete,
    });
    render(<StreamComment {...testProps} />);

    expect(screen.getByTestId('message-error')).toBeInTheDocument();
  });
});
