/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { HttpStart } from '@kbn/core-http-browser';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { GraphPreview } from '../../../flyout_v2/shared/components/graph_preview';
import { entityGraphQueryClient } from './query_client';
import type { EntityGraphAttachment } from './types';

export const ENTITY_GRAPH_ATTACHMENT_TEST_ID = 'securitySolutionAgentBuilderEntityGraphAttachment';

/**
 * Compact graph preview for Agent Builder chat.
 * Full interactivity lives in the entity flyout via the "Open full graph" action button.
 */
export const EntityGraphInlineContent: React.FC<
  AttachmentRenderProps<EntityGraphAttachment> & { http: HttpStart }
> = ({ attachment, http }) => {
  return (
    <KibanaContextProvider services={{ http }}>
      <QueryClientProvider client={entityGraphQueryClient}>
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
          <EntityGraphPreview data={attachment.data} />
        </EuiPanel>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};

/** Inner preview so `useFetchGraphData` runs under QueryClient + Kibana context. */
const EntityGraphPreview: React.FC<{ data: EntityGraphAttachment['data'] }> = ({ data }) => {
  const { entityStoreId, timeRange } = data;

  const {
    isLoading,
    isError,
    data: graphData,
  } = useFetchGraphData({
    req: {
      query: {
        entityIds: [{ id: entityStoreId, isOrigin: true }],
        start: timeRange.from,
        end: timeRange.to,
      },
    },
    options: {
      refetchOnWindowFocus: false,
    },
  });

  return (
    <div data-test-subj={ENTITY_GRAPH_ATTACHMENT_TEST_ID}>
      <GraphPreview isLoading={isLoading} isError={isError} data={graphData} />
    </div>
  );
};
