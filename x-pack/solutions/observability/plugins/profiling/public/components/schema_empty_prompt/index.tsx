/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function SchemaEmptyPrompt() {
  return (
    <EuiEmptyPrompt
      data-test-subj="profilingSchemaEmptyPrompt"
      color="subdued"
      iconType="magnify"
      titleSize="xs"
      title={
        <h2>
          {i18n.translate('xpack.profiling.schemaEmptyPrompt.title', {
            defaultMessage: 'No profiling data found',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.profiling.schemaEmptyPrompt.body', {
            defaultMessage:
              'Try updating your search filters or selecting a different time range or schema',
          })}
        </p>
      }
    />
  );
}
