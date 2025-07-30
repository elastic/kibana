/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useGetIntegrationFromRuleId } from '../../../hooks/alert_summary/use_get_integration_from_rule_id';
import { IntegrationIcon } from '../common/integration_icon';
import { getAlertFieldValueAsStringOrNull } from '../../../utils/type_utils';

export const TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID =
  'alert-summary-table-related-integrations-cell-renderer';

export interface KibanaAlertRelatedIntegrationsCellRendererProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
  /**
   * List of installed AI for SOC integrations.
   * This comes from the additionalContext property on the table.
   */
  packages: PackageListItem[];
  /**
   * List of rules for the AI for SOC.
   * This comes from the additionalContext property on the table.
   */
  rules: RuleResponse[];
}

/**
 * Renders an integration/package icon within the AI for SOC alert summary table Integration column.
 */
export const KibanaAlertRelatedIntegrationsCellRenderer = memo(
  ({ alert, packages, rules }: KibanaAlertRelatedIntegrationsCellRendererProps) => {
    const ruleRuleId: string = useMemo(
      () => getAlertFieldValueAsStringOrNull(alert, 'signal.rule.rule_id') || '',
      [alert]
    );
    const { integration } = useGetIntegrationFromRuleId({
      packages,
      ruleId: ruleRuleId,
      rules,
    });

    return (
      <IntegrationIcon
        data-test-subj={TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID}
        iconSize="l"
        integration={integration}
      />
    );
  }
);

KibanaAlertRelatedIntegrationsCellRenderer.displayName =
  'KibanaAlertRelatedIntegrationsCellRenderer';
