/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import moment from 'moment-timezone';

export const useTimeZone = () => {
  const timeZone = useUiSetting<string | undefined>('dateFormat:tz');

  const localTZ = moment.tz.guess();

  if (!timeZone || timeZone === 'Browser') {
    return localTZ;
  }

  return timeZone;
};
