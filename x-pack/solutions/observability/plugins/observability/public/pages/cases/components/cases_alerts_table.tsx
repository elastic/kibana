/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CaseViewAlertsTableProps } from '@kbn/cases-plugin/common';
import { useKibana } from '../../../utils/kibana_react';
import type { GetObservabilityAlertsTableProp } from '../../..';
import { AlertActions, ObservabilityAlertsTable } from '../../..';

function AlertActionsComponent(
  props: React.ComponentProps<
    GetObservabilityAlertsTableProp<'renderActionsCell'> & {
      caseData: CaseViewAlertsTableProps['caseData'];
    }
  >
) {
  return <AlertActions {...props} />;
}

export function CasesAlertsTable(props: CaseViewAlertsTableProps) {
  const { cases, data, http, notifications, fieldFormats, application, licensing, settings } =
    useKibana().services;

  return (
    <ObservabilityAlertsTable
      {...props}
      renderActionsCell={(actionProps) => (
        <AlertActionsComponent caseData={props.caseData} {...actionProps} />
      )}
      services={{
        data,
        http,
        notifications,
        fieldFormats,
        application,
        licensing,
        cases,
        settings,
      }}
    />
  );
}
