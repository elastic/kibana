/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormProvider } from 'react-hook-form';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyout,
  EuiButton,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import { useSelector } from 'react-redux';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { LocationForm } from './location_form';
import { ManageEmptyState } from './manage_empty_state';
import { ClientPluginsStart } from '../../../../../plugin';
import { selectPrivateLocationsState } from '../../../state/private_locations/selectors';

export type NewLocation = Omit<PrivateLocation, 'id'>;
const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const AddOrEditLocationFlyout = ({
  onSubmit,
  onCloseFlyout,
  privateLocations,
  privateLocationToEdit,
}: {
  onSubmit: (val: NewLocation) => void;
  onCloseFlyout: () => void;
  privateLocations: PrivateLocation[];
  privateLocationToEdit?: PrivateLocation;
}) => {
  const form = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: privateLocationToEdit || {
      label: '',
      agentPolicyId: '',
      geo: {
        lat: 0,
        lon: 0,
      },
      spaces: [ALL_SPACES_ID],
    },
  });

  const { canSave, canManagePrivateLocations } = useSyntheticsSettingsContext();

  const { createLoading, editLoading } = useSelector(selectPrivateLocationsState);

  const { spaces: spacesApi } = useKibana<ClientPluginsStart>().services;

  const ContextWrapper = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  const { handleSubmit } = form;

  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <ContextWrapper>
      <FormProvider {...form}>
        <EuiFlyout onClose={onCloseFlyout} css={{ width: 540 }} aria-labelledby={flyoutTitleId}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>
                {privateLocationToEdit !== undefined ? EDIT_PRIVATE_LOCATION : ADD_PRIVATE_LOCATION}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ManageEmptyState privateLocations={privateLocations} showEmptyLocations={false}>
              <LocationForm
                privateLocations={privateLocations}
                privateLocationToEdit={privateLocationToEdit}
              />
            </ManageEmptyState>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="syntheticsLocationFlyoutCancelButton"
                  iconType="cross"
                  onClick={onCloseFlyout}
                  flush="left"
                  isLoading={createLoading || editLoading}
                >
                  {CANCEL_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <NoPermissionsTooltip canEditSynthetics={canSave}>
                  <EuiButton
                    data-test-subj="syntheticsLocationFlyoutSaveButton"
                    fill
                    onClick={handleSubmit(onSubmit)}
                    isLoading={createLoading || editLoading}
                    isDisabled={!canSave || !canManagePrivateLocations}
                  >
                    {SAVE_LABEL}
                  </EuiButton>
                </NoPermissionsTooltip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </FormProvider>
    </ContextWrapper>
  );
};

const ADD_PRIVATE_LOCATION = i18n.translate(
  'xpack.synthetics.monitorManagement.createPrivateLocations',
  {
    defaultMessage: 'Create private location',
  }
);

const EDIT_PRIVATE_LOCATION = i18n.translate(
  'xpack.synthetics.monitorManagement.editPrivateLocations',
  {
    defaultMessage: 'Edit private location',
  }
);

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.cancelLabel', {
  defaultMessage: 'Cancel',
});

const SAVE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.saveLabel', {
  defaultMessage: 'Save',
});
