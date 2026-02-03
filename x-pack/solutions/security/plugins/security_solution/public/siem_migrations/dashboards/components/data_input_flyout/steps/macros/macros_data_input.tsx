/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { SubSteps } from '../../../../../common/components/migration_steps';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type { DashboardMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { OnResourcesCreated } from '../../types';
import * as i18n from './translations';
import { useCopyExportQueryStep } from './sub_steps/copy_export_query';
import { useMacrosFileUploadStep } from './sub_steps/macros_file_upload';
import { useCheckResourcesStep } from '../common/check_resources';
import type { MigrationStepProps, OnMissingResourcesFetched } from '../../../../../common/types';
import { SplunkDataInputStep } from '../../../../../common/types';

interface MacrosDataInputSubStepsProps {
  migrationStats: DashboardMigrationTaskStats;
  missingMacros: string[];
  onMissingResourcesFetched: OnMissingResourcesFetched;
}

export const MacrosDataInput = React.memo<MigrationStepProps>(
  ({ dataInputStep, migrationStats, missingResourcesIndexed, onMissingResourcesFetched }) => {
    const missingMacros = useMemo(() => missingResourcesIndexed?.macros, [missingResourcesIndexed]);

    const dataInputStatus = useMemo(
      () => getEuiStepStatus(SplunkDataInputStep.Macros, dataInputStep),
      [dataInputStep]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiStepNumber
                  data-test-subj="macrosUploadStepNumber"
                  titleSize="xs"
                  number={SplunkDataInputStep.Macros}
                  status={dataInputStatus}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs" data-test-subj="macrosUploadTitle">
                  <b>{i18n.MACROS_DATA_INPUT_TITLE}</b>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {dataInputStatus === 'current' && migrationStats && missingMacros && (
            <EuiFlexItem>
              <MacrosDataInputSubSteps
                migrationStats={migrationStats}
                missingMacros={missingMacros}
                onMissingResourcesFetched={onMissingResourcesFetched}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
MacrosDataInput.displayName = 'MacrosDataInput';

const END = 10 as const;
type SubStep = 1 | 2 | 3 | typeof END;
export const MacrosDataInputSubSteps = React.memo<MacrosDataInputSubStepsProps>(
  ({ migrationStats, missingMacros, onMissingResourcesFetched }) => {
    const [subStep, setSubStep] = useState<SubStep>(missingMacros.length ? 1 : 3);
    const { telemetry } = useKibana().services.siemMigrations.dashboards;

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep(2);
      telemetry.reportSetupMacrosQueryCopied({
        migrationId: migrationStats.id,
        vendor: migrationStats.vendor,
      });
    }, [telemetry, migrationStats.id, migrationStats.vendor]);
    const copyStep = useCopyExportQueryStep({ status: getEuiStepStatus(1, subStep), onCopied });

    // Upload macros step
    const onMacrosCreatedStep = useCallback<OnResourcesCreated>(() => {
      setSubStep(3);
    }, []);
    const uploadStep = useMacrosFileUploadStep({
      status: getEuiStepStatus(2, subStep),
      migrationStats,
      missingMacros,
      onMacrosCreated: onMacrosCreatedStep,
    });

    // Check missing resources step
    const onMissingResourcesFetchedStep = useCallback<OnMissingResourcesFetched>(
      (newMissingResources) => {
        onMissingResourcesFetched(newMissingResources);
        setSubStep(END);
      },
      [onMissingResourcesFetched]
    );
    const resourcesStep = useCheckResourcesStep({
      status: getEuiStepStatus(3, subStep),
      migrationStats,
      onMissingResourcesFetched: onMissingResourcesFetchedStep,
    });

    const steps = useMemo<EuiStepProps[]>(
      () => [copyStep, uploadStep, resourcesStep],
      [copyStep, uploadStep, resourcesStep]
    );

    return <SubSteps steps={steps} />;
  }
);
MacrosDataInputSubSteps.displayName = 'MacrosDataInputActive';
