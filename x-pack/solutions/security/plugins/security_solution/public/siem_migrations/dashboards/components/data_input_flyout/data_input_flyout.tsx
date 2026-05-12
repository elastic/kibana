/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { useStartDashboardsMigrationModal } from '../../hooks/use_start_dashboard_migration_modal';
import type { DashboardMigrationStats } from '../../types';
import { useStartMigration } from '../../logic/use_start_migration';
import type { HandleMissingResourcesIndexed, MigrationSettingsBase } from '../../../common/types';
import { MigrationSource, SplunkDataInputStep } from '../../../common/types';
import { useMissingResources } from '../../../common/hooks/use_missing_resources';
import { STEP_COMPONENTS } from './configs';
import { PanelText } from '../../../../common/components/panel_text';
import { getCopyrightNoticeByVendor } from '../../../common/utils/get_copyright_notice_by_vendor';

interface DashboardMigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats: DashboardMigrationStats | undefined;
  setFlyoutMigrationStats: (migrationStats: DashboardMigrationStats | undefined) => void;
}

const DASHBOARDS_MIGRATION_DATA_INPUT_FLYOUT_TITLE = 'dashboardsMigrationDataInputFlyoutTitle';

export const DashboardMigrationDataInputFlyout = React.memo(
  function DashboardMigrationDataInputFlyout({
    onClose,
    migrationStats,
    setFlyoutMigrationStats,
  }: DashboardMigrationDataInputFlyoutProps) {
    const modalTitleId = useGeneratedHtmlId({
      prefix: DASHBOARDS_MIGRATION_DATA_INPUT_FLYOUT_TITLE,
    });

    const { closeFlyout } = useMigrationDataInputContext();

    const isRetry = migrationStats?.status === SiemMigrationTaskStatus.FINISHED;

    const [dataInputStep, setDataInputStep] = useState<SplunkDataInputStep>(
      SplunkDataInputStep.Upload
    );

    const setMissingResourcesStep: HandleMissingResourcesIndexed = useCallback(
      ({ newMissingResourcesIndexed }) => {
        if (newMissingResourcesIndexed?.macros.length) {
          setDataInputStep(SplunkDataInputStep.Macros);
          return;
        }

        if (newMissingResourcesIndexed?.lookups.length) {
          setDataInputStep(SplunkDataInputStep.Lookups);
          return;
        }

        setDataInputStep(SplunkDataInputStep.End);
      },
      []
    );

    const { missingResourcesIndexed, onMissingResourcesFetched } = useMissingResources({
      handleMissingResourcesIndexed: setMissingResourcesStep,
      migrationSource: MigrationSource.SPLUNK,
    });

    const onMigrationCreated = useCallback(
      (createdMigrationStats: DashboardMigrationStats) => {
        setFlyoutMigrationStats(createdMigrationStats);
      },
      [setFlyoutMigrationStats]
    );

    const { startMigration, isLoading: isStartLoading } = useStartMigration(onClose);
    const onStartMigrationWithSettings = useCallback(
      (settings: MigrationSettingsBase) => {
        if (migrationStats) {
          startMigration(
            migrationStats,
            isRetry ? SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED : undefined,
            settings
          );
        }
      },
      [isRetry, migrationStats, startMigration]
    );
    const { modal: startMigrationModal, showModal: showStartMigrationModal } =
      useStartDashboardsMigrationModal({
        type: isRetry ? 'retry' : 'start',
        migrationStats,
        onStartMigrationWithSettings,
      });
    const onTranslateButtonClick = useCallback(() => {
      if (migrationStats?.id) {
        showStartMigrationModal();
      }
    }, [migrationStats?.id, showStartMigrationModal]);

    return (
      <>
        {startMigrationModal}

        <EuiFlyoutResizable
          onClose={closeFlyout}
          ownFocus
          size={850}
          maxWidth={1200}
          minWidth={500}
          data-test-subj="dashboardMigrationDataInputFlyout"
          aria-labelledby={modalTitleId}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={modalTitleId} aria-label={DASHBOARDS_MIGRATION_DATA_INPUT_FLYOUT_TITLE}>
                {i18n.DATA_INPUT_FLYOUT_TITLE}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column" gutterSize="m">
              <>
                {STEP_COMPONENTS[MigrationSource.SPLUNK].map((step) => (
                  <EuiFlexItem key={step.id}>
                    <step.Component
                      dataInputStep={dataInputStep}
                      migrationSource={MigrationSource.SPLUNK}
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
                  <p>{getCopyrightNoticeByVendor(MigrationSource.SPLUNK)}</p>
                </PanelText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} data-test-subj="dataFlyoutCloseButton">
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.closeButton"
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
                      id="xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.retryTranslateButton"
                      defaultMessage="Retry translation"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.translateButton"
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
