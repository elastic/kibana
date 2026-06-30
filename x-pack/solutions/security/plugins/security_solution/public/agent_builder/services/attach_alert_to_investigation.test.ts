/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { AGENT_BUILDER_PUBLIC_API } from '../constants';
import { attachAlertToInvestigation } from './attach_alert_to_investigation';

describe('attachAlertToInvestigation', () => {
  const httpPost = jest.fn().mockResolvedValue({ attachment_id: 'attachment-1' });
  const http = {
    post: httpPost,
  } as unknown as HttpSetup;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts a security alert attachment to the selected conversation', async () => {
    await attachAlertToInvestigation({
      http,
      conversationId: 'conversation-123',
      ecsData: { _id: 'alert-1' },
      nonEcsData: [{ field: ALERT_RULE_NAME, value: ['Suspicious login'] }],
    });

    expect(httpPost).toHaveBeenCalledWith(
      `${AGENT_BUILDER_PUBLIC_API}/conversations/conversation-123/attachments`,
      expect.objectContaining({
        version: '2023-10-31',
        body: expect.stringContaining(SecurityAgentBuilderAttachments.alert),
      })
    );
  });
});
