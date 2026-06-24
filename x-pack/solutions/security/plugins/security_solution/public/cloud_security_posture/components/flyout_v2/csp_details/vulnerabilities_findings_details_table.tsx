/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VulnerabilitiesFindingsDetailsTable as VulnerabilitiesFindingsDetailsTableBase } from '../../csp_details/vulnerabilities_findings_details_table';

export type VulnerabilitiesFindingsDetailsTableProps = Omit<
  React.ComponentProps<typeof VulnerabilitiesFindingsDetailsTableBase>,
  'onShowVulnerability'
> & {
  /** Required in flyout v2: the caller owns navigation to the vulnerability details. */
  onShowVulnerability: (params: {
    vulnerabilityId: string;
    resourceId: string;
    packageName: string;
    packageVersion: string;
    eventId: string;
  }) => void;
};

/**
 * Flyout v2 wrapper around {@link VulnerabilitiesFindingsDetailsTableBase}.
 */
export const VulnerabilitiesFindingsDetailsTable = (
  props: VulnerabilitiesFindingsDetailsTableProps
) => <VulnerabilitiesFindingsDetailsTableBase {...props} />;

VulnerabilitiesFindingsDetailsTable.displayName = 'VulnerabilitiesFindingsDetailsTable';
