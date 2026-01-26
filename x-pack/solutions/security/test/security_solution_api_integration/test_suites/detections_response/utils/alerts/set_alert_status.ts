/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Status,
  SignalIds as AlertIds,
  ClosingReason,
} from '@kbn/security-solution-plugin/common/api/detection_engine';

export const setAlertStatus = ({
  alertIds,
  query,
  status,
  reason,
}: {
  alertIds?: AlertIds;
  query?: object;
  status: Status;
  reason?: ClosingReason;
}) => ({
  signal_ids: alertIds,
  query,
  status,
  reason,
});
