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

export const AddLocationFlyout = ({
  onSubmit,
  setIsOpen,
  privateLocations,
}: {
  onSubmit: (val: NewLocation) => void;
  setIsOpen: (val: boolean) => void;
  privateLocations: PrivateLocation[];
}) => {
  const form = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
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

  const { createLoading } = useSelector(selectPrivateLocationsState);

  const { spaces: spacesApi } = useKibana<ClientPluginsStart>().services;

  const ContextWrapper = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  const { handleSubmit } = form;
  const closeFlyout = () => {
    setIsOpen(false);
  };

  return (
    <ContextWrapper>
      <FormProvider {...form}>
        <EuiFlyout onClose={closeFlyout} style={{ width: 540 }}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{ADD_PRIVATE_LOCATION}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ManageEmptyState privateLocations={privateLocations} showEmptyLocations={false}>
              <LocationForm privateLocations={privateLocations} />
            </ManageEmptyState>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="syntheticsAddLocationFlyoutButton"
                  iconType="cross"
                  onClick={closeFlyout}
                  flush="left"
                  isLoading={createLoading}
                >
                  {CANCEL_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <NoPermissionsTooltip canEditSynthetics={canSave}>
                  <EuiButton
                    data-test-subj="syntheticsAddLocationFlyoutButton"
                    fill
                    onClick={handleSubmit(onSubmit)}
                    isLoading={createLoading}
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

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.cancelLabel', {
  defaultMessage: 'Cancel',
});

const SAVE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.saveLabel', {
  defaultMessage: 'Save',
});
