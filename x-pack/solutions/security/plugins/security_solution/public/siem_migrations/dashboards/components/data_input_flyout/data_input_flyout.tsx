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
  EuiSuperSelect,
  EuiFormRow,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n as kbnI18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { useStartDashboardsMigrationModal } from '../../hooks/use_start_dashboard_migration_modal';
import type { DashboardMigrationStats } from '../../types';
import { useStartMigration } from '../../logic/use_start_migration';
import type { HandleMissingResourcesIndexed, MigrationSettingsBase } from '../../../common/types';
import { MigrationSource, SplunkDataInputStep } from '../../../common/types';
import { useMissingResources } from '../../../common/hooks/use_missing_resources';
import { STEP_COMPONENTS } from './configs';
import { SentinelDashboardDataInputStep } from './steps/constants';
import { PanelText } from '../../../../common/components/panel_text';
import { getCopyrightNoticeByVendor } from '../../../common/utils/get_copyright_notice_by_vendor';

const MIGRATION_SOURCE_DROPDOWN_TITLE = kbnI18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.migrationSource.title',
  { defaultMessage: 'Source vendor' }
);

type SupportedDashboardSource = MigrationSource.SPLUNK | MigrationSource.SENTINEL;

const SOURCE_OPTIONS: Array<{ value: SupportedDashboardSource; inputDisplay: string }> = [
  {
    value: MigrationSource.SPLUNK,
    inputDisplay: kbnI18n.translate(
      'xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.migrationSource.splunk',
      { defaultMessage: 'Splunk' }
    ),
  },
  {
    value: MigrationSource.SENTINEL,
    inputDisplay: kbnI18n.translate(
      'xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.migrationSource.sentinel',
      { defaultMessage: 'Microsoft Sentinel (Technical preview)' }
    ),
  },
];

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
    const isSentinelDashboardsEnabled = useIsExperimentalFeatureEnabled(
      'sentinelDashboardsMigration'
    );

    const initialSource: SupportedDashboardSource =
      migrationStats?.vendor === MigrationSource.SENTINEL
        ? MigrationSource.SENTINEL
        : MigrationSource.SPLUNK;
    const [migrationSource, setMigrationSource] = useState<SupportedDashboardSource>(initialSource);

    const [dataInputStep, setDataInputStep] = useState<number>(SplunkDataInputStep.Upload);

    const setMissingResourcesStep: HandleMissingResourcesIndexed = useCallback(
      ({ newMissingResourcesIndexed }) => {
        if (migrationSource === MigrationSource.SENTINEL) {
          if (newMissingResourcesIndexed?.lookups.length) {
            setDataInputStep(SentinelDashboardDataInputStep.Watchlists);
            return;
          }
          setDataInputStep(SentinelDashboardDataInputStep.End);
          return;
        }

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
      [migrationSource]
    );

    const { missingResourcesIndexed, onMissingResourcesFetched } = useMissingResources({
      handleMissingResourcesIndexed: setMissingResourcesStep,
      migrationSource,
    });

    const isSourceSelectorVisible = isSentinelDashboardsEnabled && !migrationStats;

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
              {isSourceSelectorVisible && (
                <EuiFlexItem>
                  <EuiFormRow label={MIGRATION_SOURCE_DROPDOWN_TITLE} fullWidth>
                    <EuiSuperSelect
                      data-test-subj="dashboardMigrationSourceDropdown"
                      options={SOURCE_OPTIONS}
                      valueOfSelected={migrationSource}
                      onChange={setMigrationSource}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              )}
              <>
                {STEP_COMPONENTS[migrationSource].map((step) => (
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
