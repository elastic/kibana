/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import type { DataInputStepId } from './steps/constants';
import { DataInputStep } from './steps/constants';
import { useStartRulesMigrationModal } from '../../hooks/use_start_rules_migration_modal';
import type { RuleMigrationSettings, RuleMigrationStats } from '../../types';
import { useStartMigration } from '../../logic/use_start_migration';
import { useMigrationSourceStep } from '../../../common/components/migration_source_step';
import { MigrationSourceDropdown } from '../../../common/components/migration_source_step/migration_source_dropdown';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import {
  useQradarMigrationSteps,
  useSplunkMigrationSteps,
} from '../../../common/components/migration_source_step/migration_source_options';
import type {
  QradarMigrationSteps,
  SplunkMigrationSteps,
  Step,
} from '../../../common/components/migration_source_step/types';

export interface MigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats?: RuleMigrationStats;
}

function StepRenderer<K extends DataInputStepId>({ step }: { step: Step<K> }) {
  const Component = step.Component as React.ComponentType<typeof step.extraProps>;
  return <Component {...step.extraProps} />;
}

const RULES_MIGRATION_DATA_INPUT_FLYOUT_TITLE = 'rulesMigrationDataInputFlyoutTitle';

export const MigrationDataInputFlyout = React.memo<MigrationDataInputFlyoutProps>(
  ({ onClose, migrationStats: initialMigrationSats }) => {
    const modalTitleId = useGeneratedHtmlId({
      prefix: RULES_MIGRATION_DATA_INPUT_FLYOUT_TITLE,
    });

    const [migrationStats, setMigrationStats] = useState<RuleMigrationStats | undefined>(
      initialMigrationSats
    );

    const isRetry = migrationStats?.status === SiemMigrationTaskStatus.FINISHED;

    const [dataInputStep, setDataInputStep] = useState<DataInputStep>(DataInputStep.Rules);

    const onMigrationCreated = useCallback((createdMigrationStats: RuleMigrationStats) => {
      setMigrationStats(createdMigrationStats);
    }, []);

    const { startMigration, isLoading: isStartLoading } = useStartMigration(onClose);
    const onStartMigrationWithSettings = useCallback(
      (settings: RuleMigrationSettings) => {
        if (migrationStats?.id) {
          startMigration(
            migrationStats.id,
            isRetry ? SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED : undefined,
            settings
          );
        }
      },
      [isRetry, migrationStats?.id, startMigration]
    );
    const { modal: startMigrationModal, showModal: showStartMigrationModal } =
      useStartRulesMigrationModal({
        type: isRetry ? 'retry' : 'start',
        migrationStats,
        onStartMigrationWithSettings,
      });
    const onTranslateButtonClick = useCallback(() => {
      if (migrationStats?.id) {
        showStartMigrationModal();
      }
    }, [migrationStats?.id, showStartMigrationModal]);

    const { migrationSource, setMigrationSource } = useMigrationSourceStep();

    const splunkMigrationSteps: SplunkMigrationSteps | null = useSplunkMigrationSteps({
      setDataInputStep,
      dataInputStep,
      migrationSource,
      migrationStats,
      onMigrationCreated,
    });

    const qradarMigrationSteps: QradarMigrationSteps | null = useQradarMigrationSteps({
      dataInputStep,
      migrationSource,
      migrationStats,
      onMigrationCreated,
    });

    const steps = splunkMigrationSteps ?? qradarMigrationSteps;

    return (
      <>
        {startMigrationModal}
        <EuiFlyoutResizable
          onClose={onClose}
          size={850}
          maxWidth={1200}
          minWidth={500}
          data-test-subj="uploadRulesFlyout"
          aria-labelledby={modalTitleId}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={modalTitleId} aria-label={RULES_MIGRATION_DATA_INPUT_FLYOUT_TITLE}>
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.title"
                  defaultMessage="Upload SIEM rules"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <MigrationSourceDropdown
                  migrationSource={migrationSource}
                  setMigrationSource={setMigrationSource}
                />
              </EuiFlexItem>
              <>
                {steps?.map((step) => (
                  <EuiFlexItem key={step.id}>
                    <StepRenderer step={step} />
                  </EuiFlexItem>
                )) ?? <CenteredLoadingSpinner />}
              </>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose}>
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={onTranslateButtonClick}
                  disabled={!migrationStats?.id}
                  isLoading={isStartLoading}
                  data-test-subj="startMigrationButton"
                >
                  {isRetry ? (
                    <FormattedMessage
                      id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.retryTranslateButton"
                      defaultMessage="Retry translation"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.translateButton"
                      defaultMessage="Translate"
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyoutResizable>
      </>
    );
  }
);
MigrationDataInputFlyout.displayName = 'MigrationDataInputFlyout';
