/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../../../../common/lib/kibana';
import type { RuleMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { OnMigrationCreated, OnMissingResourcesFetched } from '../../types';
import * as i18n from './translations';
import { DataInputStep } from '../constants';
import { getStatus } from '../common/get_status';
import { SubSteps } from '../common/sub_step';
import { useCopyExportQueryStep } from './sub_steps/copy_export_query';
import { useRulesFileUploadStep } from './sub_steps/rules_file_upload';
import { useCheckResourcesStep } from './sub_steps/check_resources';

interface RulesDataInputSubStepsProps {
  migrationStats?: RuleMigrationTaskStats;
  onMigrationCreated: OnMigrationCreated;
  onMissingResourcesFetched: OnMissingResourcesFetched;
}
interface RulesDataInputProps extends RulesDataInputSubStepsProps {
  dataInputStep: DataInputStep;
}
export const RulesDataInput = React.memo<RulesDataInputProps>(
  ({ dataInputStep, migrationStats, onMigrationCreated, onMissingResourcesFetched }) => {
    const dataInputStatus = useMemo(
      () => getStatus(DataInputStep.Rules, dataInputStep),
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
                  number={DataInputStep.Rules}
                  status={dataInputStatus}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <b>{i18n.RULES_DATA_INPUT_TITLE}</b>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {dataInputStatus === 'current' && (
            <EuiFlexItem>
              <RulesDataInputSubSteps
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
type SubStep = 1 | 2 | 3 | typeof END;
export const RulesDataInputSubSteps = React.memo<RulesDataInputSubStepsProps>(
  ({ migrationStats, onMigrationCreated, onMissingResourcesFetched }) => {
    const { telemetry } = useKibana().services.siemMigrations.rules;
    const [subStep, setSubStep] = useState<SubStep>(migrationStats ? 3 : 1);

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep(2);
      telemetry.reportSetupRulesQueryCopied({ migrationId: migrationStats?.id });
    }, [telemetry, migrationStats?.id]);

    const copyStep = useCopyExportQueryStep({ status: getStatus(1, subStep), onCopied });

    // Upload rules step
    const onMigrationCreatedStep = useCallback<OnMigrationCreated>(
      (stats) => {
        onMigrationCreated(stats);
        setSubStep(3);
      },
      [onMigrationCreated]
    );
    const uploadStep = useRulesFileUploadStep({
      status: getStatus(2, subStep),
      migrationStats,
      onMigrationCreated: onMigrationCreatedStep,
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
RulesDataInputSubSteps.displayName = 'RulesDataInputActive';
