/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DashboardMigrationDataInputWrapper } from '../../../../../../../siem_migrations/dashboards/components/data_input_flyout/wrapper';
import { UploadDashboardsSectionPanel } from '../../../../../../../siem_migrations/dashboards/components/status_panels/upload_panel';
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
import { DashboardMigrationsPanels } from './dashboard_migrations_panels';
import { useLatestStats } from '../../../../../../../siem_migrations/dashboards/service/hooks/use_latest_stats';

const StartDashboardMigrationBody: OnboardingCardComponent = React.memo(
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
      <DashboardMigrationDataInputWrapper onFlyoutClosed={onFlyoutClosed}>
        <OnboardingCardContentPanel
          data-test-subj="startDashboardMigrationsCardBody"
          className={styles}
        >
          {isLoading ? (
            <CenteredLoadingSpinner />
          ) : (
            <DashboardMigrationsPanels
              migrationsStats={migrationsStats}
              isConnectorsCardComplete={isConnectorsCardComplete}
              expandConnectorsCard={expandConnectorsCard}
            />
          )}
        </OnboardingCardContentPanel>
      </DashboardMigrationDataInputWrapper>
    );
  }
);
StartDashboardMigrationBody.displayName = 'StartDashboardMigrationsBody';

export const StartDashboardMigrationCard: OnboardingCardComponent<StartMigrationCardMetadata> =
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
              <UploadDashboardsSectionPanel isUploadMore={false} isDisabled />
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

    return <StartDashboardMigrationBody {...props} />;
  });

StartDashboardMigrationCard.displayName = 'StartDashboardMigrationCard';

// eslint-disable-next-line import/no-default-export
export default StartDashboardMigrationCard;
