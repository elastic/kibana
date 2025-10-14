/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TopAlert } from '../../../../../typings/alerts';

export const getSLOBurnRateRuleData = ({ alert }: { alert: TopAlert }) => {
  const dataViewId = 'slo.dataViewId' in alert.fields ? alert.fields['slo.dataViewId'] : undefined;

  return typeof dataViewId === 'string' ? { discoverAppLocatorParams: { dataViewId } } : {};
};
