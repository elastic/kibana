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
import type { DataInputStep } from './steps/constants';
import { QradarDataInputStep, SplunkDataInputStep } from './steps/constants';
import { useStartRulesMigrationModal } from '../../hooks/use_start_rules_migration_modal';
import { MigrationSource, type RuleMigrationSettings, type RuleMigrationStats } from '../../types';
import { useStartMigration } from '../../logic/use_start_migration';
import { useMigrationSourceStep } from '../migration_source_step/use_migration_source_step';
import { MigrationSourceDropdown } from '../migration_source_step/migration_source_dropdown';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import { STEP_COMPONENTS } from '../../configs';

export interface MigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats?: RuleMigrationStats;
  migrationSource?: MigrationSource;
}

const RULES_MIGRATION_DATA_INPUT_FLYOUT_TITLE = 'rulesMigrationDataInputFlyoutTitle';

export const MigrationDataInputFlyout = React.memo<MigrationDataInputFlyoutProps>(
  ({
    onClose,
    migrationStats: initialMigrationSats,
    migrationSource: initialMigrationSource = MigrationSource.SPLUNK,
  }) => {
    const modalTitleId = useGeneratedHtmlId({
      prefix: RULES_MIGRATION_DATA_INPUT_FLYOUT_TITLE,
    });

    const {
      migrationSource,
      setMigrationSource,
      migrationSourceDisabled,
      setMigrationSourceDisabled,
      migrationSourceOptions,
    } = useMigrationSourceStep(initialMigrationSource);

    const [migrationStats, setMigrationStats] = useState<RuleMigrationStats | undefined>(
      initialMigrationSats
    );

    const isRetry = migrationStats?.status === SiemMigrationTaskStatus.FINISHED;

    const [dataInputStep, setDataInputStep] = useState<DataInputStep>({
      [MigrationSource.SPLUNK]: SplunkDataInputStep.Rules,
      [MigrationSource.QRADAR]: QradarDataInputStep.Rules,
    });

    const setMigrationDataInputStep = useCallback(
      (step: DataInputStep[MigrationSource]) => {
        setDataInputStep((prev) => ({ ...prev, ...{ [migrationSource]: step } }));
      },
      [migrationSource]
    );

    const onMigrationCreated = useCallback(
      (createdMigrationStats: RuleMigrationStats) => {
        setMigrationStats(createdMigrationStats);
        setMigrationSourceDisabled(true);
      },
      [setMigrationStats, setMigrationSourceDisabled]
    );

    const { startMigration, isLoading: isStartLoading } = useStartMigration(onClose);
    const onStartMigrationWithSettings = useCallback(
      (settings: RuleMigrationSettings) => {
        if (typeof migrationStats?.id === 'string') {
          startMigration(
            migrationStats?.id as string,
            isRetry ? SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED : undefined,
            settings
          );
        }
      },
      [isRetry, migrationStats, startMigration]
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
    }, [migrationStats, showStartMigrationModal]);

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
                  disabled={migrationSourceDisabled}
                  migrationSourceOptions={migrationSourceOptions}
                />
              </EuiFlexItem>
              <>
                {STEP_COMPONENTS[migrationSource]?.map((step) => (
                  <EuiFlexItem key={step.id}>
                    <step.Component
                      dataInputStep={dataInputStep}
                      migrationSource={migrationSource}
                      onMigrationCreated={onMigrationCreated}
                      setMigrationDataInputStep={setMigrationDataInputStep}
                    />
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
