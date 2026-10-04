/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import moment from 'moment';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  type EuiAccordionProps,
  EuiAccordion,
} from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { css } from '@emotion/react';
import { PanelText } from '../../../../common/components/panel_text';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import type { WorkflowMigrationStats } from '../../types';
import { MigrationPanelTitle } from '../../../common/components/migration_panels/migration_title';
import { useCompleteBadgeStyles } from '../../../common/hooks/use_complete_status_badge_styles';
import { TotalExecutionTime } from '../../../common/components/total_execution_time';
import { MigrationsLastError } from '../../../common/components/migration_panels/last_error';
import * as i18n from './translations';

const headerStyle = css`
  &:hover {
    cursor: pointer;
    text-decoration: underline;
  }
`;

export interface WorkflowMigrationResultPanelProps {
  migrationStats: WorkflowMigrationStats;
  isCollapsed?: boolean;
  onToggleCollapsed?: (isCollapsed: boolean) => void;
}

export const WorkflowMigrationResultPanel = React.memo<WorkflowMigrationResultPanelProps>(
  ({ migrationStats, isCollapsed = false, onToggleCollapsed }) => {
    const completeBadgeStyles = useCompleteBadgeStyles();

    const toggleCollapsed = useCallback(() => {
      onToggleCollapsed?.(!isCollapsed);
    }, [isCollapsed, onToggleCollapsed]);

    const buttonContent = (
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
        <EuiFlexItem onClick={toggleCollapsed} css={headerStyle}>
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <MigrationPanelTitle migrationStats={migrationStats} migrationType="workflow" />
            </EuiFlexItem>
            <EuiFlexItem>
              <PanelText size="s" subdued data-test-subj="migrationPanelDescription">
                <p>
                  {i18n.WORKFLOW_MIGRATION_COMPLETE_DESCRIPTION(
                    moment(migrationStats.created_at).format('MMMM Do YYYY, h:mm:ss a'),
                    moment(migrationStats.last_updated_at).fromNow()
                  )}
                </p>
                {migrationStats.last_execution?.total_execution_time_ms != null && (
                  <TotalExecutionTime
                    migrationType="workflow"
                    milliseconds={migrationStats.last_execution.total_execution_time_ms}
                  />
                )}
              </PanelText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge css={completeBadgeStyles} data-test-subj="migrationCompleteBadge">
            {i18n.WORKFLOW_MIGRATION_COMPLETE_BADGE}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="none"
        data-test-subj="workflowMigrationResultPanel"
      >
        <EuiAccordion
          id={`workflowMigrationResult-${migrationStats.id}`}
          buttonContent={buttonContent}
          forceState={isCollapsed ? 'closed' : 'open'}
          onToggle={((isOpen) => onToggleCollapsed?.(!isOpen)) as EuiAccordionProps['onToggle']}
          paddingSize="m"
          initialIsOpen={!isCollapsed}
        >
          <EuiSpacer size="s" />
          {migrationStats.last_execution?.error && (
            <>
              <MigrationsLastError
                message={migrationStats.last_execution.error}
                migrationType="workflow"
              />
              <EuiSpacer size="m" />
            </>
          )}
          <SecuritySolutionLinkButton
            deepLinkId={SecurityPageName.siemMigrationsWorkflows}
            path={migrationStats.id}
            data-test-subj="viewTranslatedWorkflowsButton"
          >
            {i18n.WORKFLOW_MIGRATION_VIEW_TRANSLATED_BUTTON}
          </SecuritySolutionLinkButton>
        </EuiAccordion>
      </EuiPanel>
    );
  }
);
WorkflowMigrationResultPanel.displayName = 'WorkflowMigrationResultPanel';
