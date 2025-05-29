/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { ClientPluginsStart } from '../../../../../plugin';

export interface MonitorSpacesProps {
  onChange: (value: string[]) => void;
  value?: string[] | null;
  readOnly?: boolean;
}

export const MonitorSpaces = ({ value, onChange, ...rest }: MonitorSpacesProps) => {
  const { space } = useKibanaSpace();
  const NAMESPACES_NAME = 'spaces';
  const { services } = useKibana<ClientPluginsStart>();
  const [spacesList, setSpacesList] = React.useState<Array<{ id: string; label: string }>>([]);
  const data = services.spaces?.ui.useSpaces();

  const {
    control,
    formState: { isSubmitted },
    trigger,
  } = useFormContext();
  const { isTouched, error } = control.getFieldState(NAMESPACES_NAME);

  const showFieldInvalid = (isSubmitted || isTouched) && !!error;

  useEffect(() => {
    if (data?.spacesDataPromise) {
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

  useEffect(() => {
    // set space as current value if no value is provided
    if (!value && space) {
      onChange([space.id]);
    }
  }, [onChange, space, value]);

  return (
    <EuiComboBox<string>
      fullWidth
      aria-label={SPACES_LABEL}
      placeholder={SPACES_LABEL}
      isInvalid={showFieldInvalid}
      onBlur={async () => {
        await trigger();
      }}
      options={spacesList}
      selectedOptions={(value ?? []).map((id) => {
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
        const selectedIds = selected.map((option) => option.id!);

        // if last value is not all spaces, remove all spaces value
        if (selectedIds.length > 0 && selectedIds[selectedIds.length - 1] !== allSpacesOption.id) {
          onChange(selectedIds.filter((id) => id !== allSpacesOption.id));
          return;
        }

        // if last value is all spaces, remove all other values
        if (selectedIds.length > 0 && selectedIds[selectedIds.length - 1] === allSpacesOption.id) {
          onChange([allSpacesOption.id]);
          return;
        }

        onChange(selectedIds);
      }}
    />
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
