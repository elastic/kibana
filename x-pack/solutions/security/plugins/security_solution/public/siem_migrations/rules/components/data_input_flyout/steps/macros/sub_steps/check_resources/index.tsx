/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiText, type EuiStepProps, type EuiStepStatus } from '@elastic/eui';
import { useGetMissingResources } from '../../../../../../../common/hooks/use_get_missing_resources';
import type { RuleMigrationTaskStats } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { OnMissingResourcesFetched } from '../../../../../../../common/types';

export interface CheckResourcesStepProps {
  status: EuiStepStatus;
  migrationStats: RuleMigrationTaskStats | undefined;
  onMissingResourcesFetched: OnMissingResourcesFetched;
}
export const useCheckResourcesStep = ({
  status,
  migrationStats,
  onMissingResourcesFetched,
}: CheckResourcesStepProps): EuiStepProps => {
  const { getMissingResources, isLoading, error } = useGetMissingResources(
    'rule',
    onMissingResourcesFetched
  );

  useEffect(() => {
    if (status === 'current' && migrationStats?.id) {
      getMissingResources(migrationStats.id);
    }
  }, [getMissingResources, status, migrationStats?.id]);

  const uploadStepStatus = useMemo(() => {
    if (isLoading) {
      return 'loading';
    }
    if (error) {
      return 'danger';
    }
    return status;
  }, [isLoading, error, status]);

  return {
    title: i18n.RULES_DATA_INPUT_CHECK_RESOURCES_TITLE,
    status: uploadStepStatus,
    children: (
      <EuiText size="s">{i18n.RULES_DATA_INPUT_CHECK_RESOURCES_SPLUNK_DESCRIPTION}</EuiText>
    ),
  };
};
