/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useParams } from 'react-router-dom';
import { PLUGIN } from '../../../../../../common/constants/plugin';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';
import { MONITORS_TITLE, SyntheticsPage } from './synthetics_page';

export function MonitorBackPage({
  title,
  toolbar,
  children,
}: {
  title: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  const { monitorId } = useParams<{ monitorId: string }>();
  const { application } = useKibana<ClientPluginsStart>().services;
  const syntheticsPath = application.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID);
  const { monitor } = useSelectedMonitor();

  return (
    <SyntheticsPage
      title={title}
      back={
        monitorId
          ? {
              href: `${syntheticsPath}/monitor/${monitorId}`,
              label: monitor?.name ?? MONITORS_TITLE,
            }
          : undefined
      }
      toolbar={toolbar}
    >
      {children}
    </SyntheticsPage>
  );
}
