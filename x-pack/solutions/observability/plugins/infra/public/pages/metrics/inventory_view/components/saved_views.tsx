/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useInventoryViews } from '../../../../hooks/use_inventory_views';
import { SavedViewsToolbarControls } from '../../../../components/saved_views/toolbar_control';
import { useWaffleViewState } from '../hooks/use_waffle_view_state';

export const SavedViews = () => {
  const { viewState } = useWaffleViewState();
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
  } = useInventoryViews();

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
      viewState={viewState}
    />
  );
};
