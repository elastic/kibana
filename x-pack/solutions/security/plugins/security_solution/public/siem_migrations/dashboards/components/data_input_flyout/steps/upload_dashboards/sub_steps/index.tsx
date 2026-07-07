/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import type { DashboardMigrationStats } from '../../../../../types';
import { getEuiStepStatus } from '../../../../../../common/utils/get_eui_step_status';
import { SubSteps, useMigrationNameStep } from '../../../../../../common/components';
import { useCopyExportQueryStep } from './copy_export_query';
import type { OnMigrationCreated } from '../../../types';
import { useDashboardsFileUploadStep } from './dashboards_file_upload';
import { useKibana } from '../../../../../../../common/lib/kibana/kibana_react';
import { useCheckResourcesStep } from '../../common/check_resources';
import type { MigrationSource, OnMissingResourcesFetched } from '../../../../../../common/types';
interface DashboardsUploadSubStepsProps {
  migrationStats?: DashboardMigrationStats;
  migrationSource: MigrationSource;
  onMissingResourcesFetched: OnMissingResourcesFetched;
  onMigrationCreated: OnMigrationCreated;
}

const END = 4 as const;

type SubStep =
  | 1 /* name */
  | 2 /* copy query */
  | 3 /* file */
  | 4 /* check resources */
  | typeof END /* END */;

export const DashboardsUploadSubSteps = React.memo(function DashboardsUploadSubSteps({
  migrationStats,
  migrationSource,
  onMissingResourcesFetched,
  onMigrationCreated,
}: DashboardsUploadSubStepsProps) {
  const [subStep, setSubStep] = useState<SubStep>(migrationStats ? 4 : 1);
  const { telemetry } = useKibana().services.siemMigrations.dashboards;

  const [migrationName, setMigrationName] = useState<string | undefined>(migrationStats?.name);
  const [isDashboardsFileReady, setIsDashboardFileReady] = useState<boolean>(false);

  // Migration name step
  const setName = useCallback(
    (name: string) => {
      setMigrationName(name);
      if (name) {
        setSubStep(isDashboardsFileReady ? 3 : 2);
      } else {
        setSubStep(1);
      }
    },
    [isDashboardsFileReady]
  );
  const nameStep = useMigrationNameStep({
    status: getEuiStepStatus(1, subStep),
    setMigrationName: setName,
    migrationName,
  });

  // Copy query step
  const onCopied = useCallback(() => {
    setSubStep((currentSubStep) => (currentSubStep !== 1 ? 3 : currentSubStep)); // Move to the next step only if step 1 was completed
    telemetry.reportSetupQueryCopied({ migrationId: migrationStats?.id, vendor: migrationSource });
  }, [telemetry, migrationStats?.id, migrationSource]);
  const copyStep = useCopyExportQueryStep({ status: getEuiStepStatus(2, subStep), onCopied });

  // Upload dashboards step
  const onMigrationCreatedStep = useCallback<OnMigrationCreated>(
    (stats) => {
      onMigrationCreated(stats);
      setSubStep(4);
    },
    [onMigrationCreated]
  );
  const onDashboardsFileChanged = useCallback((files: FileList | null) => {
    setIsDashboardFileReady(!!files?.length);
    setSubStep(3);
  }, []);
  const uploadStep = useDashboardsFileUploadStep({
    status: getEuiStepStatus(3, subStep),
    migrationStats,
    onDashboardsFileChanged,
    onMigrationCreated: onMigrationCreatedStep,
    migrationName,
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
  });

  const steps = useMemo<EuiStepProps[]>(
    () => [nameStep, copyStep, uploadStep, resourcesStep],
    [nameStep, copyStep, uploadStep, resourcesStep]
  );

  return <SubSteps steps={steps} />;
});
