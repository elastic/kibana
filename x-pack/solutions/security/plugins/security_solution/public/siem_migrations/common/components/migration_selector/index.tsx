/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiBadge, EuiComboBox } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';
import { SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID } from '../header_buttons';
import { SIEM_MIGRATIONS_OPTION_AREAL_LABEL } from '../header_buttons/translations';
import { MIGRATION_VENDOR_COLOR_CONFIG } from '../../utils/migration_vendor_color_config';
import { MIGRATION_VENDOR_DISPLAY_NAME } from '../../constants';

const renderVendorBadge = (vendor: MigrationTaskStats['vendor']) => {
  if (!vendor) {
    return undefined;
  }
  return (
    <EuiBadge
      color={MIGRATION_VENDOR_COLOR_CONFIG[vendor]}
      data-test-subj={`migrationSelectionOptionVendor-${vendor}`}
    >
      {MIGRATION_VENDOR_DISPLAY_NAME[vendor]}
    </EuiBadge>
  );
};

const migrationStatsToComboBoxOption = (
  stats: MigrationTaskStats
): EuiComboBoxOptionOption<string> => ({
  key: stats.id,
  value: stats.id,
  label: stats.name,
  prepend: renderVendorBadge(stats.vendor),
  'data-test-subj': `migrationSelectionOption-${stats.id}`,
});

export interface MigrationSelectorProps {
  /** Available migrations stats */
  migrationsStats: MigrationTaskStats[];
  /** Selected migration id */
  selectedMigrationId: string | undefined;
  /** Handles migration selection changes */
  onMigrationIdChange: (selectedId?: string) => void;
}

export const MigrationSelector: React.FC<MigrationSelectorProps> = React.memo(
  ({ migrationsStats, selectedMigrationId, onMigrationIdChange }) => {
    const migrationOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
      () => migrationsStats.map(migrationStatsToComboBoxOption),
      [migrationsStats]
    );

    const selectedMigrationOption = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
      if (!selectedMigrationId) return [];
      const selected = migrationOptions.find((opt) => opt.value === selectedMigrationId);
      return selected ? [selected] : [];
    }, [migrationOptions, selectedMigrationId]);

    const onChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onMigrationIdChange(selected[0].value);
    };

    if (!migrationsStats.length) {
      return null;
    }

    return (
      <EuiComboBox
        id={SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID}
        data-test-subj={SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID}
        aria-label={SIEM_MIGRATIONS_OPTION_AREAL_LABEL}
        onChange={onChange}
        options={migrationOptions}
        selectedOptions={selectedMigrationOption}
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        sortMatchesBy="startsWith"
        inputPopoverProps={{
          css: css`
            & .euiComboBox__inputWrap div {
              inline-size: 100%;
            }
          `,
        }}
        fullWidth
      />
    );
  }
);

MigrationSelector.displayName = 'MigrationSelector';
