/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  ENTITY_GRAPH_ATTACHMENT_TEST_ID,
  EntityGraphInlineContent,
} from './entity_graph_inline_content';
import type { EntityGraphAttachment, EntityGraphAttachmentData } from './types';

jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));

jest.mock('../../../flyout_v2/shared/components/graph_preview', () => ({
  GraphPreview: ({
    isLoading,
    isError,
    data,
  }: {
    isLoading: boolean;
    isError: boolean;
    data?: { nodes: unknown[] };
  }) => (
    <div data-test-subj="mockGraphPreview">
      {isLoading ? 'loading' : isError ? 'error' : `nodes:${data?.nodes?.length ?? 0}`}
    </div>
  ),
}));

const mockUseFetchGraphData = useFetchGraphData as jest.Mock;

const hostData: EntityGraphAttachmentData = {
  identifierType: 'host',
  identifier: 'server1',
  entityStoreId: 'host:server1',
  timeRange: { from: 'now-30d', to: 'now' },
};

const renderInline = (data: EntityGraphAttachmentData = hostData) => {
  const props = {
    attachment: {
      id: 'a',
      type: 'security.entity_graph',
      data,
    } as unknown as EntityGraphAttachment,
    isSidebar: false,
  } as AttachmentRenderProps<EntityGraphAttachment>;

  return render(<EntityGraphInlineContent {...props} http={{} as HttpStart} />);
};

describe('EntityGraphInlineContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchGraphData.mockReturnValue({ isLoading: false, isError: false, data: undefined });
  });

  it('seeds useFetchGraphData with the entity id and time window from the payload', () => {
    renderInline();
    expect(mockUseFetchGraphData).toHaveBeenCalledWith(
      expect.objectContaining({
        req: {
          query: {
            entityIds: [{ id: 'host:server1', isOrigin: true }],
            start: 'now-30d',
            end: 'now',
          },
        },
        options: { refetchOnWindowFocus: false },
      })
    );
  });

  it.each([
    ['loading', { isLoading: true, isError: false, data: undefined }, 'loading'],
    ['error', { isLoading: false, isError: true, data: undefined }, 'error'],
    ['empty', { isLoading: false, isError: false, data: { nodes: [], edges: [] } }, 'nodes:0'],
    [
      'data',
      { isLoading: false, isError: false, data: { nodes: [{ id: 'a' }], edges: [] } },
      'nodes:1',
    ],
  ])('renders the %s state', (_name, hookResult, expected) => {
    mockUseFetchGraphData.mockReturnValue(hookResult);
    renderInline();
    expect(screen.getByTestId(ENTITY_GRAPH_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('mockGraphPreview')).toHaveTextContent(expected);
  });
});
