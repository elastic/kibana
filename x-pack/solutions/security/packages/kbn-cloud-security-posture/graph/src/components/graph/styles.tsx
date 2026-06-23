/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Global, css } from '@emotion/react';
import { GRAPH_NON_ORIGIN_NODE_OPACITY } from './graph_origin_utils';

export const GlobalGraphStyles = () => {
  return (
    <Global
      styles={css`
        .react-flow__node:focus:focus-visible {
          outline: none !important;
        }

        .react-flow__edge-path {
          vector-effect: non-scaling-stroke;
        }

        .react-flow.graph-tool-pan .react-flow__pane {
          cursor: grab;
        }

        .react-flow.graph-tool-pan .react-flow__pane:active {
          cursor: grabbing;
        }

        .react-flow.graph-tool-select .react-flow__pane {
          cursor: default;
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
      `}
    />
  );
};
