/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment, { type MomentInput } from 'moment';
import { EuiToolTip, formatDate } from '@elastic/eui';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';

const DEFAULT_DATE_FORMAT = 'dateFormat';

export const TimestampTableCell = ({ timestamp }: { timestamp: MomentInput }) => {
  const dateFormat = useUiSetting<string>(DEFAULT_DATE_FORMAT);
  const formatted = formatDate(timestamp, dateFormat);

  return (
    <EuiToolTip position="top" content={formatted}>
      <span>{moment(timestamp).fromNow()}</span>
    </EuiToolTip>
  );
};
