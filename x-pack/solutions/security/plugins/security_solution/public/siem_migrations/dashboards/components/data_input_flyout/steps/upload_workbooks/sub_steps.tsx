/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import type { DashboardMigrationStats } from '../../../../types';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { SubSteps, useMigrationNameStep } from '../../../../../common/components';
import { useSentinelWorkbookFileUploadStep } from '../upload_dashboards/sub_steps/sentinel_workbook_file_upload';
import type { OnMigrationCreated } from '../../types';
import { useCheckResourcesStep } from '../common/check_resources';
import type { OnMissingResourcesFetched } from '../../../../../common/types';

interface SentinelWorkbooksUploadSubStepsProps {
  migrationStats?: DashboardMigrationStats;
  onMissingResourcesFetched: OnMissingResourcesFetched;
  onMigrationCreated: OnMigrationCreated;
}

const END = 4 as const;

type SubStep = 1 /* name */ | 2 /* file */ | 3 /* check resources */ | typeof END;

export const SentinelWorkbooksUploadSubSteps = React.memo(function SentinelWorkbooksUploadSubSteps({
  migrationStats,
  onMissingResourcesFetched,
  onMigrationCreated,
}: SentinelWorkbooksUploadSubStepsProps) {
  const [subStep, setSubStep] = useState<SubStep>(migrationStats ? 3 : 1);

  const [migrationName, setMigrationName] = useState<string | undefined>(migrationStats?.name);
  const [isWorkbookFileReady, setIsWorkbookFileReady] = useState<boolean>(false);

  const setName = useCallback(
    (name: string) => {
      setMigrationName(name);
      if (name) {
        setSubStep(isWorkbookFileReady ? 3 : 2);
      } else {
        setSubStep(1);
      }
    },
    [isWorkbookFileReady]
  );
  const nameStep = useMigrationNameStep({
    status: getEuiStepStatus(1, subStep),
    setMigrationName: setName,
    migrationName,
  });

  const onWorkbookFileChanged = useCallback((files: FileList | null) => {
    setIsWorkbookFileReady(!!files?.length);
    setSubStep(2);
  }, []);

  const onMigrationCreatedStep = useCallback<OnMigrationCreated>(
    (stats) => {
      onMigrationCreated(stats);
      setSubStep(3);
    },
    [onMigrationCreated]
  );

  const uploadStep = useSentinelWorkbookFileUploadStep({
    status: getEuiStepStatus(2, subStep),
    migrationStats,
    onWorkbookFileChanged,
    onMigrationCreated: onMigrationCreatedStep,
    migrationName,
  });

  const onMissingResourcesFetchedStep = useCallback<OnMissingResourcesFetched>(
    (missingResources) => {
      onMissingResourcesFetched(missingResources);
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
    () => [nameStep, uploadStep, resourcesStep],
    [nameStep, uploadStep, resourcesStep]
  );

  return <SubSteps steps={steps} />;
});
