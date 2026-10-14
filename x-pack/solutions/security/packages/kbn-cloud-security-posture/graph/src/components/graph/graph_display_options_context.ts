/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

/** Controls which metadata fields are rendered on entity/event nodes in the graph. */
export interface GraphDisplayOptions {
  /** Whether to draw a blue border around origin/starting-point nodes. */
  highlightOrigin: boolean;
  entity: {
    subType: boolean;
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

/** All fields visible — used as the initial/default state. */
export const DEFAULT_GRAPH_DISPLAY_OPTIONS: GraphDisplayOptions = {
  highlightOrigin: true,
  entity: {
    subType: true,
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
