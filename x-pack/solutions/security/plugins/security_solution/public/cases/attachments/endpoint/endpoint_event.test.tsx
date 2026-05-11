/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import AttachmentContentEvent from './endpoint_event';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';

jest.mock('@kbn/security-solution-navigation/src/navigation', () => {
  return {
    useNavigation: jest.fn(),
  };
});

describe('AttachmentContentEvent', () => {
  const mockNavigateTo = jest.fn();

  const mockUseNavigation = useNavigation as jest.Mocked<typeof useNavigation>;
  (mockUseNavigation as jest.Mock).mockReturnValue({
    getAppUrl: jest.fn(),
    navigateTo: mockNavigateTo,
  });

  const defaultProps = {
    metadata: {
      command: 'isolate',
      comment: 'test comment',
      targets: [
        {
          endpointId: 'endpoint-1',
          hostname: 'host-1',
          agentType: 'endpoint' as const,
        },
      ],
    },
  };

  it('renders the expected text based on the command', () => {
    const { getByText, getByTestId, rerender } = render(
      <AttachmentContentEvent {...defaultProps} />
    );

    expect(getByText('submitted isolate request on host')).toBeInTheDocument();
    expect(getByTestId('actions-link-endpoint-1')).toHaveTextContent('host-1');

    rerender(
      <AttachmentContentEvent
        {...defaultProps}
        metadata={{
          ...defaultProps.metadata,
          command: 'unisolate',
        }}
      />
    );

    expect(getByText('submitted release request on host')).toBeInTheDocument();
    expect(getByTestId('actions-link-endpoint-1')).toHaveTextContent('host-1');
  });

  it('navigates on link click', () => {
    const { getByTestId } = render(<AttachmentContentEvent {...defaultProps} />);

    fireEvent.click(getByTestId('actions-link-endpoint-1'));

    expect(mockNavigateTo).toHaveBeenCalled();
  });

  it('builds the endpoint details URL when agentType is endpoint and skips the hosts URL', () => {
    const mockGetAppUrl = jest.fn().mockReturnValue('http://app.url');
    (mockUseNavigation as jest.Mock).mockReturnValue({
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });

    render(<AttachmentContentEvent {...defaultProps} />);

    expect(mockGetAppUrl).toHaveBeenCalledTimes(1);
    expect(mockGetAppUrl).toHaveBeenCalledWith({
      path: '/administration/endpoints?selected_endpoint=endpoint-1&show=activity_log',
    });
  });

  it('builds the hosts URL with an encoded hostname for non-endpoint agent types', () => {
    const mockGetAppUrl = jest.fn().mockReturnValue('http://app.url');
    (mockUseNavigation as jest.Mock).mockReturnValue({
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });

    render(
      <AttachmentContentEvent
        metadata={{
          command: 'isolate',
          comment: '',
          targets: [
            {
              endpointId: 'cs-1',
              hostname: 'weird host/name with spaces',
              agentType: 'crowdstrike' as const,
            },
          ],
        }}
      />
    );

    expect(mockGetAppUrl).toHaveBeenCalledTimes(1);
    expect(mockGetAppUrl).toHaveBeenCalledWith({
      path: `/hosts/name/${encodeURIComponent('weird host/name with spaces')}`,
    });
  });

  it('returns null when targets is empty without computing any URL', () => {
    const mockGetAppUrl = jest.fn();
    (mockUseNavigation as jest.Mock).mockReturnValue({
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });

    const { container } = render(
      <AttachmentContentEvent metadata={{ command: 'isolate', comment: '', targets: [] }} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockGetAppUrl).not.toHaveBeenCalled();
  });
});
