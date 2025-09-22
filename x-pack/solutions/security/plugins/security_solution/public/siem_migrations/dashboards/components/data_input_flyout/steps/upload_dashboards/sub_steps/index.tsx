/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { getEuiStepStatus } from '../../../../../../common/utils/get_eui_step_status';
import type { DashboardMigrationTaskStats } from '../../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { useMigrationNameStep } from '../../../../../../common/components/migration_steps';
import { MigrationDataInputSubSteps } from '../../../../../../common/components/migration_data_input_sub_steps';
import { useCopyExportQueryStep } from './copy_export_query';
import type {
  SplunkDashboardsResult,
  OnMigrationCreated,
  OnMissingResourcesFetched,
} from '../../../types';
import { useDashboardsFileUploadStep } from './dashboards_file_upload';
import { useCheckResourcesStep } from './check_resources';
interface DashboardsUploadSubStepsProps {
  migrationStats?: DashboardMigrationTaskStats;
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
  onMissingResourcesFetched,
  onMigrationCreated,
}: DashboardsUploadSubStepsProps) {
  const [currentSubStep, setCurrentSubStep] = useState<SubStep>(1);
  const [migrationName, setMigrationName] = useState<string | undefined>(migrationStats?.name);
  const [_, setUploadedDashboards] = useState<SplunkDashboardsResult[]>([]);

  const onUploadedDashboards = useCallback(
    (dashboards: SplunkDashboardsResult[]) => {
      if (dashboards.length > 0) {
        setUploadedDashboards(dashboards);
        if (currentSubStep === 3) {
          // If we are on step 3 and dashboards are uploaded, move to step 4
          setCurrentSubStep(4);
        }
      } else {
        setCurrentSubStep(3);
      }
    },
    [setCurrentSubStep, currentSubStep]
  );

  const onMigrationCreatedStep = useCallback<OnMigrationCreated>(
    (stats) => {
      onMigrationCreated(stats);
      setCurrentSubStep(4);
    },
    [onMigrationCreated]
  );

  const onDashboardsFileChanged = useCallback((files: FileList | null) => {
    if (!files?.length) {
      setUploadedDashboards([]);
    }
  }, []);

  const setName = useCallback(
    (name: string) => {
      setMigrationName(name);
      if (name) {
        if (currentSubStep === 1) {
          // If the name is set and we are on step 1, move to step 2
          setCurrentSubStep(2);
        }
      } else {
        setCurrentSubStep(1);
      }
    },
    [currentSubStep]
  );

  const onQueryCopied = useCallback(() => {
    // Move to the next step only if step 1 was completed
    setCurrentSubStep((prev) => (prev !== 1 ? 3 : prev));
  }, []);

  const nameStep = useMigrationNameStep({
    status: getEuiStepStatus(1, currentSubStep),
    setMigrationName: setName,
    migrationName,
  });

  const copyQueryStep = useCopyExportQueryStep({
    status: getEuiStepStatus(2, currentSubStep),
    onCopied: onQueryCopied,
  });

  const dashboardsFileUploadStep = useDashboardsFileUploadStep({
    status: getEuiStepStatus(3, currentSubStep),
    migrationName,
    migrationStats,
    onFileUpload: onUploadedDashboards,
    onDashboardsFileChanged,
    onMigrationCreated: onMigrationCreatedStep,
  });

  const resourcesStep = useCheckResourcesStep({
    status: getEuiStepStatus(4, currentSubStep),
    migrationStats,
    onMissingResourcesFetched,
  });

  const steps = useMemo(() => {
    return [nameStep, copyQueryStep, dashboardsFileUploadStep, resourcesStep];
  }, [nameStep, copyQueryStep, dashboardsFileUploadStep, resourcesStep]);

  return <MigrationDataInputSubSteps steps={steps} />;
});
