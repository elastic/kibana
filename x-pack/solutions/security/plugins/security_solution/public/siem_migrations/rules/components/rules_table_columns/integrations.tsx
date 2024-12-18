/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import { IntegrationsPopover } from '../../../../detections/components/rules/related_integrations/integrations_popover';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';

export const createIntegrationsColumn = ({
  getMigrationRuleData,
}: {
  getMigrationRuleData: (
    ruleId: string
  ) => { relatedIntegrations?: RelatedIntegration[]; isIntegrationsLoading?: boolean } | undefined;
}): TableColumn => {
  return {
    field: 'elastic_rule.integration_id',
    name: i18n.COLUMN_INTEGRATIONS,
    render: (_, rule: RuleMigration) => {
      const migrationRuleData = getMigrationRuleData(rule.id);
      if (migrationRuleData?.isIntegrationsLoading) {
        return <EuiLoadingSpinner />;
      }
      const relatedIntegrations = migrationRuleData?.relatedIntegrations;
      if (relatedIntegrations == null || relatedIntegrations.length === 0) {
        return null;
      }
      return <IntegrationsPopover relatedIntegrations={relatedIntegrations} />;
    },
    truncateText: true,
    width: '143px',
    align: 'center',
  };
};
