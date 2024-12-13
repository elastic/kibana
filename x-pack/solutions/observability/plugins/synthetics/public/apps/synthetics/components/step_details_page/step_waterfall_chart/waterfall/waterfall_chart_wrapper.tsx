/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiHealth } from '@elastic/eui';
import { JourneyStep, NetworkEvent } from '../../../../../../../common/runtime_types';
import { useDateFormat } from '../../../../../../hooks/use_date_format';
import { getSeriesAndDomain, getSidebarItems } from '../../common/network_data/data_formatting';
import { WaterfallNetworkItem, LegendItem } from '../../common/network_data/types';
import { RenderItem, WaterfallDataEntry } from '../../common/network_data/types';
import { useFlyout } from './waterfall_flyout/use_flyout';
import { WaterfallFlyout } from './waterfall_flyout/waterfall_flyout';
import { WaterfallSidebarItem } from './waterfall_sidebar_item';
import { MarkerItems, WaterfallProvider } from './context/waterfall_context';
import { WaterfallChart } from './waterfall_chart';

export const renderLegendItem: RenderItem<LegendItem> = (item) => {
  return (
    <EuiHealth color={item.color} className="eui-textNoWrap">
      {item.name}
    </EuiHealth>
  );
};

interface Props {
  total: number;
  activeStep?: JourneyStep;
  data: NetworkEvent[];
  markerItems?: MarkerItems;
}

export const WaterfallChartWrapper: React.FC<Props> = ({
  data,
  total,
  markerItems,
  activeStep,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [onlyHighlighted, setOnlyHighlighted] = useLocalStorage<boolean>(
    'xpack.synthetics.waterfallChart.showOnlyHighlighted',
    false
  );
  const [showCustomMarks, setShowCustomMarks] = useLocalStorage<boolean>(
    'xpack.synthetics.waterfallChart.showCustomMarks',
    false
  );

  const [networkData] = useState<NetworkEvent[]>(data);

  const hasFilters = activeFilters.length > 0;

  const dateFormatter = useDateFormat();
  const { series, domain, metadata, totalHighlightedRequests } = useMemo(() => {
    return getSeriesAndDomain(
      networkData,
      onlyHighlighted,
      dateFormatter,
      query,
      activeFilters,
      markerItems
    );
  }, [networkData, dateFormatter, query, activeFilters, onlyHighlighted, markerItems]);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(networkData, onlyHighlighted ?? false, query, activeFilters);
  }, [networkData, query, activeFilters, onlyHighlighted]);

  const {
    flyoutData,
    onBarClick,
    onProjectionClick,
    onSidebarClick,
    isFlyoutVisible,
    onFlyoutClose,
  } = useFlyout(metadata);

  const renderFlyout = useCallback(() => {
    return (
      <WaterfallFlyout
        flyoutData={flyoutData}
        onFlyoutClose={onFlyoutClose}
        isFlyoutVisible={isFlyoutVisible}
      />
    );
  }, [flyoutData, isFlyoutVisible, onFlyoutClose]);

  const highestSideBarIndex = Math.max(...series.map((sr: WaterfallDataEntry) => sr.x));

  const renderSidebarItem: RenderItem<WaterfallNetworkItem> = useCallback(
    (item) => {
      return (
        <WaterfallSidebarItem
          item={item}
          renderFilterScreenReaderText={hasFilters && !onlyHighlighted}
          onClick={onSidebarClick}
          highestIndex={highestSideBarIndex}
        />
      );
    },
    [hasFilters, onlyHighlighted, onSidebarClick, highestSideBarIndex]
  );

  return (
    <WaterfallProvider
      activeStep={activeStep}
      markerItems={markerItems}
      totalNetworkRequests={total}
      fetchedNetworkRequests={networkData.length}
      highlightedNetworkRequests={totalHighlightedRequests}
      data={series}
      onElementClick={useCallback(onBarClick, [onBarClick])}
      onProjectionClick={useCallback(onProjectionClick, [onProjectionClick])}
      onSidebarClick={onSidebarClick}
      showOnlyHighlightedNetworkRequests={onlyHighlighted ?? false}
      showCustomMarks={showCustomMarks ?? false}
      sidebarItems={sidebarItems}
      metadata={metadata}
      activeFilters={activeFilters}
      setActiveFilters={setActiveFilters}
      setOnlyHighlighted={setOnlyHighlighted}
      setShowCustomMarks={setShowCustomMarks}
      query={query}
      setQuery={setQuery}
      renderTooltipItem={useCallback((tooltipProps: any) => {
        return <EuiHealth color={String(tooltipProps?.colour)}>{tooltipProps?.value}</EuiHealth>;
      }, [])}
    >
      <WaterfallChart
        tickFormat={useCallback((d: number) => `${Number(d).toFixed(0)} ms`, [])}
        domain={domain}
        barStyleAccessor={useCallback(({ datum }: any) => {
          if (!datum.config?.isHighlighted) {
            return {
              rect: {
                fill: datum.config?.colour,
                opacity: '0.1',
              },
            };
          }
          return datum.config.colour;
        }, [])}
        renderSidebarItem={renderSidebarItem}
        renderLegendItem={renderLegendItem}
        renderFlyout={renderFlyout}
      />
    </WaterfallProvider>
  );
};
