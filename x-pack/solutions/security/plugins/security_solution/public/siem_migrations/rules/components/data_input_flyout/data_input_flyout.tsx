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
import { PanelText } from '../../../../common/components/panel_text';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import { useStartRulesMigrationModal } from '../../hooks/use_start_rules_migration_modal';
import { type RuleMigrationSettings, type RuleMigrationStats } from '../../types';
import { useStartMigration } from '../../logic/use_start_migration';
import { useMigrationSourceStep } from '../migration_source_step/use_migration_source_step';
import { MigrationSourceDropdown } from '../migration_source_step/migration_source_dropdown';
import { useMissingResources } from '../../../common/hooks/use_missing_resources';
import type {
  HandleMissingResourcesIndexed,
  MigrationStepProps,
  Step,
} from '../../../common/types';
import { MigrationSource, SplunkDataInputStep } from '../../../common/types';
import { STEP_COMPONENTS } from './configs';
import { QradarDataInputStep } from './types';
import { getCopyrightNoticeByVendor } from '../../../common/utils/get_copyright_notice_by_vendor';

export interface MigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats?: RuleMigrationStats;
  migrationSource?: MigrationSource;
}

const RULES_MIGRATION_DATA_INPUT_FLYOUT_TITLE = 'rulesMigrationDataInputFlyoutTitle';

export const MigrationDataInputFlyout = React.memo<MigrationDataInputFlyoutProps>(
  ({ onClose, migrationStats: initialMigrationStats }) => {
    const modalTitleId = useGeneratedHtmlId({
      prefix: RULES_MIGRATION_DATA_INPUT_FLYOUT_TITLE,
    });

    const {
      migrationSource,
      setMigrationSource,
      migrationSourceDisabled,
      setMigrationSourceDisabled,
      migrationSourceOptions,
    } = useMigrationSourceStep(initialMigrationStats?.vendor ?? MigrationSource.SPLUNK);

    const [migrationStats, setMigrationStats] = useState<RuleMigrationStats | undefined>(
      initialMigrationStats
    );

    const isRetry = migrationStats?.status === SiemMigrationTaskStatus.FINISHED;

    const [dataInputStep, setDataInputStep] = useState<number>(SplunkDataInputStep.Upload);

    const setMissingResourcesStep: HandleMissingResourcesIndexed = useCallback(
      ({ migrationSource: vendor, newMissingResourcesIndexed }) => {
        if (vendor === MigrationSource.QRADAR) {
          if (newMissingResourcesIndexed?.lookups.length) {
            setDataInputStep(QradarDataInputStep.ReferenceSet);
            return;
          }

          // when all reference sets are created, move to the next step
          setDataInputStep((currentStep) => {
            if (!migrationStats?.id) {
              return QradarDataInputStep.Rules;
            }
            // If we are not on the Reference Set step, move to the End step
            if (currentStep !== QradarDataInputStep.ReferenceSet) {
              return QradarDataInputStep.End;
            }
            return QradarDataInputStep.Enhancements;
          });
        }

        if (newMissingResourcesIndexed?.macros.length) {
          setDataInputStep(SplunkDataInputStep.Macros);
          return;
        }

        if (newMissingResourcesIndexed?.lookups.length) {
          setDataInputStep(SplunkDataInputStep.Lookups);
          return;
        }

        if (migrationStats?.id) {
          setDataInputStep(SplunkDataInputStep.End);
        }
      },
      [migrationStats?.id]
    );

    const { missingResourcesIndexed, onMissingResourcesFetched } = useMissingResources({
      handleMissingResourcesIndexed: setMissingResourcesStep,
      migrationSource,
    });

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
        if (!migrationStats?.id) {
          return;
        }

        startMigration(
          migrationStats,
          isRetry ? SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED : undefined,
          settings
        );
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
                  disabled={!!migrationStats?.id || migrationSourceDisabled}
                  migrationSourceOptions={migrationSourceOptions}
                />
              </EuiFlexItem>
              <>
                {STEP_COMPONENTS[migrationSource].map((step: Step<MigrationStepProps>) => (
                  <EuiFlexItem key={step.id}>
                    <step.Component
                      dataInputStep={dataInputStep}
                      migrationSource={migrationSource}
                      migrationStats={migrationStats}
                      missingResourcesIndexed={missingResourcesIndexed}
                      onMigrationCreated={onMigrationCreated}
                      onMissingResourcesFetched={onMissingResourcesFetched}
                      setDataInputStep={setDataInputStep}
                    />
                  </EuiFlexItem>
                ))}
              </>
              <EuiFlexItem>
                <PanelText size="xs" subdued cursive>
                  <p>{getCopyrightNoticeByVendor(migrationSource)}</p>
                </PanelText>
              </EuiFlexItem>
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
