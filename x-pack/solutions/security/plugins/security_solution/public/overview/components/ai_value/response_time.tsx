/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import * as i18n from './translations';

interface Props {
  from: string;
  to: string;
}

export const ResponseTime: React.FC<Props> = ({ from, to }) => {
  return (
    <EuiPanel paddingSize="l">
      <EuiTitle size="s">
        <h3>{i18n.RESPONSE_TIME_TITLE}</h3>
      </EuiTitle>
      <EuiText size="s">
        <p>{i18n.RESPONSE_TIME_DESC}</p>
      </EuiText>
      <EuiSpacer size="s" />
      {/* Replace with your EuiChart component */}
      {/* <ResponseTimeChart />*/}
      <EuiText size="s">{'3.7m Avg AI response, 25.7m Avg traditional'}</EuiText>
    </EuiPanel>
  );
};
