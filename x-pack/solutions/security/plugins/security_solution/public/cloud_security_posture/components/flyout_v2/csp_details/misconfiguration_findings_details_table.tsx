/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MisconfigurationFindingsDetailsTable as MisconfigurationFindingsDetailsTableBase } from '../../csp_details/misconfiguration_findings_details_table';

export type MisconfigurationFindingsDetailsTableProps = Omit<
  React.ComponentProps<typeof MisconfigurationFindingsDetailsTableBase>,
  'onShowFinding'
> & {
  /** Required in flyout v2: the caller owns navigation to the finding details. */
  onShowFinding: (resourceId: string, ruleId: string) => void;
};

/**
 * Flyout v2 wrapper around the context-agnostic {@link MisconfigurationFindingsDetailsTableBase}.
 * It composes the v1 table and requires the `onShowFinding` callback so navigation
 * is owned by the caller (the new EUI flyout system) rather than hardcoded.
 */
export const MisconfigurationFindingsDetailsTable = (
  props: MisconfigurationFindingsDetailsTableProps
) => <MisconfigurationFindingsDetailsTableBase {...props} />;

MisconfigurationFindingsDetailsTable.displayName = 'MisconfigurationFindingsDetailsTable';
