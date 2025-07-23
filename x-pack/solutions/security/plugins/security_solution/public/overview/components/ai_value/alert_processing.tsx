/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { AlertProcessingDonut } from './alert_processing_donut';
import * as i18n from './translations';

interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
}

export const AlertProcessing: React.FC<Props> = ({ attackAlertIds, from, to }) => {
  return (
    <EuiPanel paddingSize="l">
      <EuiTitle size="s">
        <h3>{i18n.ALERT_PROCESSING_TITLE}</h3>
      </EuiTitle>
      <EuiText size="s">
        <p>{i18n.ALERT_PROCESSING_DESC}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <AlertProcessingDonut attackAlertIds={attackAlertIds} from={from} to={to} />
    </EuiPanel>
  );
};
