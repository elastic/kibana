/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TinesStoryExport } from '@kbn/security-solution-plugin/common/siem_migrations/model/vendor/workflows/tines.gen';

export const tinesStoryExport: TinesStoryExport = {
  name: 'Receive alert',
  description: 'Imported from Tines',
  guid: 'story-guid-1',
  agents: [
    {
      type: 'Agents::WebhookAgent',
      name: 'Receive Alert',
      guid: 'agent-guid-1',
      disabled: false,
    },
  ],
  links: [],
};
