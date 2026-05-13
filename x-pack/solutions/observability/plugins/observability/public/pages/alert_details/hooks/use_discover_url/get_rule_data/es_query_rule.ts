/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_URL } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../../../typings/alerts';

export const getEsQueryRuleData = ({ alert }: { alert: TopAlert }) => {
  const discoverUrl = alert.fields[ALERT_URL];

  return discoverUrl ? { discoverUrl } : {};
};
