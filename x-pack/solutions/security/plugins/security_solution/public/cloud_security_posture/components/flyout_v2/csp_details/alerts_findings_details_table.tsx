/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertsDetailsTable as AlertsDetailsTableBase } from '../../csp_details/alerts_findings_details_table';

export type AlertsDetailsTableProps = Omit<
  React.ComponentProps<typeof AlertsDetailsTableBase>,
  'onShowAlert'
> & {
  /** Required in flyout v2: the caller owns navigation to the alert details. */
  onShowAlert: (eventId: string, indexName: string) => void;
};

/**
 * Flyout v2 wrapper around {@link AlertsDetailsTableBase}.
 */
export const AlertsDetailsTable = (props: AlertsDetailsTableProps) => (
  <AlertsDetailsTableBase {...props} />
);

AlertsDetailsTable.displayName = 'AlertsDetailsTable';
