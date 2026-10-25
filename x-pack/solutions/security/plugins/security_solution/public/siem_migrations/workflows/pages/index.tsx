/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { PageTitle } from '../../common/components/page_title';
import { WorkflowsTable } from '../components/workflows_table';
import {
  ADD_ANOTHER_MIGRATION,
  MIGRATION_OPTION_LABEL,
  MIGRATION_SELECT_ARIA_LABEL,
  MIGRATIONS_LABEL,
  MORE_ACTIONS,
  PAGE_TITLE,
  TINES_BADGE,
} from './translations';

const MIGRATION_OPTIONS: Array<EuiComboBoxOptionOption<string>> = [
  { label: MIGRATION_OPTION_LABEL, value: 'admin-migration' },
];

export const MigrationWorkflowsPage: React.FC = React.memo(() => {
  const [selectedMigration, setSelectedMigration] = useState(MIGRATION_OPTIONS);

  return (
    <SecuritySolutionPageWrapper>
      <HeaderPage title={<PageTitle title={PAGE_TITLE} />} border>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={MORE_ACTIONS} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="boxesVertical"
                aria-label={MORE_ACTIONS}
                onClick={() => {}}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="plusInCircle"
              color="text"
              style={{ backgroundColor: 'transparent' }}
            >
              {ADD_ANOTHER_MIGRATION}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderPage>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false} style={{ width: 400 }}>
          <EuiTitle size="xxxs">
            <h6>{MIGRATIONS_LABEL}</h6>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiComboBox
            aria-label={MIGRATION_SELECT_ARIA_LABEL}
            prepend={<EuiBadge color="hollow">{TINES_BADGE}</EuiBadge>}
            options={MIGRATION_OPTIONS}
            selectedOptions={selectedMigration}
            onChange={setSelectedMigration}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            fullWidth
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <WorkflowsTable />
    </SecuritySolutionPageWrapper>
  );
});
MigrationWorkflowsPage.displayName = 'MigrationWorkflowsPage';
