/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { UploadDashboardsPanel } from '../../../../../../../siem_migrations/dashboards/components/status_panels/upload_panel';
import {
  MissingPrivilegesCallOut,
  MissingPrivilegesDescription,
} from '../../../../../../../common/missing_privileges';
import { useUpsellingComponent } from '../../../../../../../common/hooks/use_upselling';
import { PanelText } from '../../../../../../../common/components/panel_text';
import { OnboardingCardId } from '../../../../../../constants';
import { CenteredLoadingSpinner } from '../../../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../../../types';
import { OnboardingCardContentPanel } from '../../../common/card_content_panel';
import type { StartMigrationCardMetadata } from '../common/types';
import { useStyles } from '../common/start_migration_card.styles';
import { START_MIGRATION_CARD_FOOTER_NOTE } from '../common/translations';

const StartDashboardMigrationBody: OnboardingCardComponent = React.memo(
  ({ setComplete, isCardComplete, setExpandedCardId, checkComplete }) => {
    const styles = useStyles();

    // useEffect(() => {
    //   // Set card complete if any migration is finished
    //   if (!isCardComplete(OnboardingCardId.dashboards) && migrationsStats) {
    //     if (migrationsStats.some(({ status }) => status === SiemMigrationTaskStatus.FINISHED)) {
    //       setComplete(true);
    //     }
    //   }
    // }, [isCardComplete, migrationsStats, setComplete]);

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
      <OnboardingCardContentPanel
        data-test-subj="startDashboardMigrationsCardBody"
        className={styles}
      >
        <UploadDashboardsPanel isUploadMore={false} />
        <EuiSpacer size="m" />
        <PanelText size="xs" subdued cursive>
          <p>{START_MIGRATION_CARD_FOOTER_NOTE}</p>
        </PanelText>
      </OnboardingCardContentPanel>
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
              <UploadDashboardsPanel isUploadMore={false} isDisabled />
            </EuiFlexItem>
          </EuiFlexGroup>
        </OnboardingCardContentPanel>
      );
    }

    const { missingCapabilities } = checkCompleteMetadata;
    if (missingCapabilities.length > 0) {
      return (
        <OnboardingCardContentPanel>
          <MissingPrivilegesCallOut>
            <MissingPrivilegesDescription privileges={missingCapabilities} />
          </MissingPrivilegesCallOut>
        </OnboardingCardContentPanel>
      );
    }

    return <StartDashboardMigrationBody {...props} />;
  });

StartDashboardMigrationCard.displayName = 'StartDashboardMigrationCard';

// eslint-disable-next-line import/no-default-export
export default StartDashboardMigrationCard;
