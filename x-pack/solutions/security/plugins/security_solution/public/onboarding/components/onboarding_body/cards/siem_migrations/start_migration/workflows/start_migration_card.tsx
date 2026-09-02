/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WorkflowMigrationDataInputWrapper } from '../../../../../../../siem_migrations/workflows/components/data_input_flyout/wrapper';
import { UploadWorkflowsSectionPanel } from '../../../../../../../siem_migrations/workflows/components/status_panels/upload_panel';
import {
  BasicMissingPrivilegesCallOut,
  MissingPrivilegesDescription,
} from '../../../../../../../common/components/missing_privileges';
import { useUpsellingComponent } from '../../../../../../../common/hooks/use_upselling';
import { CenteredLoadingSpinner } from '../../../../../../../common/components/centered_loading_spinner';
import { OnboardingCardId } from '../../../../../../constants';
import type { OnboardingCardComponent } from '../../../../../../types';
import { OnboardingCardContentPanel } from '../../../common/card_content_panel';
import type { StartMigrationCardMetadata } from '../common/types';
import { useStyles } from '../common/start_migration_card.styles';
import { WorkflowMigrationsPanels } from './workflow_migrations_panels';
import { useLatestStats } from '../../../../../../../siem_migrations/workflows/service/hooks/use_latest_stats';

const StartWorkflowMigrationBody: OnboardingCardComponent = React.memo(
  ({ setComplete, isCardComplete, setExpandedCardId, checkComplete }) => {
    const styles = useStyles();
    const { data: migrationsStats, isLoading } = useLatestStats();

    const isConnectorsCardComplete = useMemo(
      () => isCardComplete(OnboardingCardId.siemMigrationsAiConnectors),
      [isCardComplete]
    );

    const expandConnectorsCard = useCallback(() => {
      setExpandedCardId(OnboardingCardId.siemMigrationsAiConnectors);
    }, [setExpandedCardId]);

    const onFlyoutClosed = useCallback(() => {
      checkComplete();
    }, [checkComplete]);

    return (
      <WorkflowMigrationDataInputWrapper onFlyoutClosed={onFlyoutClosed}>
        <OnboardingCardContentPanel
          data-test-subj="startWorkflowMigrationsCardBody"
          className={styles}
        >
          {isLoading ? (
            <CenteredLoadingSpinner />
          ) : (
            <WorkflowMigrationsPanels
              migrationsStats={migrationsStats}
              isConnectorsCardComplete={isConnectorsCardComplete}
              expandConnectorsCard={expandConnectorsCard}
            />
          )}
        </OnboardingCardContentPanel>
      </WorkflowMigrationDataInputWrapper>
    );
  }
);
StartWorkflowMigrationBody.displayName = 'StartWorkflowMigrationBody';

export const StartWorkflowMigrationCard: OnboardingCardComponent<StartMigrationCardMetadata> =
  React.memo(({ checkCompleteMetadata, ...props }) => {
    const UpsellSectionComp = useUpsellingComponent('siem_migrations_start');
    if (!checkCompleteMetadata) {
      return <CenteredLoadingSpinner />;
    }

    if (UpsellSectionComp) {
      return (
        <OnboardingCardContentPanel paddingSize="none">
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem>
              <UpsellSectionComp />
            </EuiFlexItem>
            <EuiFlexItem>
              <UploadWorkflowsSectionPanel isDisabled />
            </EuiFlexItem>
          </EuiFlexGroup>
        </OnboardingCardContentPanel>
      );
    }

    const { missingCapabilities } = checkCompleteMetadata;
    if (missingCapabilities.length > 0) {
      return (
        <OnboardingCardContentPanel>
          <BasicMissingPrivilegesCallOut>
            <MissingPrivilegesDescription privileges={missingCapabilities} />
          </BasicMissingPrivilegesCallOut>
        </OnboardingCardContentPanel>
      );
    }

    return <StartWorkflowMigrationBody {...props} />;
  });

StartWorkflowMigrationCard.displayName = 'StartWorkflowMigrationCard';

// eslint-disable-next-line import/no-default-export
export default StartWorkflowMigrationCard;
