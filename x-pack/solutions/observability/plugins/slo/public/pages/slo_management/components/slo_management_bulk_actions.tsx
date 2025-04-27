/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import { useBulkDeleteSlo } from '../hooks/use_bulk_delete_slo';

export function SloManagementBulkActions({ items }: { items: SLODefinitionResponse[] }) {
  const { mutate: bulkDelete } = useBulkDeleteSlo();

  return (
    <EuiButtonEmpty
      data-test-subj="sloSloManagementTableBulkDeleteButton"
      disabled={items.length === 0}
      onClick={() => {
        bulkDelete({ items: items.map((item) => ({ id: item.id, name: item.name })) });
      }}
      size="xs"
      css={{ blockSize: '0px' }}
    >
      {i18n.translate('xpack.slo.sloManagementTable.sloSloManagementTableBulkDeleteButtonLabel', {
        defaultMessage: 'Delete {count} SLOs',
        values: {
          count: items.length,
        },
      })}
    </EuiButtonEmpty>
  );
}
