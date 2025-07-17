/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import * as i18n from './translations';
import type { RuleMigrationStats } from '../../types';

export const SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID = 'siemMigrationsSelectMigrationButton';

const migrationStatsToComboBoxOption = (
  stats: RuleMigrationStats
): EuiComboBoxOptionOption<string> => ({
  value: stats.id,
  label: stats.name,
  'data-test-subj': `migrationSelectionOption-${stats.id}`,
});

export interface HeaderButtonsProps {
  /** Available rule migrations stats */
  ruleMigrationsStats: RuleMigrationStats[];
  /** Selected rule migration id */
  selectedMigrationId: string | undefined;
  /** Handles migration selection changes */
  onMigrationIdChange: (selectedId?: string) => void;
}
export const HeaderButtons: React.FC<HeaderButtonsProps> = React.memo(
  ({ ruleMigrationsStats, selectedMigrationId, onMigrationIdChange }) => {
    const migrationOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
      () => ruleMigrationsStats.map(migrationStatsToComboBoxOption),
      [ruleMigrationsStats]
    );

    const selectedMigrationOption = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
      const stats = ruleMigrationsStats.find(({ id }) => id === selectedMigrationId);
      return stats ? [migrationStatsToComboBoxOption(stats)] : [];
    }, [ruleMigrationsStats, selectedMigrationId]);

    const onChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onMigrationIdChange(selected[0].value);
    };

    if (!ruleMigrationsStats.length) {
      return null;
    }

    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h6>{i18n.SIEM_MIGRATIONS_OPTION_TITLE}</h6>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiComboBox
            id={SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID}
            aria-label={i18n.SIEM_MIGRATIONS_OPTION_AREAL_LABEL}
            onChange={onChange}
            options={migrationOptions}
            selectedOptions={selectedMigrationOption}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            css={{ width: '500rem' }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
HeaderButtons.displayName = 'HeaderButtons';
