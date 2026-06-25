/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren, useMemo } from 'react';
import { EuiHorizontalRule, EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { NodeViewModel } from '../types';
import { useGraphFullscreenContext } from '../graph/graph_fullscreen_context';
import { GraphFindInPage } from './graph_find_in_page';
import { GraphEntityFiltersSection } from './graph_entity_filters_section';
import type { GraphEntityFiltersState } from './graph_entity_filters';

export interface GraphSearchPanelProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeViewModel[];
  entityFilters: GraphEntityFiltersState;
  onEntityFiltersChange: (next: GraphEntityFiltersState) => void;
}

export const GraphSearchPanel = ({
  isOpen,
  onClose,
  nodes,
  entityFilters,
  onEntityFiltersChange,
  children,
}: GraphSearchPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const fullscreenContext = useGraphFullscreenContext();
  const panelCss = useMemo(
    () => css`
      width: 320px;
      padding: ${euiTheme.size.m};
    `,
    [euiTheme]
  );

  return (
    <EuiPopover
      button={children}
      isOpen={isOpen}
      closePopover={onClose}
      anchorPosition="upCenter"
      panelPaddingSize="none"
      container={fullscreenContext?.overlayContainerRef.current ?? undefined}
    >
      <div css={panelCss} data-test-subj="graphSearchPanel">
        <GraphFindInPage nodes={nodes} />
        <EuiHorizontalRule margin="m" />
        <GraphEntityFiltersSection
          filters={entityFilters}
          onFiltersChange={onEntityFiltersChange}
        />
      </div>
    </EuiPopover>
  );
};
