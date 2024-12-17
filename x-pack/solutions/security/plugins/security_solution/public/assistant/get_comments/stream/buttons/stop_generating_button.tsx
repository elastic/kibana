/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonEmptyProps } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function StopGeneratingButton(props: Partial<EuiButtonEmptyProps>) {
  return (
    <EuiButtonEmpty
      data-test-subj="stopGeneratingButton"
      color="text"
      iconType="stop"
      size="s"
      {...props}
    >
      {i18n.translate('xpack.securitySolution.aiAssistant.stopGeneratingButtonLabel', {
        defaultMessage: 'Stop generating',
      })}
    </EuiButtonEmpty>
  );
}
