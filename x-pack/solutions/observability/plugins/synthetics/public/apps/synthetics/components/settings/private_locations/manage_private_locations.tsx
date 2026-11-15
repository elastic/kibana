/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { i18n } from '@kbn/i18n';
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import { useSyntheticsSettingsContext } from '../../../contexts';
import {
  CANNOT_PERFORM_ACTION_SYNTHETICS,
  NEED_PERMISSIONS_PRIVATE_LOCATIONS,
} from '../../common/components/permissions';
import { useRegisterSettingsHeaderAction } from '../settings_header_action';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { PrivateLocationsTable } from './locations_table';
import { ManageEmptyState } from './manage_empty_state';
import type { NewLocation } from './add_or_edit_location_flyout';
import { AddOrEditLocationFlyout } from './add_or_edit_location_flyout';
import { getPrivateLocationEditPayload } from './get_private_location_edit_payload';
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
import type { ClientPluginsStart } from '../../../../../plugin';

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
  const { canSave, canManagePrivateLocations } = useSyntheticsSettingsContext();
  const setIsFlyoutOpen = useCallback(
    (val: boolean) => dispatch(setIsPrivateLocationFlyoutVisible(val)),
    [dispatch]
  );
  const canCreateLocation = Boolean(canSave && canManagePrivateLocations);
  const createLocationAction = useMemo(
    () => ({
      id: 'createPrivateLocation',
      label: CREATE_LOCATION_LABEL,
      iconType: 'plusCircle',
      testId: 'addPrivateLocationButton',
      disableButton: !canCreateLocation,
      tooltipContent: !canCreateLocation
        ? canSave
          ? NEED_PERMISSIONS_PRIVATE_LOCATIONS
          : CANNOT_PERFORM_ACTION_SYNTHETICS
        : undefined,
      run: () => setIsFlyoutOpen(true),
    }),
    [canCreateLocation, canSave, setIsFlyoutOpen]
  );
  useRegisterSettingsHeaderAction(createLocationAction);

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

  // Warn when Fleet secret storage is off AND this space has Vault connections:
  // in that case the delivered Vault credentials are stored unencrypted in the
  // agent policy rather than as a Fleet secret.
  const { http } = services;
  const [showSecretStorageWarning, setShowSecretStorageWarning] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await http?.get<{
          secretStorageEnabled: boolean;
          hasSecretConnections: boolean;
        }>(SYNTHETICS_API_URLS.FLEET_SECRET_STORAGE_STATUS);
        if (!cancelled) {
          setShowSecretStorageWarning(
            Boolean(res && !res.secretStorageEnabled && res.hasSecretConnections)
          );
        }
      } catch {
        // Non-fatal: leave the warning hidden if the status can't be fetched.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http]);

  const handleSubmit = (formData: NewLocation) => {
    if (privateLocationToEdit) {
      const editPayload = getPrivateLocationEditPayload(formData, privateLocationToEdit);
      if (!editPayload) {
        onCloseFlyout();
      } else {
        onEditLocationAPI(privateLocationToEdit.id, editPayload);
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
      {showSecretStorageWarning && (
        <>
          <KbnWarningCallout
            announceOnMount
            title={SECRET_STORAGE_WARNING_TITLE}
            data-test-subj="syntheticsVaultSecretStorageWarning"
          >
            {SECRET_STORAGE_WARNING_BODY}
          </KbnWarningCallout>
          <EuiSpacer size="m" />
        </>
      )}
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

const SECRET_STORAGE_WARNING_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.secretStorageWarning.title',
  { defaultMessage: 'Vault credentials may be stored unencrypted' }
);
const SECRET_STORAGE_WARNING_BODY = i18n.translate(
  'xpack.synthetics.privateLocations.secretStorageWarning.body',
  {
    defaultMessage:
      'Fleet secret storage is not enabled, so HashiCorp Vault connection credentials delivered to private-location agents are stored unencrypted in the agent policy. Secret storage turns on once all Fleet Servers meet the minimum required version — upgrade your Fleet Server(s) to secure these credentials.',
  }
);

const CREATE_LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorManagement.createLocation', {
  defaultMessage: 'Create location',
});
