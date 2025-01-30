/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import { i18n } from '@kbn/i18n';

export function AddProcessorButton(props: EuiButtonPropsForButton) {
  return (
    <EuiButton
      data-test-subj="streamsAppAddProcessorButtonAddAProcessorButton"
      iconType="plusInCircle"
      {...props}
    >
      {i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichmentEmptyPrompt.addProcessorAction',
        { defaultMessage: 'Add a processor' }
      )}
    </EuiButton>
  );
}
