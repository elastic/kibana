/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { SubSteps, useMigrationNameStep } from '../../../../../common/components';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { useKibana } from '../../../../../../common/lib/kibana';
import { QradarDataInputStep, type OnMigrationCreated } from '../../types';
import * as i18n from './translations';
import { useCopyExportQueryStep } from './sub_steps/copy_export_query';
import { useRulesFileUploadStep } from './sub_steps/rules_file_upload';
import { useCheckResourcesStep } from './sub_steps/check_resources';
import type { MigrationStepProps, OnMissingResourcesFetched } from '../../../../../common/types';
import { MigrationSource, SplunkDataInputStep } from '../../../../../common/types';
import type { RuleMigrationStats } from '../../../../types';

export const RulesDataInput = React.memo<MigrationStepProps>(
  ({
    dataInputStep,
    migrationStats,
    migrationSource,
    onMigrationCreated,
    onMissingResourcesFetched,
  }) => {
    const dataInputNumber = useMemo(
      () =>
        migrationSource === MigrationSource.QRADAR
          ? QradarDataInputStep.Rules
          : SplunkDataInputStep.Upload,
      [migrationSource]
    );
    const dataInputStatus = useMemo(
      () =>
        getEuiStepStatus(
          migrationSource === MigrationSource.QRADAR
            ? QradarDataInputStep.Rules
            : SplunkDataInputStep.Upload,
          dataInputStep
        ),
      [dataInputStep, migrationSource]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiStepNumber
                  titleSize="xs"
                  number={dataInputNumber}
                  status={dataInputStatus}
                  data-test-subj="rulesDataInputStepNumber"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs" data-test-subj="rulesDataInputTitle">
                  <b>{i18n.RULES_DATA_INPUT_TITLE}</b>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {dataInputStatus === 'current' && (
            <EuiFlexItem>
              <RulesDataInputSubSteps
                dataInputStep={dataInputStep}
                migrationSource={migrationSource}
                migrationStats={migrationStats}
                onMigrationCreated={onMigrationCreated}
                onMissingResourcesFetched={onMissingResourcesFetched}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
RulesDataInput.displayName = 'RulesDataInput';

const END = 10 as const;
type SubStep = 1 | 2 | 3 | 4 | typeof END;

interface RulesDataInputSubStepsProps {
  dataInputStep: number;
  migrationSource: MigrationSource;
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: (createdMigrationStats: RuleMigrationStats) => void;
  onMissingResourcesFetched: OnMissingResourcesFetched;
}

export const RulesDataInputSubSteps = React.memo<RulesDataInputSubStepsProps>(
  ({ migrationStats, onMigrationCreated, onMissingResourcesFetched, migrationSource }) => {
    const { telemetry } = useKibana().services.siemMigrations.rules;
    const [subStep, setSubStep] = useState<SubStep>(migrationStats ? 4 : 1);

    const [migrationName, setMigrationName] = useState<string | undefined>(migrationStats?.name);

    const [isRulesFileReady, setIsRuleFileReady] = useState<boolean>(false);

    // Migration name step
    const setName = useCallback(
      (name: string) => {
        setMigrationName(name);
        if (name) {
          setSubStep(isRulesFileReady ? 3 : 2);
        } else {
          setSubStep(1);
        }
      },
      [isRulesFileReady]
    );
    const nameStep = useMigrationNameStep({
      status: getEuiStepStatus(1, subStep),
      setMigrationName: setName,
      migrationName,
    });

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep((currentSubStep) => (currentSubStep !== 1 ? 3 : currentSubStep)); // Move to the next step only if step 1 was completed

      telemetry.reportSetupQueryCopied({
        migrationId: migrationStats?.id,
        vendor: migrationSource,
      });
    }, [telemetry, migrationStats?.id, migrationSource]);
    const copyStep = useCopyExportQueryStep({
      status: getEuiStepStatus(2, subStep),
      onCopied,
      migrationSource,
    });

    // Upload rules step
    const onMigrationCreatedStep = useCallback<OnMigrationCreated>(
      (stats) => {
        onMigrationCreated(stats);
        setSubStep(4);
      },
      [onMigrationCreated]
    );

    const onRulesFileChanged = useCallback((files: FileList | null) => {
      setIsRuleFileReady(!!files?.length);
      setSubStep(3);
    }, []);
    const uploadStep = useRulesFileUploadStep({
      status: getEuiStepStatus(3, subStep),
      migrationStats,
      onRulesFileChanged,
      onMigrationCreated: onMigrationCreatedStep,
      migrationName,
      migrationSource,
    });

    // Check missing resources step
    const onMissingResourcesFetchedStep = useCallback<OnMissingResourcesFetched>(
      (missingResources) => {
        onMissingResourcesFetched(missingResources);
        setSubStep(END);
      },
      [onMissingResourcesFetched]
    );
    const resourcesStep = useCheckResourcesStep({
      status: getEuiStepStatus(4, subStep),
      migrationStats,
      onMissingResourcesFetched: onMissingResourcesFetchedStep,
      migrationSource,
    });

    const steps = useMemo<EuiStepProps[]>(
      () => [nameStep, copyStep, uploadStep, resourcesStep],
      [nameStep, copyStep, uploadStep, resourcesStep]
    );

    return <SubSteps steps={steps} data-test-subj="migrationsSubSteps" />;
  }
);
RulesDataInputSubSteps.displayName = 'RulesDataInputActive';
