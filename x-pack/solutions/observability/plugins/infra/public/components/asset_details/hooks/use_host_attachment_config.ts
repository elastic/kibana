/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_AGENT_ID,
  OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID,
} from '@kbn/observability-agent-builder-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';
import { useDatePickerContext } from './use_date_picker';

export const useHostAttachmentConfig = () => {
  const { entity, loading } = useAssetDetailsRenderPropsContext();
  const { getParsedDateRange } = useDatePickerContext();
  const {
    services: { agentBuilder },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    if (!agentBuilder || loading || entity.type !== 'host' || !entity.name) {
      return;
    }

    const { from, to } = getParsedDateRange();
    if (!from || !to) {
      return;
    }

    agentBuilder.setConversationFlyoutActiveConfig({
      agentId: OBSERVABILITY_AGENT_ID,
      attachments: [
        {
          type: OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID,
          data: {
            hostName: entity.name,
            start: from,
            end: to,
            attachmentLabel: i18n.translate('xpack.infra.assetDetails.hostAttachmentLabel', {
              defaultMessage: '{hostName} host',
              values: { hostName: entity.name },
            }),
          },
        },
      ],
    });

    return () => {
      agentBuilder.clearConversationFlyoutActiveConfig();
    };
  }, [agentBuilder, entity.name, entity.type, getParsedDateRange, loading]);
};
