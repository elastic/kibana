/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

/** Controls which metadata fields are rendered on entity/event nodes in the graph. */
export interface GraphDisplayOptions {
  entity: {
    assetCriticality: boolean;
    dataSource: boolean;
    ipAddress: boolean;
    geolocation: boolean;
  };
  event: {
    sourceIpAddress: boolean;
    sourceGeolocation: boolean;
  };
}

/**
 * Per-node display overrides — each field is independently optional so that
 * only explicitly changed fields shadow the global setting; untouched fields
 * continue to inherit from the graph-level GraphDisplayOptions.
 */
export interface NodeDisplayOverrides {
  entity?: Partial<GraphDisplayOptions['entity']>;
  event?: Partial<GraphDisplayOptions['event']>;
}

/** All fields visible — used as the initial/default state. */
export const DEFAULT_GRAPH_DISPLAY_OPTIONS: GraphDisplayOptions = {
  entity: {
    assetCriticality: true,
    dataSource: true,
    ipAddress: true,
    geolocation: true,
  },
  event: {
    sourceIpAddress: true,
    sourceGeolocation: true,
  },
};

export const GraphDisplayOptionsContext = createContext<GraphDisplayOptions>(
  DEFAULT_GRAPH_DISPLAY_OPTIONS
);

/** Consume the current graph display options inside any node component. */
export const useGraphDisplayOptions = () => useContext(GraphDisplayOptionsContext);

export interface NodeDisplayOverridesContextValue {
  overrides: Map<string, NodeDisplayOverrides>;
  setNodeOverride: (nodeId: string, opts: NodeDisplayOverrides) => void;
}

export const NodeDisplayOverridesContext = createContext<NodeDisplayOverridesContextValue>({
  overrides: new Map(),
  setNodeOverride: () => {},
});

/** Consume and set per-node display overrides inside any node component. */
export const useNodeDisplayOverrides = () => useContext(NodeDisplayOverridesContext);
