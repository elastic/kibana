/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { AlertSeverityBadge } from './alert_severity_badge';

type Args = ComponentProps<typeof AlertSeverityBadge>;

export default {
  title: 'app/Alerts/SeverityBadge',
  component: AlertSeverityBadge,
};

export function Example({ severityLevel }: Args) {
  return <AlertSeverityBadge severityLevel={severityLevel} />;
}
Example.args = { severityLevel: 'critical' } as Args;
