/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { SubSteps } from '../sub_step';
import { getEuiStepStatus } from '../../../utils/get_eui_step_status';
import type { DashboardMigrationTaskStats } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { RuleMigrationTaskStats } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { OnResourcesCreated, OnMissingResourcesFetched } from '../types';
import * as i18n from './translations';
import { useCopyExportQueryStep } from './sub_steps/copy_export_query';
import { useMacrosFileUploadStep } from './sub_steps/macros_file_upload';
import { useCheckResourcesStep } from './sub_steps/check_resources';
import type { SiemRulesMigrationsTelemetry } from '../../../../rules/service/telemetry';

export enum DataInputStep {
  Items = 1,
  Macros = 2,
  Lookups = 3,
  End = 10,
}

interface MacrosDataInputSubStepsProps {
  migrationStats: RuleMigrationTaskStats | DashboardMigrationTaskStats;
  missingMacros: string[];
  onMissingResourcesFetched: OnMissingResourcesFetched;
  telemetry?: SiemRulesMigrationsTelemetry | undefined;
  resourceType: 'rule' | 'dashboard';
}
interface MacrosDataInputProps
  extends Omit<
    MacrosDataInputSubStepsProps,
    'migrationStats' | 'missingMacros' | 'telemetry' | 'resourceType'
  > {
  dataInputStep: DataInputStep;
  telemetry?: SiemRulesMigrationsTelemetry | undefined;
  migrationStats?: RuleMigrationTaskStats | DashboardMigrationTaskStats;
  missingMacros?: string[];
  resourceType: 'rule' | 'dashboard';
}
export const MacrosDataInput = React.memo<MacrosDataInputProps>(
  ({
    dataInputStep,
    telemetry,
    migrationStats,
    missingMacros,
    onMissingResourcesFetched,
    resourceType,
  }) => {
    const dataInputStatus = useMemo(
      () => getEuiStepStatus(DataInputStep.Macros, dataInputStep),
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
                  number={DataInputStep.Macros}
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
                telemetry={telemetry}
                migrationStats={migrationStats}
                missingMacros={missingMacros}
                onMissingResourcesFetched={onMissingResourcesFetched}
                resourceType={resourceType}
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
  ({ telemetry, migrationStats, missingMacros, onMissingResourcesFetched, resourceType }) => {
    const [subStep, setSubStep] = useState<SubStep>(missingMacros.length ? 1 : 3);

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep(2);
      telemetry?.reportSetupMacrosQueryCopied({ migrationId: migrationStats.id });
    }, [telemetry, migrationStats.id]);
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
      resourceType,
    });

    const steps = useMemo<EuiStepProps[]>(
      () => [copyStep, uploadStep, resourcesStep],
      [copyStep, uploadStep, resourcesStep]
    );

    return <SubSteps steps={steps} />;
  }
);
MacrosDataInputSubSteps.displayName = 'MacrosDataInputActive';
