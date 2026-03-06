/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  OBSERVABILITY_AGENT_ID,
  OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID,
} from '@kbn/observability-agent-builder-plugin/public';
import type { ClientPluginsStart } from '../../../../../plugin';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from './use_selected_monitor';
import { useRefreshedRangeFromUrl } from '../../../hooks';

export const useMonitorAttachmentConfig = () => {
  const { agentBuilder } = useKibana<ClientPluginsStart>().services;
  const { monitor, loading } = useSelectedMonitor({ refetchMonitorEnabled: false });
  const { from, to } = useRefreshedRangeFromUrl();

  useEffect(() => {
    if (!agentBuilder || loading || !monitor) {
      return;
    }

    const configId = monitor[ConfigKey.CONFIG_ID];
    const monitorName = monitor[ConfigKey.NAME];
    const monitorType = monitor[ConfigKey.MONITOR_TYPE];

    if (!configId || !monitorName || !from || !to) {
      return;
    }

    agentBuilder.setConversationFlyoutActiveConfig({
      agentId: OBSERVABILITY_AGENT_ID,
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
            start: from,
            end: to,
          },
        },
      ],
    });

    return () => {
      agentBuilder.clearConversationFlyoutActiveConfig();
    };
  }, [agentBuilder, loading, monitor, from, to]);
};
