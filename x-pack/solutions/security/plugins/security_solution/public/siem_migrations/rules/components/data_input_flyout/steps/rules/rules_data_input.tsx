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
import type { OnMigrationCreated, OnMissingResourcesFetched } from '../../types';
import * as i18n from './translations';
import { QradarDataInputStep, SplunkDataInputStep } from '../constants';
import { useCopyExportQueryStep } from './sub_steps/copy_export_query';
import { useRulesFileUploadStep } from './sub_steps/rules_file_upload';
import { useCheckResourcesStep } from './sub_steps/check_resources';
import type { RuleMigrationStats } from '../../../../types';
import { MigrationSource } from '../../../../../common/types';

interface RulesDataInputSubStepsProps {
  migrationStats?: RuleMigrationStats;
  onMigrationCreated: OnMigrationCreated;
  onMissingResourcesFetched?: OnMissingResourcesFetched;
  migrationSource: MigrationSource;
}
interface RulesDataInputProps extends RulesDataInputSubStepsProps {
  dataInputStep: SplunkDataInputStep | QradarDataInputStep;
}
export const RulesDataInput = React.memo<RulesDataInputProps>(
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
          : SplunkDataInputStep.Rules,
      [migrationSource]
    );
    const dataInputStatus = useMemo(
      () =>
        getEuiStepStatus(
          migrationSource === MigrationSource.QRADAR
            ? QradarDataInputStep.Rules
            : SplunkDataInputStep.Rules,
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
export const RulesDataInputSubSteps = React.memo<RulesDataInputSubStepsProps>(
  ({ migrationStats, onMigrationCreated, onMissingResourcesFetched, migrationSource }) => {
    const { telemetry } = useKibana().services.siemMigrations.rules;
    const [subStep, setSubStep] = useState<{
      [MigrationSource.SPLUNK]: SubStep;
      [MigrationSource.QRADAR]: SubStep;
    }>({
      [MigrationSource.QRADAR]: migrationStats ? 4 : 1,
      [MigrationSource.SPLUNK]: migrationStats ? 4 : 1,
    });

    const setMigrationSubStep = useCallback(
      (step: SubStep) => {
        setSubStep((prev) => ({ ...prev, ...{ [migrationSource]: step } }));
      },
      [migrationSource]
    );

    const [migrationName, setMigrationName] = useState<{
      [MigrationSource.SPLUNK]: string | undefined;
      [MigrationSource.QRADAR]: string | undefined;
    }>({
      [MigrationSource.SPLUNK]: migrationStats?.name,
      [MigrationSource.QRADAR]: migrationStats?.name,
    });

    const setRulesMigrationName = useCallback(
      (name: string) => {
        setMigrationName((prev) => ({ ...prev, ...{ [migrationSource]: name } }));
      },
      [migrationSource]
    );
    const [isRulesFileReady, setIsRuleFileReady] = useState<boolean>(false);

    // Migration name step
    const setName = useCallback(
      (name: string) => {
        setRulesMigrationName(name);
        if (name) {
          setMigrationSubStep(isRulesFileReady ? 3 : 2);
        } else {
          setMigrationSubStep(1);
        }
      },
      [isRulesFileReady, setMigrationSubStep, setRulesMigrationName]
    );
    const nameStep = useMigrationNameStep({
      status: getEuiStepStatus(1, subStep[migrationSource]),
      setMigrationName: setName,
      migrationName: migrationName[migrationSource],
    });

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep((currentSubStep) =>
        currentSubStep[migrationSource] !== 1
          ? { ...currentSubStep, [migrationSource]: 3 }
          : currentSubStep
      ); // Move to the next step only if step 1 was completed

      telemetry.reportSetupQueryCopied({ migrationId: migrationStats?.id });
    }, [telemetry, migrationStats?.id, migrationSource]);
    const copyStep = useCopyExportQueryStep({
      status: getEuiStepStatus(2, subStep[migrationSource]),
      onCopied,
      migrationSource,
    });

    // Upload rules step
    const onSplunkMigrationCreatedStep = useCallback<OnMigrationCreated>(
      (stats) => {
        onMigrationCreated(stats);
        setMigrationSubStep(4);
      },
      [onMigrationCreated, setMigrationSubStep]
    );
    const onQradarMigrationCreatedStep = useCallback<OnMigrationCreated>(
      (stats) => {
        onMigrationCreated(stats);
        setMigrationSubStep(END);
      },
      [onMigrationCreated, setMigrationSubStep]
    );
    const onRulesFileChanged = useCallback(
      (files: FileList | null) => {
        setIsRuleFileReady(!!files?.length);
        setMigrationSubStep(3);
      },
      [setMigrationSubStep]
    );
    const uploadStep = useRulesFileUploadStep({
      status: getEuiStepStatus(3, subStep[migrationSource]),
      migrationStats,
      onRulesFileChanged,
      onMigrationCreated:
        migrationSource === MigrationSource.SPLUNK
          ? onSplunkMigrationCreatedStep
          : onQradarMigrationCreatedStep,
      migrationName: migrationName[migrationSource],
      migrationSource,
    });

    // Check missing resources step
    const onMissingResourcesFetchedStep = useCallback<OnMissingResourcesFetched>(
      (missingResources) => {
        onMissingResourcesFetched?.(missingResources);
        setMigrationSubStep(END);
      },
      [onMissingResourcesFetched, setMigrationSubStep]
    );
    const resourcesStep = useCheckResourcesStep({
      status: getEuiStepStatus(4, subStep[migrationSource]),
      migrationStats,
      onMissingResourcesFetched: onMissingResourcesFetchedStep,
    });

    const steps = useMemo<EuiStepProps[]>(
      () =>
        migrationSource === MigrationSource.SPLUNK
          ? [nameStep, copyStep, uploadStep, resourcesStep]
          : [nameStep, copyStep, uploadStep],
      [migrationSource, nameStep, copyStep, uploadStep, resourcesStep]
    );

    return <SubSteps steps={steps} data-test-subj="migrationsSubSteps" />;
  }
);
RulesDataInputSubSteps.displayName = 'RulesDataInputActive';
