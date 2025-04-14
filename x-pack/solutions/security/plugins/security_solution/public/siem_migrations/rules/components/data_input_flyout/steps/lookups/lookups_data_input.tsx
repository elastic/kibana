/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStepNumber,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type {
  RuleMigrationResourceData,
  RuleMigrationTaskStats,
} from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { OnResourcesCreated } from '../../types';
import { getStatus } from '../common/get_status';
import * as i18n from './translations';
import { DataInputStep } from '../constants';
import { SubSteps } from '../common/sub_step';
import { useMissingLookupsListStep } from './sub_steps/missing_lookups_list';
import { useLookupsFileUploadStep } from './sub_steps/lookups_file_upload';

export type UploadedLookups = Record<string, string>;
export type AddUploadedLookups = (lookups: RuleMigrationResourceData[]) => void;

interface LookupsDataInputSubStepsProps {
  migrationStats: RuleMigrationTaskStats;
  missingLookups: string[];
  onAllLookupsCreated: OnResourcesCreated;
}
interface LookupsDataInputProps
  extends Omit<LookupsDataInputSubStepsProps, 'migrationStats' | 'missingLookups'> {
  dataInputStep: DataInputStep;
  migrationStats?: RuleMigrationTaskStats;
  missingLookups?: string[];
}
export const LookupsDataInput = React.memo<LookupsDataInputProps>(
  ({ dataInputStep, migrationStats, missingLookups, onAllLookupsCreated }) => {
    const dataInputStatus = useMemo(
      () => getStatus(DataInputStep.Lookups, dataInputStep),
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
                  number={DataInputStep.Lookups}
                  status={dataInputStatus}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <b>{i18n.LOOKUPS_DATA_INPUT_TITLE}</b>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {dataInputStatus === 'current' && migrationStats && missingLookups && (
            <>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {i18n.LOOKUPS_DATA_INPUT_DESCRIPTION}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <LookupsDataInputSubSteps
                  migrationStats={migrationStats}
                  missingLookups={missingLookups}
                  onAllLookupsCreated={onAllLookupsCreated}
                />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
LookupsDataInput.displayName = 'LookupsDataInput';

const END = 10 as const;
type SubStep = 1 | 2 | typeof END;
export const LookupsDataInputSubSteps = React.memo<LookupsDataInputSubStepsProps>(
  ({ migrationStats, missingLookups, onAllLookupsCreated }) => {
    const { telemetry } = useKibana().services.siemMigrations.rules;
    const [subStep, setSubStep] = useState<SubStep>(1);
    const [uploadedLookups, setUploadedLookups] = useState<UploadedLookups>({});

    const addUploadedLookups = useCallback<AddUploadedLookups>((lookups) => {
      setUploadedLookups((prevUploadedLookups) => ({
        ...prevUploadedLookups,
        ...Object.fromEntries(lookups.map((lookup) => [lookup.name, lookup.content])),
      }));
    }, []);

    useEffect(() => {
      if (missingLookups.every((lookupName) => uploadedLookups[lookupName] != null)) {
        setSubStep(END);
        onAllLookupsCreated();
      }
    }, [uploadedLookups, missingLookups, onAllLookupsCreated]);

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep(2);
      telemetry.reportSetupLookupNameCopied({ migrationId: migrationStats.id });
    }, [telemetry, migrationStats.id]);

    const copyStep = useMissingLookupsListStep({
      status: getStatus(1, subStep),
      migrationStats,
      missingLookups,
      uploadedLookups,
      addUploadedLookups,
      onCopied,
    });

    // Upload macros step
    const uploadStep = useLookupsFileUploadStep({
      status: getStatus(2, subStep),
      migrationStats,
      missingLookups,
      addUploadedLookups,
    });

    const steps = useMemo<EuiStepProps[]>(() => [copyStep, uploadStep], [copyStep, uploadStep]);

    return <SubSteps steps={steps} />;
  }
);
LookupsDataInputSubSteps.displayName = 'LookupsDataInputActive';
