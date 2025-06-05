/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';
import type { ComponentProps } from 'react';
import { useState, useCallback, useMemo } from 'react';
import { SiemMigrationRetryFilter } from '../../../../../common/siem_migrations/constants';
import type { StartMigration } from '../../service/hooks/use_start_migration';
import type { RuleMigrationSettings, RuleMigrationStats } from '../../types';
import type { ReprocessFailedRulesDialog } from './reprocess_rule_dialog';

interface UseReprocessFailedRulesDialogArgs {
  aiConnectors: AIConnector[];
  migrationStats: RuleMigrationStats;
  startMigration: StartMigration;
  numberOfFailedRules: number;
}

export const useReprocessFailedRulesDialog = ({
  numberOfFailedRules,
  aiConnectors,
  migrationStats,
  startMigration,
}: UseReprocessFailedRulesDialogArgs) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const reprocessFailedRulesInitiate = useCallback(async () => {
    setIsModalVisible(true);
  }, []);

  const reprocessFailedRules = useCallback(
    (settings?: RuleMigrationSettings) => {
      setIsModalVisible(false);
      startMigration(migrationStats.id, SiemMigrationRetryFilter.FAILED, settings);
    },
    [migrationStats.id, startMigration]
  );

  const onClose = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const lastExecutionParams = useMemo(
    () => ({
      connectorId: migrationStats?.last_execution?.connector_id,
      skipPrebuiltRulesMatching: migrationStats?.last_execution?.skip_prebuilt_rules_matching,
    }),
    [migrationStats?.last_execution]
  );

  const reprocessFailedRulesDialogProps: ComponentProps<typeof ReprocessFailedRulesDialog> =
    useMemo(
      () => ({
        onClose,
        onSubmit: reprocessFailedRules,
        connectors: aiConnectors,
        lastExecution: lastExecutionParams,
        numberOfFailedRules,
      }),
      [reprocessFailedRules, aiConnectors, numberOfFailedRules, onClose, lastExecutionParams]
    );

  return {
    isVisible: isModalVisible,
    onReprocessRulesClick: reprocessFailedRulesInitiate,
    props: reprocessFailedRulesDialogProps,
  };
};
