/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Global, css } from '@emotion/react';
import { GRAPH_NON_ORIGIN_NODE_OPACITY } from './graph_origin_utils';
import { GRAPH_SEARCH_NON_MATCH_NODE_OPACITY } from './graph_search_utils';

export const GlobalGraphStyles = () => {
  return (
    <Global
      styles={css`
        .react-flow {
          /* Keep the dotted Background (z-index: -1) above ancestor fills. */
          isolation: isolate;
        }

        .react-flow__node:focus:focus-visible {
          outline: none !important;
        }

        .react-flow__edge-path {
          vector-effect: non-scaling-stroke;
        }

        .react-flow__pane {
          cursor: grab;
        }

        .react-flow__pane:active {
          cursor: grabbing;
        }

        .react-flow__node:not(.non-interactive) {
          cursor: pointer;
          overflow: visible;
        }

        .react-flow__node:not(.non-interactive).dragging {
          cursor: grabbing;
        }

        .react-flow__nodesselection {
          display: none;
        }

        .react-flow.graph-highlight-origins-only .react-flow__node:not(.graph-origin-node) {
          transition: opacity 0.2s ease;
        }

        .react-flow.graph-highlight-origins-only
          .react-flow__node:not(.graph-origin-node):not(:hover):not(.selected) {
          opacity: ${GRAPH_NON_ORIGIN_NODE_OPACITY};
        }

        .react-flow.graph-highlight-origins-only .react-flow__edge:not(.graph-origin-edge) {
          transition: opacity 0.2s ease;
          opacity: ${GRAPH_NON_ORIGIN_NODE_OPACITY};
        }

        .react-flow.graph-highlight-origins-only .react-flow__edge.graph-origin-edge .react-flow__edge-path,
        .react-flow.graph-highlight-origins-only .graph-origin-edge-path {
          animation: graph-origin-edge-dash 0.9s linear infinite;
        }

        @keyframes graph-origin-edge-dash {
          to {
            stroke-dashoffset: -20;
          }
        }

        .react-flow.graph-in-page-search-active
          .react-flow__node:not(.graph-search-match):not(:hover):not(.selected) {
          transition: opacity 0.2s ease;
          opacity: ${GRAPH_SEARCH_NON_MATCH_NODE_OPACITY};
        }

        .react-flow.graph-entity-filters-active
          .react-flow__node:not(.graph-entity-filter-match):not(:hover):not(.selected) {
          transition: opacity 0.2s ease;
          opacity: ${GRAPH_SEARCH_NON_MATCH_NODE_OPACITY};
        }

        .react-flow__node.graph-search-active-match {
          outline: 2px dashed var(--euiColorDarkShade, #343741);
          outline-offset: 2px;
        }
      `}
    />
  );
};
