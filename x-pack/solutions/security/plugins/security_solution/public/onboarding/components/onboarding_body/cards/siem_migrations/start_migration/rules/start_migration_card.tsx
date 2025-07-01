/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import {
  MissingPrivilegesCallOut,
  MissingPrivilegesDescription,
} from '../../../../../../../common/missing_privileges';
import { useUpsellingComponent } from '../../../../../../../common/hooks/use_upselling';
import { PanelText } from '../../../../../../../common/components/panel_text';
import { RuleMigrationDataInputWrapper } from '../../../../../../../siem_migrations/rules/components/data_input_flyout/data_input_wrapper';
import { SiemMigrationTaskStatus } from '../../../../../../../../common/siem_migrations/constants';
import { OnboardingCardId } from '../../../../../../constants';
import { useLatestStats } from '../../../../../../../siem_migrations/rules/service/hooks/use_latest_stats';
import { CenteredLoadingSpinner } from '../../../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../../../types';
import { OnboardingCardContentPanel } from '../../../common/card_content_panel';
import type { StartMigrationCardMetadata } from '../common/types';
import { RuleMigrationsPanels } from './rule_migrations_panels';
import { useStyles } from '../common/start_migration_card.styles';
import { UploadRulesSectionPanel } from './upload_rules_panel';
import { START_MIGRATION_CARD_FOOTER_NOTE } from '../common/translations';

const StartMigrationsBody: OnboardingCardComponent = React.memo(
  ({ setComplete, isCardComplete, setExpandedCardId, checkComplete }) => {
    const styles = useStyles();
    const { data: migrationsStats, isLoading, refreshStats } = useLatestStats();

    useEffect(() => {
      // Set card complete if any migration is finished
      if (!isCardComplete(OnboardingCardId.siemMigrationsRules) && migrationsStats) {
        if (migrationsStats.some(({ status }) => status === SiemMigrationTaskStatus.FINISHED)) {
          setComplete(true);
        }
      }
    }, [isCardComplete, migrationsStats, setComplete]);

    const isConnectorsCardComplete = useMemo(
      () => isCardComplete(OnboardingCardId.siemMigrationsAiConnectors),
      [isCardComplete]
    );

    const expandConnectorsCard = useCallback(() => {
      setExpandedCardId(OnboardingCardId.siemMigrationsAiConnectors);
    }, [setExpandedCardId]);

    const onFlyoutClosed = useCallback(() => {
      refreshStats();
      checkComplete();
    }, [refreshStats, checkComplete]);

    return (
      <RuleMigrationDataInputWrapper onFlyoutClosed={onFlyoutClosed}>
        <OnboardingCardContentPanel data-test-subj="StartMigrationsCardBody" className={styles}>
          {isLoading ? (
            <CenteredLoadingSpinner />
          ) : (
            <RuleMigrationsPanels
              migrationsStats={migrationsStats}
              isConnectorsCardComplete={isConnectorsCardComplete}
              expandConnectorsCard={expandConnectorsCard}
            />
          )}
          <EuiSpacer size="m" />
          <PanelText size="xs" subdued cursive>
            <p>{START_MIGRATION_CARD_FOOTER_NOTE}</p>
          </PanelText>
        </OnboardingCardContentPanel>
      </RuleMigrationDataInputWrapper>
    );
  }
);
StartMigrationsBody.displayName = 'StartMigrationsBody';

export const StartMigrationCard: OnboardingCardComponent<StartMigrationCardMetadata> = React.memo(
  ({ checkCompleteMetadata, ...props }) => {
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
              <UploadRulesSectionPanel isUploadMore={false} isDisabled />
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

    return <StartMigrationsBody {...props} />;
  }
);
StartMigrationCard.displayName = 'StartMigrationCard';

// eslint-disable-next-line import/no-default-export
export default StartMigrationCard;
