/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID } from '@kbn/observability-agent-builder-plugin/public';
import type { ClientPluginsStart } from '../../../../../plugin';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from './use_selected_monitor';

/**
 * Minimal monitor shape required to configure the agent builder attachment.
 */
export interface MonitorForAttachment {
  [ConfigKey.CONFIG_ID]?: string;
  [ConfigKey.NAME]?: string;
  [ConfigKey.MONITOR_TYPE]?: string;
}

/**
 * Configures the agent builder conversation flyout with the given monitor.
 * Use this when you already have monitor data (e.g. from Redux selectors).
 */
export const useMonitorAttachmentConfigWithMonitor = (
  monitor: MonitorForAttachment | null,
  loading: boolean
) => {
  const { agentBuilder } = useKibana<ClientPluginsStart>().services;

  useEffect(() => {
    if (!agentBuilder || loading || !monitor) {
      return;
    }

    const configId = monitor[ConfigKey.CONFIG_ID];
    const monitorName = monitor[ConfigKey.NAME];
    const monitorType = monitor[ConfigKey.MONITOR_TYPE];

    if (!configId) {
      return;
    }

    agentBuilder.setChatConfig({
      attachments: [
        {
          type: OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID,
          data: {
            attachmentLabel: i18n.translate('xpack.synthetics.monitorAttachment.attachmentLabel', {
              defaultMessage: '{monitorName} monitor',
              values: { monitorName },
            }),
            configId,
            monitorName,
            monitorType: monitorType ?? 'unknown',
          },
        },
      ],
    });

    return () => {
      agentBuilder.clearChatConfig();
    };
  }, [agentBuilder, loading, monitor]);
};

export const useMonitorAttachmentConfig = () => {
  const { monitor, loading } = useSelectedMonitor({ refetchMonitorEnabled: false });
  useMonitorAttachmentConfigWithMonitor(monitor, loading);
};
