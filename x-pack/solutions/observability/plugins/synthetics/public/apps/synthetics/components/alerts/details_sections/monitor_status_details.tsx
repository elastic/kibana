/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertDetailsAppSectionProps } from '@kbn/observability-plugin/public';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { getSyntheticsAppProps } from '../../../render_app';
import type { ClientPluginsStart } from '../../../../../plugin';
import { SyntheticsSharedContext } from '../../../contexts/synthetics_shared_context';
import { StatusAlertDetail } from './status_alert_detail';

type AppSectionProps = AlertDetailsAppSectionProps & {
  core: CoreStart;
  plugins: ClientPluginsStart;
};

// eslint-disable-next-line import/no-default-export
export default function MonitorStatusDetailsAppSection(props: AppSectionProps) {
  const contextProps = getSyntheticsAppProps();
  return (
    <SyntheticsSharedContext {...contextProps}>
      <StatusAlertDetail {...props} />
    </SyntheticsSharedContext>
  );
}
