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
import { isEqual } from 'lodash';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { PrivateLocationsTable } from './locations_table';
import { ManageEmptyState } from './manage_empty_state';
import { AddOrEditLocationFlyout, NewLocation } from './add_or_edit_location_flyout';
import { usePrivateLocationsAPI } from './hooks/use_locations_api';
import {
  selectPrivateLocationFlyoutVisible,
  selectPrivateLocationToEdit,
} from '../../../state/private_locations/selectors';
import { getServiceLocations } from '../../../state';
import { getAgentPoliciesAction } from '../../../state/agent_policies';
import {
  setIsPrivateLocationFlyoutVisible as setIsPrivateLocationFlyoutVisible,
  setPrivateLocationToEdit,
} from '../../../state/private_locations/actions';
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

  const isPrivateLocationFlyoutVisible = useSelector(selectPrivateLocationFlyoutVisible);
  const privateLocationToEdit = useSelector(selectPrivateLocationToEdit);
  const setIsFlyoutOpen = useCallback(
    (val: boolean) => dispatch(setIsPrivateLocationFlyoutVisible(val)),
    [dispatch]
  );

  const {
    onCreateLocationAPI,
    onEditLocationAPI,
    loading,
    privateLocations,
    onDeleteLocationAPI,
    deleteLoading,
  } = usePrivateLocationsAPI();

  useEffect(() => {
    dispatch(getAgentPoliciesAction.get());
    dispatch(getServiceLocations());
    // make sure flyout is closed when first visiting the page
    dispatch(setIsPrivateLocationFlyoutVisible(false));
  }, [dispatch]);

  const handleSubmit = (formData: NewLocation) => {
    if (privateLocationToEdit) {
      const isLabelChanged = formData.label !== privateLocationToEdit.label;
      const areTagsChanged = !isEqual(formData.tags, privateLocationToEdit.tags);
      if (!isLabelChanged && !areTagsChanged) {
        onCloseFlyout();
      } else {
        onEditLocationAPI(privateLocationToEdit.id, { label: formData.label, tags: formData.tags });
      }
    } else {
      onCreateLocationAPI(formData);
    }
  };

  const onEditLocation = (privateLocation: PrivateLocation) => {
    dispatch(setPrivateLocationToEdit(privateLocation));
    setIsFlyoutOpen(true);
  };

  const onCloseFlyout = () => {
    if (privateLocationToEdit) {
      dispatch(setPrivateLocationToEdit(undefined));
    }
    setIsFlyoutOpen(false);
  };

  return (
    <SpacesContextProvider>
      {loading ? (
        <LoadingState />
      ) : (
        <ManageEmptyState privateLocations={privateLocations} setIsFlyoutOpen={setIsFlyoutOpen}>
          <PrivateLocationsTable
            privateLocations={privateLocations}
            onDelete={onDeleteLocationAPI}
            onEdit={onEditLocation}
            deleteLoading={deleteLoading}
          />
        </ManageEmptyState>
      )}

      {isPrivateLocationFlyoutVisible ? (
        <AddOrEditLocationFlyout
          onCloseFlyout={onCloseFlyout}
          onSubmit={handleSubmit}
          privateLocations={privateLocations}
          privateLocationToEdit={privateLocationToEdit}
        />
      ) : null}
    </SpacesContextProvider>
  );
};
