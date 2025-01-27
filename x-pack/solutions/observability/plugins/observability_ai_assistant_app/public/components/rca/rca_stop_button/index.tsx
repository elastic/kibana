/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';

export function RootCauseAnalysisStopButton({ onClick }: { onClick: () => void }) {
  return (
    <EuiButton
      data-test-subj="observabilityAiAssistantAppRootCauseAnalysisStopButton"
      onClick={() => {
        onClick();
      }}
      iconType="stopFilled"
      color="text"
    >
      {i18n.translate('xpack.observabilityAiAssistant.rca.stopAnalysisButtonLabel', {
        defaultMessage: 'Stop',
      })}
    </EuiButton>
  );
}
