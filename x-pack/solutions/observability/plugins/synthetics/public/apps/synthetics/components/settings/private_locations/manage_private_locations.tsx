/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { PrivateLocationsTable } from './locations_table';
import { ManageEmptyState } from './manage_empty_state';
import { AddLocationFlyout, NewLocation } from './add_location_flyout';
import { usePrivateLocationsAPI } from './hooks/use_locations_api';
import { selectAddingNewPrivateLocation } from '../../../state/private_locations/selectors';
import { getServiceLocations } from '../../../state';
import { getAgentPoliciesAction } from '../../../state/agent_policies';
import { setIsCreatePrivateLocationFlyoutVisible } from '../../../state/private_locations/actions';
import { ClientPluginsStart } from '../../../../../plugin';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const ManagePrivateLocations = () => {
  const dispatch = useDispatch();
  const { services } = useKibana<ClientPluginsStart>();

  const spacesApi = services.spaces;

  const SpacesContextProvider = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

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
    <SpacesContextProvider>
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
        />
      ) : null}
    </SpacesContextProvider>
  );
};
