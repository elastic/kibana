/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  intervalAsString?: string;
}

export const IntervalLabel = ({ intervalAsString }: Props) => {
  if (!intervalAsString) {
    return null;
  }

  return (
    <EuiIconTip
      size="m"
      type="clock"
      content={
        <FormattedMessage
          id="xpack.infra.homePage.toolbar.showingLastOneMinuteDataText"
          defaultMessage="Last {duration} of data for the selected time"
          values={{ duration: intervalAsString }}
        />
      }
    />
  );
};
