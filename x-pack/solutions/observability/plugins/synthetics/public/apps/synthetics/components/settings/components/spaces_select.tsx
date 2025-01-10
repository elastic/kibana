/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';

import { ClientPluginsStart } from '../../../../../plugin';
import { PrivateLocation } from '../../../../../../common/runtime_types';

export const NAMESPACES_NAME = 'spaces';

export const SpaceSelector: React.FC = () => {
  const { services } = useKibana<ClientPluginsStart>();
  const [spacesList, setSpacesList] = React.useState<Array<{ id: string; label: string }>>([]);
  const data = services.spaces?.ui.useSpaces();

  const {
    control,
    formState: { isSubmitted },
    trigger,
  } = useFormContext<PrivateLocation>();
  const { isTouched, error } = control.getFieldState(NAMESPACES_NAME);

  const showFieldInvalid = (isSubmitted || isTouched) && !!error;

  useEffect(() => {
    if (data) {
      data.spacesDataPromise.then((spacesData) => {
        setSpacesList([
          allSpacesOption,
          ...[...spacesData.spacesMap].map(([spaceId, dataS]) => ({
            id: spaceId,
            label: dataS.name,
          })),
        ]);
      });
    }
  }, [data]);

  return (
    <EuiFormRow
      fullWidth
      label={SPACES_LABEL}
      helpText={HELP_TEXT}
      isInvalid={showFieldInvalid}
      error={showFieldInvalid ? NAMESPACES_NAME : undefined}
    >
      <Controller
        name={NAMESPACES_NAME}
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <EuiComboBox
            fullWidth
            aria-label={SPACES_LABEL}
            placeholder={SPACES_LABEL}
            isInvalid={showFieldInvalid}
            {...field}
            onBlur={async () => {
              await trigger();
            }}
            options={spacesList}
            selectedOptions={(field.value ?? []).map((id) => {
              const sp = spacesList.find((space) => space.id === id);
              if (!sp) {
                return {
                  id,
                  label: id,
                };
              }
              return { id: sp.id, label: sp.label };
            })}
            isClearable={true}
            onChange={(selected) => {
              const selectedIds = selected.map((option) => option.id);

              // if last value is not all spaces, remove all spaces value
              if (
                selectedIds.length > 0 &&
                selectedIds[selectedIds.length - 1] !== allSpacesOption.id
              ) {
                field.onChange(selectedIds.filter((id) => id !== allSpacesOption.id));
                return;
              }

              // if last value is all spaces, remove all other values
              if (
                selectedIds.length > 0 &&
                selectedIds[selectedIds.length - 1] === allSpacesOption.id
              ) {
                field.onChange([allSpacesOption.id]);
                return;
              }

              field.onChange(selectedIds);
            }}
          />
        )}
      />
    </EuiFormRow>
  );
};

export const ALL_SPACES_LABEL = i18n.translate('xpack.synthetics.spaceList.allSpacesLabel', {
  defaultMessage: `* All spaces`,
});

const allSpacesOption = {
  id: ALL_SPACES_ID,
  label: ALL_SPACES_LABEL,
};

const SPACES_LABEL = i18n.translate('xpack.synthetics.privateLocation.spacesLabel', {
  defaultMessage: 'Spaces ',
});

const HELP_TEXT = i18n.translate('xpack.synthetics.privateLocation.spacesHelpText', {
  defaultMessage: 'Select the spaces where this location will be available.',
});
