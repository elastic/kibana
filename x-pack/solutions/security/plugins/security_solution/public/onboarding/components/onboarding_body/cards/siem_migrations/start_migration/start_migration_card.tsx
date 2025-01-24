/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { PanelText } from '../../../../../../common/components/panel_text';
import { RuleMigrationDataInputWrapper } from '../../../../../../siem_migrations/rules/components/data_input_flyout/data_input_wrapper';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { OnboardingCardId } from '../../../../../constants';
import { useLatestStats } from '../../../../../../siem_migrations/rules/service/hooks/use_latest_stats';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import type { StartMigrationCardMetadata } from './types';
import { RuleMigrationsPanels } from './rule_migrations_panels';
import { useStyles } from './start_migration_card.styles';
import * as i18n from './translations';
import {
  MissingPrivilegesCallOut,
  MissingPrivilegesDescription,
} from '../../common/missing_privileges';

const StartMigrationsBody: OnboardingCardComponent = React.memo(
  ({ setComplete, isCardComplete, setExpandedCardId }) => {
    const styles = useStyles();
    const { data: migrationsStats, isLoading, refreshStats } = useLatestStats();

    useEffect(() => {
      // Set card complete if any migration is finished
      if (!isCardComplete(OnboardingCardId.siemMigrationsStart) && migrationsStats) {
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

    return (
      <RuleMigrationDataInputWrapper onFlyoutClosed={refreshStats}>
        <OnboardingCardContentPanel paddingSize="none" className={styles}>
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
          <PanelText size="xs" subdued>
            <p>{i18n.START_MIGRATION_CARD_FOOTER_NOTE}</p>
          </PanelText>
        </OnboardingCardContentPanel>
      </RuleMigrationDataInputWrapper>
    );
  }
);
StartMigrationsBody.displayName = 'StartMigrationsBody';

export const StartMigrationCard: OnboardingCardComponent<StartMigrationCardMetadata> = React.memo(
  ({ checkCompleteMetadata, ...props }) => {
    if (!checkCompleteMetadata) {
      return <CenteredLoadingSpinner />;
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
