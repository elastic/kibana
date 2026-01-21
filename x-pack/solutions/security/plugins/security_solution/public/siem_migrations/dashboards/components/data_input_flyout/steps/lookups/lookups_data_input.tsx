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
import { SubSteps } from '../../../../../common/components/migration_steps';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import type { OnResourcesCreated } from '../../types';
import * as i18n from './translations';
import { useMissingLookupsListStep } from './sub_steps/missing_lookups_list';
import { useLookupsFileUploadStep } from './sub_steps/lookups_file_upload';
import type { MigrationStepProps } from '../../../../../common/types';
import { SplunkDataInputStep } from '../../../../../common/types';
import type { DashboardMigrationStats } from '../../../../types';
interface LookupsDataInputSubStepsProps {
  migrationStats: DashboardMigrationStats;
  missingLookups: string[];
  onAllLookupsCreated: OnResourcesCreated;
}

export const LookupsDataInput = React.memo<MigrationStepProps>(
  ({ dataInputStep, migrationStats, setDataInputStep, missingResourcesIndexed }) => {
    const missingLookups = useMemo(
      () => missingResourcesIndexed?.lookups,
      [missingResourcesIndexed]
    );
    const onAllLookupsCreated = useCallback(() => {
      setDataInputStep(SplunkDataInputStep.End);
    }, [setDataInputStep]);

    const dataInputStatus = useMemo(
      () => getEuiStepStatus(SplunkDataInputStep.Lookups, dataInputStep),
      [dataInputStep]
    );

    return (
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiStepNumber
                  data-test-subj="lookupsUploadStepNumber"
                  titleSize="xs"
                  number={SplunkDataInputStep.Lookups}
                  status={dataInputStatus}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs" data-test-subj="lookupsUploadTitle">
                  <b>{i18n.LOOKUPS_DATA_INPUT_TITLE}</b>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {dataInputStatus === 'current' && migrationStats && missingLookups && (
            <>
              <EuiFlexItem>
                <EuiText size="s" color="subdued" data-test-subj="lookupsUploadDescription">
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
    const { telemetry } = useKibana().services.siemMigrations.dashboards;

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
      telemetry.reportSetupLookupNameCopied({
        migrationId: migrationStats.id,
        vendor: migrationStats.vendor,
      });
    }, [telemetry, migrationStats.id, migrationStats.vendor]);

    const copyStep = useMissingLookupsListStep({
      status: getEuiStepStatus(1, subStep),
      migrationStats,
      missingLookups,
      uploadedLookups,
      addUploadedLookups,
      onCopied,
    });

    // Upload macros step
    const uploadStep = useLookupsFileUploadStep({
      status: getEuiStepStatus(2, subStep),
      migrationStats,
      missingLookups,
      addUploadedLookups,
    });

    const steps = useMemo<EuiStepProps[]>(() => [copyStep, uploadStep], [copyStep, uploadStep]);

    return <SubSteps steps={steps} />;
  }
);
LookupsDataInputSubSteps.displayName = 'LookupsDataInputActive';
