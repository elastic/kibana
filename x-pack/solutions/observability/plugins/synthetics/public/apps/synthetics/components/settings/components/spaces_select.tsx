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
import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form';

import { ClientPluginsStart } from '../../../../../plugin';

interface SpaceSelectorProps {
  helpText: string;
  isDisabled?: boolean;
}

export const SpaceSelector = <T extends FieldValues>({
  helpText,
  isDisabled = false,
}: SpaceSelectorProps) => {
  const NAMESPACES_NAME = 'spaces' as Path<T>;
  const { services } = useKibana<ClientPluginsStart>();
  const [spacesList, setSpacesList] = React.useState<Array<{ label: string; 'data-id': string }>>(
    []
  );
  const data = services.spaces?.ui.useSpaces();

  const {
    control,
    formState: { isSubmitted },
    trigger,
  } = useFormContext<T>();
  const { isTouched, error } = control.getFieldState(NAMESPACES_NAME);

  const showFieldInvalid = (isSubmitted || isTouched) && !!error;

  useEffect(() => {
    if (data?.spacesDataPromise) {
      data.spacesDataPromise.then((spacesData) => {
        setSpacesList([
          allSpacesOption,
          ...[...spacesData.spacesMap].map(([spaceId, dataS]) => ({
            'data-id': spaceId,
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
      helpText={helpText}
      isInvalid={showFieldInvalid}
      error={showFieldInvalid ? NAMESPACES_NAME : undefined}
    >
      <Controller
        name={NAMESPACES_NAME}
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <EuiComboBox
            isDisabled={isDisabled}
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
              const sp = spacesList.find((space) => space['data-id'] === id);
              if (!sp) {
                return {
                  'data-id': id,
                  label: id,
                };
              }
              return { 'data-id': sp['data-id'], label: sp.label };
            })}
            isClearable={true}
            onChange={(selected) => {
              const selectedIds = selected.map(
                (option: { label: string; 'data-id'?: string }) => option['data-id']
              );

              // if last value is not all spaces, remove all spaces value
              if (
                selectedIds.length > 0 &&
                selectedIds[selectedIds.length - 1] !== allSpacesOption['data-id']
              ) {
                field.onChange(selectedIds.filter((id) => id !== allSpacesOption['data-id']));
                return;
              }

              // if last value is all spaces, remove all other values
              if (
                selectedIds.length > 0 &&
                selectedIds[selectedIds.length - 1] === allSpacesOption['data-id']
              ) {
                field.onChange([allSpacesOption['data-id']]);
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
  label: ALL_SPACES_LABEL,
  'data-id': ALL_SPACES_LABEL,
};

const SPACES_LABEL = i18n.translate('xpack.synthetics.privateLocation.spacesLabel', {
  defaultMessage: 'Spaces ',
});
