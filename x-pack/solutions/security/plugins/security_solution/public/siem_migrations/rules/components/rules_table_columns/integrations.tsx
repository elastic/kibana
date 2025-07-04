/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import { IntegrationsPopover } from '../../../../detection_engine/common/components/related_integrations/integrations_popover';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { TableHeader } from './header';

export const createIntegrationsColumn = ({
  getMigrationRuleData,
}: {
  getMigrationRuleData: (
    ruleId: string
  ) => { relatedIntegrations?: RelatedIntegration[]; isIntegrationsLoading?: boolean } | undefined;
}): TableColumn => {
  return {
    field: 'elastic_rule.integration_ids',
    name: (
      <TableHeader
        title={i18n.COLUMN_INTEGRATIONS}
        tooltipContent={
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.rules.tableColumn.integrationsTooltip"
            defaultMessage="{title} The AI migration process tries to infer integrations from the queries provided, but its possible that a match might not be present."
            values={{
              title: (
                <EuiText size="s">
                  <p>
                    <b>{i18n.COLUMN_INTEGRATIONS}</b>
                    <EuiHorizontalRule margin="s" />
                  </p>
                </EuiText>
              ),
            }}
          />
        }
      />
    ),
    render: (_, rule: RuleMigrationRule) => {
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
