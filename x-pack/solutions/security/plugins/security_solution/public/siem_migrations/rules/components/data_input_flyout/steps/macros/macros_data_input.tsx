/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type { RuleMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { OnResourcesCreated, OnMissingResourcesFetched } from '../../types';
import { getStatus } from '../common/get_status';
import * as i18n from './translations';
import { DataInputStep } from '../constants';
import { SubSteps } from '../common/sub_step';
import { useCopyExportQueryStep } from './sub_steps/copy_export_query';
import { useMacrosFileUploadStep } from './sub_steps/macros_file_upload';
import { useCheckResourcesStep } from './sub_steps/check_resources';

interface MacrosDataInputSubStepsProps {
  migrationStats: RuleMigrationTaskStats;
  missingMacros: string[];
  onMissingResourcesFetched: OnMissingResourcesFetched;
}
interface MacrosDataInputProps
  extends Omit<MacrosDataInputSubStepsProps, 'migrationStats' | 'missingMacros'> {
  dataInputStep: DataInputStep;
  migrationStats?: RuleMigrationTaskStats;
  missingMacros?: string[];
}
export const MacrosDataInput = React.memo<MacrosDataInputProps>(
  ({ dataInputStep, migrationStats, missingMacros, onMissingResourcesFetched }) => {
    const dataInputStatus = useMemo(
      () => getStatus(DataInputStep.Macros, dataInputStep),
      [dataInputStep]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiStepNumber
                  titleSize="xs"
                  number={DataInputStep.Macros}
                  status={dataInputStatus}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
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
    const { telemetry } = useKibana().services.siemMigrations.rules;
    const [subStep, setSubStep] = useState<SubStep>(missingMacros.length ? 1 : 3);

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep(2);
      telemetry.reportSetupMacrosQueryCopied({ migrationId: migrationStats.id });
    }, [telemetry, migrationStats.id]);
    const copyStep = useCopyExportQueryStep({ status: getStatus(1, subStep), onCopied });

    // Upload macros step
    const onMacrosCreatedStep = useCallback<OnResourcesCreated>(() => {
      setSubStep(3);
    }, []);
    const uploadStep = useMacrosFileUploadStep({
      status: getStatus(2, subStep),
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
      status: getStatus(3, subStep),
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
