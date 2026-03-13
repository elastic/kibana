/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ErrorsTabContent } from './errors_tab_content';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { useAllMonitorErrors } from '../hooks/use_all_errors';
import { useErrorsBreadcrumbs } from './use__errors_breadcrumbs';

export const ErrorsTab = () => {
  const { errorStates, upStates, loading, monitorIds } = useAllMonitorErrors();
  useErrorsBreadcrumbs();

  return (
    <div>
      <SyntheticsDatePicker fullWidth={true} />
      <EuiSpacer size="m" />
      <div>
        <ErrorsTabContent
          errorStates={errorStates}
          upStates={upStates}
          loading={loading}
          monitorIds={monitorIds}
        />
      </div>
    </div>
  );
};
