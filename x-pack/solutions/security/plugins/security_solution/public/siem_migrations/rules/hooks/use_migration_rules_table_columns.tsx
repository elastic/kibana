/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RelatedIntegration } from '../../../../common/api/detection_engine';
import type { RuleMigrationRule } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { TableColumn } from '../components/rules_table_columns';
import {
  createActionsColumn,
  createAuthorColumn,
  createNameColumn,
  createRiskScoreColumn,
  createSeverityColumn,
  createStatusColumn,
  createUpdatedColumn,
} from '../components/rules_table_columns';
import { createIntegrationsColumn } from '../components/rules_table_columns/integrations';

export const useMigrationRulesTableColumns = ({
  disableActions,
  openMigrationRuleDetails,
  installMigrationRule,
  getMigrationRuleData,
}: {
  disableActions?: boolean;
  openMigrationRuleDetails: (rule: RuleMigrationRule) => void;
  installMigrationRule: (migrationRule: RuleMigrationRule, enable?: boolean) => void;
  getMigrationRuleData: (
    ruleId: string
  ) => { relatedIntegrations?: RelatedIntegration[]; isIntegrationsLoading?: boolean } | undefined;
}): TableColumn[] => {
  return useMemo(
    () => [
      createUpdatedColumn(),
      createNameColumn({ openMigrationRuleDetails }),
      createStatusColumn(),
      createRiskScoreColumn(),
      createSeverityColumn(),
      createAuthorColumn(),
      createIntegrationsColumn({ getMigrationRuleData }),
      createActionsColumn({
        disableActions,
        openMigrationRuleDetails,
        installMigrationRule,
      }),
    ],
    [disableActions, getMigrationRuleData, installMigrationRule, openMigrationRuleDetails]
  );
};
