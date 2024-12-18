/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { FieldPath } from 'react-hook-form';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { useRunTimeFieldBeingUsed } from '../../hooks/use_find_runtime_usage';
import { CreateSLOForm } from '../../types';

export function RunTimeFieldUsed({
  dataView,
  name,
}: {
  dataView?: DataView;
  name: FieldPath<CreateSLOForm>;
}) {
  const fieldNames = useRunTimeFieldBeingUsed(name, dataView);

  if (fieldNames.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={i18n.translate('xpack.slo.runTimeFieldUsed.euiCallOut.runtimeFieldsBeingUsedLabel', {
          defaultMessage: 'Runtime fields being used',
        })}
        color="warning"
        iconType="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.slo.runTimeFieldUsed.p.theRuntimeFieldLabel"
            defaultMessage="The runtime field(s) {fields} from kibana dataview are being used in the query. If you update the runtime field, the query will not be updated automatically. You must save the slo definition again to update the underlying transform query."
            values={{
              fields: <strong>{fieldNames.join(', ')}</strong>,
            }}
          />
        </p>
      </EuiCallOut>
    </>
  );
}
