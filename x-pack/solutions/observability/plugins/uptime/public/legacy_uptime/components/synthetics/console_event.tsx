/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import React, { FC } from 'react';
import { JourneyStep } from '../../../../common/runtime_types/ping';

interface Props {
  event: JourneyStep;
}

export const ConsoleEvent: FC<Props> = ({ event }) => {
  const theme = useEuiTheme();
  const danger = theme.euiTheme.colors.danger;

  let typeColor: string | undefined;
  if (event.synthetics?.type === 'stderr') {
    typeColor = danger;
  } else {
    typeColor = undefined;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>{event['@timestamp']}</EuiFlexItem>
      <EuiFlexItem grow={false} style={{ color: typeColor }}>
        {event.synthetics?.type}
      </EuiFlexItem>
      <EuiFlexItem>{event.synthetics?.payload?.message}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
