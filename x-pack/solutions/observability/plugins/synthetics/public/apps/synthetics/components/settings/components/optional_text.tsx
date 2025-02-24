/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function OptionalText() {
  return (
    <EuiText size="xs" color="subdued">
      {i18n.translate('xpack.synthetics.sloEdit.optionalLabel', {
        defaultMessage: 'Optional',
      })}
    </EuiText>
  );
}
