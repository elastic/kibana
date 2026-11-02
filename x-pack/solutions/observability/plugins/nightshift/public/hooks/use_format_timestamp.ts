/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { formatTimestamp } from '../common/format_timestamp';

export const useFormatTimestamp = (): ((timestamp: string) => string) => {
  const dateFormat = useUiSetting<string>('dateFormat');

  return useMemo(() => (timestamp: string) => formatTimestamp(timestamp, dateFormat), [dateFormat]);
};
