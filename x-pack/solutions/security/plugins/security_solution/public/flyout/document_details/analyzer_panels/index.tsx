/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { FlyoutPanelProps } from '@kbn/flyout';
import { useFlyoutApi } from '@kbn/flyout';
import type { DocumentDetailsAnalyzerPanelKey } from '../shared/constants/panel_keys';
import { DocumentDetailsPreviewPanelKey } from '../shared/constants/panel_keys';
import { DetailsPanel } from '../../../resolver/view/details_panel';
import type { NodeEventOnClick } from '../../../resolver/view/panels/node_events_of_type';
import { ALERT_PREVIEW_BANNER, EVENT_PREVIEW_BANNER } from '../preview/constants';
import { FlyoutBody } from '../../shared/components/flyout_body';

interface AnalyzerPanelProps extends Record<string, unknown> {
  /**
   * id to identify the scope of analyzer in redux
   */
  resolverComponentInstanceID: string;
}

export interface AnalyzerPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: typeof DocumentDetailsAnalyzerPanelKey;
  params: AnalyzerPanelProps;
}

/**
 * Displays node details panel for analyzer
 */
export const AnalyzerPanel: React.FC<AnalyzerPanelProps> = ({ resolverComponentInstanceID }) => {
  const { openChildPanel } = useFlyoutApi();

  const openChild = useCallback<NodeEventOnClick>(
    ({ documentId, indexName, scopeId, isAlert }) =>
      () => {
        openChildPanel(
          {
            id: DocumentDetailsPreviewPanelKey,
            params: {
              id: documentId,
              indexName,
              scopeId,
              isChild: true,
              banner: isAlert ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
            },
          },
          's'
        );
      },
    [openChildPanel]
  );

  return (
    <FlyoutBody>
      <div css={{ marginTop: '-15px' }}>
        <DetailsPanel
          resolverComponentInstanceID={resolverComponentInstanceID}
          nodeEventOnClick={openChild}
        />
      </div>
    </FlyoutBody>
  );
};

AnalyzerPanel.displayName = 'AnalyzerPanel';
