/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { OnboardingCardId, OnboardingTopicId } from '../../../../onboarding/constants';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import type { MigrationType } from '../../../../../common/siem_migrations/types';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';
import * as i18n from './translations';

export const SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID = 'siemMigrationsSelectMigrationButton';

const migrationStatsToComboBoxOption = (
  stats: MigrationTaskStats
): EuiComboBoxOptionOption<string> => ({
  value: stats.id,
  label: stats.name,
  'data-test-subj': `migrationSelectionOption-${stats.id}`,
});

export interface HeaderButtonsProps {
  /** The type of migrations (e.g. rule, dashboards)*/
  migrationType: MigrationType;
  /** Available migrations stats */
  migrationsStats: MigrationTaskStats[];
  /** Selected migration id */
  selectedMigrationId: string | undefined;
  /** Handles migration selection changes */
  onMigrationIdChange: (selectedId?: string) => void;
}
export const HeaderButtons: React.FC<HeaderButtonsProps> = React.memo(
  ({ migrationType, migrationsStats, selectedMigrationId, onMigrationIdChange }) => {
    const migrationOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
      () => migrationsStats.map(migrationStatsToComboBoxOption),
      [migrationsStats]
    );

    const selectedMigrationOption = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
      const stats = migrationsStats.find(({ id }) => id === selectedMigrationId);
      return stats ? [migrationStatsToComboBoxOption(stats)] : [];
    }, [migrationsStats, selectedMigrationId]);

    const onChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onMigrationIdChange(selected[0].value);
    };

    const addAnotherMigrationButton = useMemo(() => {
      const onboardingCardId =
        migrationType === 'rule'
          ? OnboardingCardId.siemMigrationsRules
          : OnboardingCardId.siemMigrationsDashboards;
      return (
        <SecuritySolutionLinkButton
          data-test-subj="addAnotherMigrationButton"
          iconType="plusInCircle"
          deepLinkId={SecurityPageName.landing}
          path={`${OnboardingTopicId.siemMigrations}#${onboardingCardId}`}
        >
          {i18n.SIEM_MIGRATIONS_ADD_ANOTHER_MIGRATION_TITLE}
        </SecuritySolutionLinkButton>
      );
    }, [migrationType]);

    if (!migrationsStats.length) {
      return null;
    }

    return (
      <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive>
        <EuiFlexItem
          grow={false}
          css={css`
            width: 400px;
          `}
        >
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
            inputPopoverProps={{
              css: css`
                & .euiComboBox__inputWrap div {
                  inline-size: 100%;
                }
              `,
            }}
            fullWidth
          />
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem grow={false}>{addAnotherMigrationButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
HeaderButtons.displayName = 'HeaderButtons';
