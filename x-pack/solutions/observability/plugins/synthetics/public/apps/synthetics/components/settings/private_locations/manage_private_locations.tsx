/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { PrivateLocationsTable } from './locations_table';
import { ManageEmptyState } from './manage_empty_state';
import { AddLocationFlyout, NewLocation } from './add_location_flyout';
import { usePrivateLocationsAPI } from './hooks/use_locations_api';
import {
  selectAddingNewPrivateLocation,
  setIsCreatePrivateLocationFlyoutVisible,
} from '../../../state/private_locations';
import { getServiceLocations } from '../../../state';
import { getAgentPoliciesAction } from '../../../state/agent_policies';

export const ManagePrivateLocations = () => {
  const dispatch = useDispatch();

  const isAddingNew = useSelector(selectAddingNewPrivateLocation);
  const setIsAddingNew = useCallback(
    (val: boolean) => dispatch(setIsCreatePrivateLocationFlyoutVisible(val)),
    [dispatch]
  );

  const { onSubmit, loading, privateLocations, onDelete, deleteLoading } = usePrivateLocationsAPI();

  useEffect(() => {
    dispatch(getAgentPoliciesAction.get());
    dispatch(getServiceLocations());
    // make sure flyout is closed when first visiting the page
    dispatch(setIsCreatePrivateLocationFlyoutVisible(false));
  }, [dispatch]);

  const handleSubmit = (formData: NewLocation) => {
    onSubmit(formData);
  };

  return (
    <>
      {loading ? (
        <LoadingState />
      ) : (
        <ManageEmptyState privateLocations={privateLocations} setIsAddingNew={setIsAddingNew}>
          <PrivateLocationsTable
            privateLocations={privateLocations}
            onDelete={onDelete}
            deleteLoading={deleteLoading}
          />
        </ManageEmptyState>
      )}

      {isAddingNew ? (
        <AddLocationFlyout
          setIsOpen={setIsAddingNew}
          onSubmit={handleSubmit}
          privateLocations={privateLocations}
          isLoading={loading}
        />
      ) : null}
    </>
  );
};
