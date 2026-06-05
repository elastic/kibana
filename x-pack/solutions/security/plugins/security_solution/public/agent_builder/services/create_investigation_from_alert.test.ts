/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { ALERT_RULE_NAME, ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  AGENT_BUILDER_INTERNAL_API,
  AGENT_BUILDER_PUBLIC_API,
  INCIDENT_INVESTIGATION_TEMPLATE_ID,
} from '../constants';
import { createInvestigationFromAlert } from './create_investigation_from_alert';

describe('createInvestigationFromAlert', () => {
  const httpPost = jest.fn().mockResolvedValue({});
  const httpPatch = jest.fn().mockResolvedValue({});
  const http = {
    post: httpPost,
    patch: httpPatch,
  } as unknown as HttpSetup;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a conversation with alert attachment and applies incident template metadata', async () => {
    const conversationId = await createInvestigationFromAlert({
      http,
      ecsData: { _id: 'alert-1' },
      nonEcsData: [
        { field: ALERT_RULE_NAME, value: ['Suspicious login'] },
        { field: ALERT_SEVERITY, value: ['high'] },
        { field: 'host.name', value: ['prod-web-01'] },
      ],
    });

    expect(conversationId).toEqual(expect.any(String));
    expect(httpPost).toHaveBeenCalledWith(
      `${AGENT_BUILDER_PUBLIC_API}/converse`,
      expect.objectContaining({
        version: '2023-10-31',
        body: expect.stringContaining(SecurityAgentBuilderAttachments.alert),
      })
    );

    const converseBody = JSON.parse(httpPost.mock.calls[0][1].body as string);
    const alertPayload = JSON.parse(converseBody.attachments[0].data.alert);
    expect(alertPayload._id).toEqual(['alert-1']);

    expect(httpPatch).toHaveBeenCalledWith(
      `${AGENT_BUILDER_INTERNAL_API}/conversations/${conversationId}`,
      expect.objectContaining({
        body: JSON.stringify({
          title: 'Suspicious login',
          template_id: INCIDENT_INVESTIGATION_TEMPLATE_ID,
          custom_fields: {
            status: 'open',
            severity: 'high',
            affected_host: 'prod-web-01',
          },
        }),
      })
    );
  });
});
