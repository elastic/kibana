/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { JsonValue } from '@kbn/utility-types';
import { CardIcon } from '@kbn/fleet-plugin/public';
import { EuiSkeletonText } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { useGetIntegrationFromPackageName } from '../../../hooks/alert_summary/use_get_integration_from_package_name';
import { getAlertFieldValueAsStringOrNull, isJsonObjectValue } from '../../../utils/type_utils';

export const SKELETON_TEST_ID = 'alert-summary-table-related-integrations-cell-renderer-skeleton';
export const ICON_TEST_ID = 'alert-summary-table-related-integrations-cell-renderer-icon';

const RELATED_INTEGRATIONS_FIELD = 'related_integrations';
const PACKAGE_FIELD = 'package';

// function is_string(value: unknown): value is string {}

export interface KibanaAlertRelatedIntegrationsCellRendererProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
}

/**
 * Renders an integration/package icon. Retrieves the package name from the kibana.alert.rule.parameters field in the alert,
 * fetches all integrations/packages and use the icon from the one that matches by name.
 * Used in AI for SOC alert summary table.
 */
export const KibanaAlertRelatedIntegrationsCellRenderer = memo(
  ({ alert }: KibanaAlertRelatedIntegrationsCellRendererProps) => {
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

    const { integration, isLoading } = useGetIntegrationFromPackageName({ packageName });

    return (
      <EuiSkeletonText data-test-subj={SKELETON_TEST_ID} isLoading={isLoading} lines={1}>
        {integration ? (
          <CardIcon
            data-test-subj={ICON_TEST_ID}
            icons={integration.icons}
            integrationName={integration.title}
            packageName={integration.name}
            size="l"
            version={integration.version}
          />
        ) : null}
      </EuiSkeletonText>
    );
  }
);

KibanaAlertRelatedIntegrationsCellRenderer.displayName =
  'KibanaAlertRelatedIntegrationsCellRenderer';
