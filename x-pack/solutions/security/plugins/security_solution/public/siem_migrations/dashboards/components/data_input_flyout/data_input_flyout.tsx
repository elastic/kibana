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
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { DashboardsUploadStep } from './steps/upload_dashboards';
import { MacrosDataInput } from './steps/macros/macros_data_input';
import { LookupsDataInput } from './steps/lookups/lookups_data_input';
import { DashboardUploadSteps } from './steps/constants';
import { useStartDashboardsMigrationModal } from '../../hooks/use_start_dashboard_migration_modal';
import type { DashboardMigrationStats } from '../../types';
import { useStartMigration } from '../../logic/use_start_migration';
import type { MigrationSettingsBase } from '../../../common/types';

interface DashboardMigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats: DashboardMigrationStats | undefined;
  setFlyoutMigrationStats: (migrationStats: DashboardMigrationStats | undefined) => void;
}

interface MissingResourcesIndexed {
  macros: string[];
  lookups: string[];
}

export const DashboardMigrationDataInputFlyout = React.memo(
  function DashboardMigrationDataInputFlyout({
    onClose,
    migrationStats,
    setFlyoutMigrationStats,
  }: DashboardMigrationDataInputFlyoutProps) {
    const modalTitleId = useGeneratedHtmlId();

    const { closeFlyout } = useMigrationDataInputContext();
    const [missingResourcesIndexed, setMissingResourcesIndexed] = useState<
      MissingResourcesIndexed | undefined
    >();
    const isRetry = migrationStats?.status === SiemMigrationTaskStatus.FINISHED;

    const [dataInputStep, setDataInputStep] = useState<DashboardUploadSteps>(
      DashboardUploadSteps.DashboardsUpload
    );

    const onMigrationCreated = useCallback(
      (createdMigrationStats: DashboardMigrationStats) => {
        setFlyoutMigrationStats(createdMigrationStats);
      },
      [setFlyoutMigrationStats]
    );

    const onMissingResourcesFetched = useCallback(
      (missingResources: SiemMigrationResourceBase[]) => {
        const newMissingResourcesIndexed = missingResources.reduce<MissingResourcesIndexed>(
          (acc, { type, name }) => {
            if (type === 'macro') {
              acc.macros.push(name);
            } else if (type === 'lookup') {
              acc.lookups.push(name);
            }
            return acc;
          },
          { macros: [], lookups: [] }
        );
        setMissingResourcesIndexed(newMissingResourcesIndexed);
        if (newMissingResourcesIndexed.macros.length) {
          setDataInputStep(DashboardUploadSteps.MacrosUpload);
          return;
        }
        if (newMissingResourcesIndexed.lookups.length) {
          setDataInputStep(DashboardUploadSteps.LookupsUpload);
          return;
        }
        setDataInputStep(DashboardUploadSteps.End);
      },
      []
    );

    const onAllLookupsCreated = useCallback(() => {
      setDataInputStep(DashboardUploadSteps.End);
    }, []);

    const { startMigration, isLoading: isStartLoading } = useStartMigration(onClose);
    const onStartMigrationWithSettings = useCallback(
      (settings: MigrationSettingsBase) => {
        if (migrationStats?.id) {
          startMigration(
            migrationStats.id,
            isRetry ? SiemMigrationRetryFilter.FAILED : undefined,
            settings
          );
        }
      },
      [isRetry, migrationStats?.id, startMigration]
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
            <EuiTitle size="m" id="dashboardMigrationDataInputFlyoutTitle">
              <EuiText>{i18n.DATA_INPUT_FLYOUT_TITLE}</EuiText>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <DashboardsUploadStep
                  dataInputStep={dataInputStep}
                  migrationStats={migrationStats}
                  onMigrationCreated={onMigrationCreated}
                  onMissingResourcesFetched={onMissingResourcesFetched}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <MacrosDataInput
                  dataInputStep={dataInputStep}
                  missingMacros={missingResourcesIndexed?.macros}
                  migrationStats={migrationStats}
                  onMissingResourcesFetched={onMissingResourcesFetched}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <LookupsDataInput
                  dataInputStep={dataInputStep}
                  missingLookups={missingResourcesIndexed?.lookups}
                  migrationStats={migrationStats}
                  onAllLookupsCreated={onAllLookupsCreated}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose}>
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
