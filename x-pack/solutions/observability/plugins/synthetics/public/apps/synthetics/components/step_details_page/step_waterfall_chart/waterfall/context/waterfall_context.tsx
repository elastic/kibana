/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  Context,
  Dispatch,
  SetStateAction,
  PropsWithChildren,
} from 'react';
import { JourneyStep } from '../../../../../../../../common/runtime_types';
import {
  WaterfallData,
  WaterfallDataEntry,
  WaterfallMetadata,
} from '../../../common/network_data/types';
import { OnSidebarClick, OnElementClick, OnProjectionClick } from '../waterfall_flyout/use_flyout';
import { WaterfallNetworkItem } from '../../../common/network_data/types';

export type MarkerItems = Array<{
  id:
    | 'domContentLoaded'
    | 'firstContentfulPaint'
    | 'largestContentfulPaint'
    | 'layoutShift'
    | 'loadEvent'
    | 'navigationStart';
  offset: number;
}>;

export interface IWaterfallContext {
  totalNetworkRequests: number;
  highlightedNetworkRequests: number;
  fetchedNetworkRequests: number;
  data: WaterfallData;
  onElementClick?: OnElementClick;
  onProjectionClick?: OnProjectionClick;
  onSidebarClick?: OnSidebarClick;
  showOnlyHighlightedNetworkRequests: boolean;
  showCustomMarks: boolean;
  sidebarItems?: WaterfallNetworkItem[];
  metadata: WaterfallMetadata;
  renderTooltipItem: (
    item: WaterfallDataEntry['config']['tooltipProps'],
    index?: number
  ) => JSX.Element;
  markerItems?: MarkerItems;
  activeStep?: JourneyStep;
  activeFilters: string[];
  setActiveFilters: Dispatch<SetStateAction<string[]>>;
  setOnlyHighlighted: (val: boolean) => void;
  setShowCustomMarks: (val: boolean) => void;
  query: string;
  setQuery: (val: string) => void;
}

export const WaterfallContext = createContext<Partial<IWaterfallContext>>({});

export const WaterfallProvider: React.FC<PropsWithChildren<IWaterfallContext>> = ({
  children,
  data,
  markerItems,
  onElementClick,
  onProjectionClick,
  onSidebarClick,
  showOnlyHighlightedNetworkRequests,
  showCustomMarks,
  sidebarItems,
  metadata,
  renderTooltipItem,
  totalNetworkRequests,
  highlightedNetworkRequests,
  fetchedNetworkRequests,
  activeStep,
  activeFilters,
  setActiveFilters,
  setOnlyHighlighted,
  setShowCustomMarks,
  query,
  setQuery,
}) => {
  return (
    <WaterfallContext.Provider
      value={{
        data,
        activeStep,
        markerItems,
        showOnlyHighlightedNetworkRequests,
        showCustomMarks,
        sidebarItems,
        metadata,
        onElementClick,
        onProjectionClick,
        onSidebarClick,
        renderTooltipItem,
        totalNetworkRequests,
        highlightedNetworkRequests,
        fetchedNetworkRequests,
        activeFilters,
        setActiveFilters,
        setOnlyHighlighted,
        setShowCustomMarks,
        query,
        setQuery,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  );
};

export const useWaterfallContext = () =>
  useContext(WaterfallContext as unknown as Context<IWaterfallContext>);
