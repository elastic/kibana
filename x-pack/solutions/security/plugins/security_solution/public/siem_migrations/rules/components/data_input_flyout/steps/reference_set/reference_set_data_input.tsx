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
import type {
  AddUploadedLookups,
  UploadedLookups,
} from '../../../../../common/components/migration_steps/types';
import { SubSteps } from '../../../../../common/components';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type { RuleMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { QradarDataInputStep, type OnResourcesCreated } from '../../types';
import * as i18n from './translations';
import { useMissingReferenceSetsListStep } from './sub_steps/missing_reference_set_list';
import { useReferencesFileUploadStep } from './sub_steps/reference_sets_file_upload';
import { type MigrationStepProps } from '../../../../../common/types';

interface ReferenceSetDataInputSubStepsProps {
  migrationStats: RuleMigrationTaskStats;
  missingReferenceSet: string[];
  onAllReferenceSetCreated: OnResourcesCreated;
}

export const ReferenceSetDataInput = React.memo<MigrationStepProps>(
  ({ dataInputStep, migrationStats, missingResourcesIndexed, setDataInputStep }) => {
    const missingReferenceSet = useMemo(
      () => missingResourcesIndexed?.lookups,
      [missingResourcesIndexed]
    );
    const onAllReferenceSetCreated = useCallback(() => {
      setDataInputStep(QradarDataInputStep.Enhancements);
    }, [setDataInputStep]);

    const dataInputStatus = useMemo(
      () => getEuiStepStatus(QradarDataInputStep.ReferenceSet, dataInputStep),
      [dataInputStep]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiStepNumber
                  data-test-subj="referenceSetsUploadStepNumber"
                  titleSize="xs"
                  number={QradarDataInputStep.ReferenceSet}
                  status={dataInputStatus}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs" data-test-subj="referenceSetsUploadTitle">
                  <b>{i18n.REFERENCE_SET_DATA_INPUT_TITLE}</b>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {dataInputStatus === 'current' && migrationStats && missingReferenceSet && (
            <>
              <EuiFlexItem>
                <EuiText size="s" color="subdued" data-test-subj="referenceSetsUploadDescription">
                  {i18n.REFERENCE_SET_DATA_INPUT_DESCRIPTION}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <ReferenceSetDataInputSubSteps
                  migrationStats={migrationStats}
                  missingReferenceSet={missingReferenceSet}
                  onAllReferenceSetCreated={onAllReferenceSetCreated}
                />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
ReferenceSetDataInput.displayName = 'ReferenceSetDataInput';

const END = 10 as const;
type SubStep = 1 | 2 | typeof END;
export const ReferenceSetDataInputSubSteps = React.memo<ReferenceSetDataInputSubStepsProps>(
  ({ migrationStats, missingReferenceSet, onAllReferenceSetCreated }) => {
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
      if (missingReferenceSet.every((referenceSet) => uploadedLookups[referenceSet] != null)) {
        setSubStep(END);
        onAllReferenceSetCreated();
      }
    }, [uploadedLookups, missingReferenceSet, onAllReferenceSetCreated]);

    // Copy query step
    const onCopied = useCallback(() => {
      setSubStep(2);
      telemetry.reportSetupLookupNameCopied({
        migrationId: migrationStats.id,
        vendor: migrationStats.vendor,
      });
    }, [telemetry, migrationStats.id, migrationStats.vendor]);

    const copyStep = useMissingReferenceSetsListStep({
      status: getEuiStepStatus(1, subStep),
      migrationStats,
      missingLookups: missingReferenceSet,
      uploadedLookups,
      addUploadedLookups,
      onCopied,
    });

    // Upload reference sets step
    const uploadStep = useReferencesFileUploadStep({
      status: getEuiStepStatus(2, subStep),
      migrationStats,
      missingLookups: missingReferenceSet,
      addUploadedLookups,
    });

    const steps = useMemo<EuiStepProps[]>(() => [copyStep, uploadStep], [copyStep, uploadStep]);

    return <SubSteps steps={steps} />;
  }
);
ReferenceSetDataInputSubSteps.displayName = 'ReferenceSetDataInputSubSteps';
