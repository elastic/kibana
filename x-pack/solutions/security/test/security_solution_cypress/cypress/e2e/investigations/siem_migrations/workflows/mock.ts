/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TINES_TEST_STORY = {
  name: 'Kibana Alert Automation',
  description: null,
  guid: 'story-guid-1',
  tags: ['demo'],
  agents: [
    {
      type: 'Agents::WebhookAgent',
      name: 'Receive Alert',
      guid: 'agent-1',
      options: { path: 'alert' },
    },
    {
      type: 'Agents::HTTPRequestAgent',
      name: 'Send A Message',
      guid: 'agent-2',
      options: { url: 'https://slack.com/api/chat.postMessage', method: 'post' },
    },
  ],
  links: [{ source: 0, receiver: 1 }],
};
