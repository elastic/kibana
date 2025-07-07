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
import { ConfigKey } from '../constants';

export interface MonitorSpacesProps {
  onChange: (value: string[]) => void;
  value?: string[] | null;
  readOnly?: boolean;
}

/**
 * Returns the updated list of selected space ids based on the selection logic.
 * @param selectedIds Array of selected space ids
 * @param currentSpaceId The id of the current space
 * @param allSpacesId The id representing "All spaces"
 */
export function getUpdatedSpacesSelection(
  selectedIds: string[],
  currentSpaceId?: string,
  allSpacesId?: string
): string[] {
  if (allSpacesId && selectedIds.includes(allSpacesId)) {
    // Only return allSpacesId if selected, ignore all others including currentSpaceId
    return [allSpacesId];
  }
  // Remove allSpacesId if present (should only be present alone)
  const filtered = allSpacesId ? selectedIds.filter((id) => id !== allSpacesId) : selectedIds;
  if (filtered.length === 0 && currentSpaceId) {
    return [currentSpaceId];
  }
  if (currentSpaceId && !filtered.includes(currentSpaceId)) {
    return [...filtered, currentSpaceId];
  }
  return filtered;
}

export const MonitorSpaces = ({ value, onChange, ...rest }: MonitorSpacesProps) => {
  const { space: currentSpace } = useKibanaSpace();
  const { services } = useKibana<ClientPluginsStart>();
  const [spacesList, setSpacesList] = React.useState<Array<{ id: string; label: string }>>([]);
  const data = services.spaces?.ui.useSpaces();

  const {
    control,
    formState: { isSubmitted },
    trigger,
  } = useFormContext();
  const { isTouched, error } = control.getFieldState(ConfigKey.KIBANA_SPACES);

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

  // Ensure selected options always include the current space
  const selectedIds = React.useMemo(() => {
    if (!currentSpace) {
      return value ?? [];
    }
    if (!value || value.length === 0) {
      return [currentSpace.id];
    }
    if (value.includes(ALL_SPACES_ID)) {
      // If "All spaces" is selected, return it alone
      return [ALL_SPACES_ID];
    }
    return value.includes(currentSpace.id) ? value : [...value, currentSpace.id];
  }, [value, currentSpace]);

  // Compute if "All spaces" is selected
  const isAllSpacesSelected = selectedIds.includes(ALL_SPACES_ID);

  return (
    <EuiComboBox<string>
      fullWidth
      aria-label={SPACES_LABEL}
      placeholder={SPACES_LABEL}
      isInvalid={showFieldInvalid}
      onBlur={async () => {
        await trigger();
      }}
      options={spacesList.map((option) =>
        isAllSpacesSelected && option.id !== ALL_SPACES_ID ? { ...option, disabled: true } : option
      )}
      selectedOptions={spacesList.filter(({ id }) => selectedIds.includes(id))}
      isClearable={true}
      onChange={(selected) => {
        const newSelectedIds = selected.map((option) => option.id!);
        const updatedIds = getUpdatedSpacesSelection(
          newSelectedIds,
          currentSpace?.id,
          allSpacesOption.id
        );
        onChange(updatedIds);
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
