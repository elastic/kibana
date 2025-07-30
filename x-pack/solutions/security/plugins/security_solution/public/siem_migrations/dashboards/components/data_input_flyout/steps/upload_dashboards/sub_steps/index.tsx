/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { getEuiStepStatus } from '../../../../../../common/utils/get_eui_step_status';
import type { RuleMigrationTaskStats } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { useMigrationNameStep } from '../../../../../../common/components/migration_name_step';
import { MigrationDataInputSubSteps } from '../../../../../../common/components/migration_data_input_sub_steps';
import { useCopyExportQueryStep } from './copy_export_query';
import type { SplunkDashboardsResult } from '../../../types';
import { useDashboardsFileUploadStep } from './dashboards_file_upload';
import { useSelectDashboardsSubStep } from './select_dashboards';

interface DashboardsUploadSubStepsProps {
  migrationStats?: RuleMigrationTaskStats;
}

const END = 5 as const;

type SubStep =
  | 1 /* name */
  | 2 /* copy query */
  | 3 /* file */
  | 4 /* select */
  | typeof END /* END */;

export const DashboardsUploadSubSteps = React.memo(function DashboardsUploadSubSteps({
  migrationStats,
}: DashboardsUploadSubStepsProps) {
  const [currentSubStep, setCurrentSubStep] = useState<SubStep>(1);
  const [migrationName, setMigrationName] = useState<string | undefined>(migrationStats?.name);
  const [uploadedDashboards, setUploadedDashboards] = useState<SplunkDashboardsResult[]>([]);
  const [, setSelectedDashboards] = useState<SplunkDashboardsResult[]>([]);

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

  const onDashboardsFileChanged = useCallback((files: FileList | null) => {
    if (!files?.length) {
      setUploadedDashboards([]);
    }
  }, []);

  const onSelectedDashboardsChange = useCallback((newSelection: SplunkDashboardsResult[]) => {
    setSelectedDashboards(newSelection);
    if (newSelection.length > 0) {
      setCurrentSubStep(END);
    } else {
      setCurrentSubStep(4);
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
    onFileUpload: onUploadedDashboards,
    onDashboardsFileChanged,
  });

  const selectDashboardsStep = useSelectDashboardsSubStep({
    status: getEuiStepStatus(4, currentSubStep),
    dashboards: uploadedDashboards,
    onSelectionChange: onSelectedDashboardsChange,
  });

  const steps = useMemo(() => {
    return [nameStep, copyQueryStep, dashboardsFileUploadStep, selectDashboardsStep];
  }, [nameStep, copyQueryStep, dashboardsFileUploadStep, selectDashboardsStep]);

  return <MigrationDataInputSubSteps steps={steps} />;
});
