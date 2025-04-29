/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import type { FieldsTableProps } from '../../../flyout/entity_details/generic_right/components/fields_table';
import { FieldsTable } from '../../../flyout/entity_details/generic_right/components/fields_table';

/**
 * Insights view displayed in the document details expandable flyout left section
 */

interface CspFlyoutPanelProps extends FlyoutPanelProps {
  params: {
    path: PanelPath;
    hasMisconfigurationFindings: boolean;
    hasVulnerabilitiesFindings: boolean;
    hasNonClosedAlerts: boolean;
  };
}

// Type guard to check if the panel is a CspFlyoutPanelProps
function isCspFlyoutPanelProps(
  panelLeft: FlyoutPanelProps | undefined
): panelLeft is CspFlyoutPanelProps {
  return (
    !!panelLeft?.params?.hasMisconfigurationFindings ||
    !!panelLeft?.params?.hasVulnerabilitiesFindings ||
    !!panelLeft?.params?.hasNonClosedAlerts
  );
}

export const FieldsTableTab = memo(({ document, tableStorageKey }: FieldsTableProps) => {
  return (
    <>
      <FieldsTable document={document} tableStorageKey={tableStorageKey} />
    </>
  );
});

FieldsTableTab.displayName = 'FieldsTableTab';
