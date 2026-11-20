/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { SubSteps, useMigrationNameStep } from '../../../../../common/components';
import type { OnSuccess } from '../../../../service/hooks/use_create_migration';
import { useTinesStoriesUploadStep } from './upload_stories_step';

interface WorkflowsUploadSubStepsProps {
  onMigrationCreated: OnSuccess;
}

const END = 3 as const;

type SubStep = 1 /* name */ | 2 /* upload */ | typeof END /* migration created */;

export const WorkflowsUploadSubSteps = React.memo(function WorkflowsUploadSubSteps({
  onMigrationCreated,
}: WorkflowsUploadSubStepsProps) {
  const [subStep, setSubStep] = useState<SubStep>(1);
  const [migrationName, setMigrationName] = useState<string | undefined>();

  // Migration name step
  const setName = useCallback((name: string) => {
    setMigrationName(name);
    setSubStep((currentSubStep) => {
      if (currentSubStep === END) {
        return END;
      }
      return name ? 2 : 1;
    });
  }, []);
  const nameStep = useMigrationNameStep({
    status: getEuiStepStatus(1, subStep),
    setMigrationName: setName,
    migrationName,
  });

  // Upload stories step
  const onMigrationCreatedStep = useCallback<OnSuccess>(
    (migrationId) => {
      setSubStep(END);
      onMigrationCreated(migrationId);
    },
    [onMigrationCreated]
  );
  const uploadStep = useTinesStoriesUploadStep({
    status: getEuiStepStatus(2, subStep),
    migrationName,
    onMigrationCreated: onMigrationCreatedStep,
  });

  const steps = useMemo<EuiStepProps[]>(() => [nameStep, uploadStep], [nameStep, uploadStep]);

  return <SubSteps steps={steps} />;
});
