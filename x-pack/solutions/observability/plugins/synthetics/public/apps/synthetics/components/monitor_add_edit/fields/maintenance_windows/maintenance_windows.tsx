/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMaintenanceWindows } from './use_maintenance_windows';
import {
  getMaintenanceWindowsForMonitor,
  type MaintenanceWindowInfo,
} from '../../../../state/maintenance_windows/api';

const CROSS_SPACE_MARKER = '__cross_space__';

export interface MaintenanceWindowsFieldProps {
  fullWidth?: boolean;
  onChange: (value: string[]) => void;
  value?: string[];
  readOnly?: boolean;
  monitorId?: string;
}

export const MaintenanceWindowsField = ({
  value,
  readOnly,
  onChange,
  fullWidth,
  monitorId,
}: MaintenanceWindowsFieldProps) => {
  const { data } = useMaintenanceWindows();
  const [crossSpaceMWDetails, setCrossSpaceMWDetails] = useState<MaintenanceWindowInfo[]>([]);
  const hasFetchedRef = useRef(false);

  const currentSpaceOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      data?.data?.map((option) => ({
        value: option.id,
        label: option.title,
      })) ?? [],
    [data]
  );

  const currentSpaceMWIds = useMemo(
    () => new Set(currentSpaceOptions.map((o) => o.value)),
    [currentSpaceOptions]
  );

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (!monitorId) return;

    hasFetchedRef.current = true;
    getMaintenanceWindowsForMonitor(monitorId)
      .then((response) => {
        setCrossSpaceMWDetails(response.maintenanceWindows);
      })
      .catch(() => {});
  }, [monitorId]);

  const crossSpaceOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    return crossSpaceMWDetails
      .filter((mw) => !currentSpaceMWIds.has(mw.id))
      .map((mw) => ({
        value: mw.id,
        label: mw.title,
        'data-cross-space': CROSS_SPACE_MARKER,
        'data-space-id': mw.spaceId,
      }));
  }, [crossSpaceMWDetails, currentSpaceMWIds]);

  const allOptions = useMemo(() => {
    if (crossSpaceOptions.length === 0) {
      return currentSpaceOptions;
    }
    return [...currentSpaceOptions, ...crossSpaceOptions];
  }, [currentSpaceOptions, crossSpaceOptions]);

  const selectedOptions = useMemo(() => {
    if (!value) return [];
    return allOptions.filter((option) => value.includes(option.value as string));
  }, [allOptions, value]);

  const maintenanceWindowsPlaceholder = i18n.translate(
    'xpack.synthetics.monitorConfig.maintenanceWindows.placeholder',
    {
      defaultMessage: 'Select maintenance windows',
    }
  );

  const handleChange = (newValue: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedIds = newValue.map((option) => option.value as string);
    onChange(selectedIds);
  };

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchValue: string, contentClassName: string) => {
      const isCrossSpace = (option as any)['data-cross-space'] === CROSS_SPACE_MARKER;
      const spaceId = (option as any)['data-space-id'] as string | undefined;

      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <span className={contentClassName}>{option.label}</span>
          </EuiFlexItem>
          {isCrossSpace && spaceId && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.synthetics.monitorConfig.maintenanceWindows.crossSpaceTooltip',
                  {
                    defaultMessage: 'This maintenance window belongs to space: {spaceId}',
                    values: { spaceId },
                  }
                )}
              >
                <EuiBadge color="hollow" iconType="spaces" tabIndex={0}>
                  {spaceId}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    []
  );

  return (
    <EuiComboBox<string>
      placeholder={maintenanceWindowsPlaceholder}
      aria-label={maintenanceWindowsPlaceholder}
      options={allOptions}
      onChange={handleChange}
      selectedOptions={selectedOptions}
      fullWidth={fullWidth}
      isDisabled={readOnly}
      renderOption={renderOption}
    />
  );
};
