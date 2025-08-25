/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useInventoryViewsContext } from '../hooks/use_inventory_views';
import { SavedViewsToolbarControls } from '../../../../components/saved_views/toolbar_control';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';

export const SavedViews = () => {
  const {
    currentView,
    views,
    isFetchingViews,
    isFetchingCurrentView,
    isCreatingView,
    isUpdatingView,
    createView,
    deleteViewById,
    fetchViews,
    updateViewById,
    switchViewById,
    setDefaultViewById,
  } = useInventoryViewsContext();

  const {
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    customMetrics,
    boundsOverride,
    autoBounds,
    accountId,
    region,
    legend,
    sort,
    timelineOpen,
    preferredSchema,
  } = useWaffleOptionsContext();
  const { currentTime, isAutoReloading } = useWaffleTimeContext();
  const { filterQuery } = useWaffleFiltersContext();

  return (
    <SavedViewsToolbarControls
      currentView={currentView}
      views={views}
      isFetchingViews={isFetchingViews}
      isFetchingCurrentView={isFetchingCurrentView}
      isCreatingView={isCreatingView}
      isUpdatingView={isUpdatingView}
      onCreateView={createView}
      onDeleteView={deleteViewById}
      onUpdateView={updateViewById}
      onLoadViews={fetchViews}
      onSetDefaultView={setDefaultViewById}
      onSwitchView={switchViewById}
      viewState={{
        metric,
        groupBy,
        nodeType,
        view,
        customOptions,
        customMetrics,
        boundsOverride,
        autoBounds,
        accountId,
        region,
        legend,
        sort,
        timelineOpen,
        time: currentTime,
        autoReload: isAutoReloading,
        // retrocompatibility with saved views
        filterQuery: {
          expression: filterQuery.query,
          kind: filterQuery.language,
        },
        preferredSchema,
      }}
    />
  );
};
