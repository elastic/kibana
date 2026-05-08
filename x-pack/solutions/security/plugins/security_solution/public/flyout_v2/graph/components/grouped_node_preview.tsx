/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type FC } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  GraphGroupedNodePreviewPanel,
  type GraphGroupedNodePreviewPanelProps,
} from '@kbn/cloud-security-posture-graph';

const ENTITIES_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.graph.groupedNodePreview.entitiesTitle',
  { defaultMessage: 'Grouped entities' }
);

const EVENTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.graph.groupedNodePreview.eventsTitle',
  { defaultMessage: 'Grouped events' }
);

/**
 * Flyout v2 shell wrapping the shared {@link GraphGroupedNodePreviewPanel}. Used to render the
 * grouped events / grouped entities preview opened from the graph tools flyout via
 * `overlays.openSystemFlyout`.
 */
export const GroupedNodePreview: FC<GraphGroupedNodePreviewPanelProps> = memo((props) => {
  const title = props.docMode === 'grouped-entities' ? ENTITIES_TITLE : EVENTS_TITLE;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <GraphGroupedNodePreviewPanel {...props} />
      </EuiFlyoutBody>
    </>
  );
});

GroupedNodePreview.displayName = 'GroupedNodePreview';
