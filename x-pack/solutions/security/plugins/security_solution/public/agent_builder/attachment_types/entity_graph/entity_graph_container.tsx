/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { GraphPreview } from '../../../flyout_v2/shared/components/graph_preview';
import type { EntityGraphAttachmentData } from './types';

export const ENTITY_GRAPH_ATTACHMENT_TEST_ID = 'securitySolutionAgentBuilderEntityGraphAttachment';
export const OPEN_FULL_GRAPH_BUTTON_TEST_ID =
  'securitySolutionAgentBuilderEntityGraphOpenFullGraphButton';

export interface EntityGraphContainerProps {
  data: EntityGraphAttachmentData;
  onOpenFullGraph?: () => void;
}

export const EntityGraphContainer = memo(({ data, onOpenFullGraph }: EntityGraphContainerProps) => {
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
      <EuiSpacer size="s" />
      {onOpenFullGraph && (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="popout"
              size="s"
              onClick={onOpenFullGraph}
              data-test-subj={OPEN_FULL_GRAPH_BUTTON_TEST_ID}
            >
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.attachments.entityGraph.openFullGraph',
                { defaultMessage: 'Open full graph' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
});

EntityGraphContainer.displayName = 'EntityGraphContainer';
