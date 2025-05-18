/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { JsonValue } from '@kbn/utility-types';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { IntegrationIcon } from '../common/integration_icon';
import { getAlertFieldValueAsStringOrNull, isJsonObjectValue } from '../../../utils/type_utils';

export const TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID =
  'alert-summary-table-related-integrations-cell-renderer';

const RELATED_INTEGRATIONS_FIELD = 'related_integrations';
const PACKAGE_FIELD = 'package';

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
}

/**
 * Renders an integration/package icon. Retrieves the package name from the kibana.alert.rule.parameters field in the alert,
 * fetches all integrations/packages and use the icon from the one that matches by name.
 * Used in AI for SOC alert summary table.
 */
export const KibanaAlertRelatedIntegrationsCellRenderer = memo(
  ({ alert, packages }: KibanaAlertRelatedIntegrationsCellRendererProps) => {
    const packageName: string | null = useMemo(() => {
      const values: JsonValue[] | undefined = alert[ALERT_RULE_PARAMETERS];

      if (Array.isArray(values) && values.length === 1) {
        const value: JsonValue = values[0];
        if (!isJsonObjectValue(value)) return null;

        const relatedIntegration = value[RELATED_INTEGRATIONS_FIELD];
        if (!isJsonObjectValue(relatedIntegration)) return null;

        return getAlertFieldValueAsStringOrNull(relatedIntegration as Alert, PACKAGE_FIELD);
      }

      return null;
    }, [alert]);

    const integration = useMemo(
      () => packages.find((p) => p.name === packageName),
      [packages, packageName]
    );

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
