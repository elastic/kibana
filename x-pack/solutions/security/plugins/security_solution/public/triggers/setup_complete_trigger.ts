/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  SECURITY_SETUP_COMPLETE_TRIGGER_ID,
  setupCompleteTriggerDefinition,
} from '../../common/triggers/setup_complete_trigger';

export const setupCompletePublicTriggerDefinition: PublicTriggerDefinition = {
  ...setupCompleteTriggerDefinition,
  title: i18n.translate('xpack.securitySolution.triggers.setupComplete.title', {
    defaultMessage: 'Security setup complete',
  }),
  description: i18n.translate('xpack.securitySolution.triggers.setupComplete.description', {
    defaultMessage:
      'Emitted when the Security Solution setup completes. Use to bootstrap detection coverage or perform post-setup automation.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/check_circle_fill').then(({ icon }) => ({
      default: icon,
    }))
  ),
  documentation: {
    details: i18n.translate('xpack.securitySolution.triggers.setupComplete.documentation.details', {
      defaultMessage:
        'Emitted when the Security Solution onboarding setup completes. The event includes `completed_cards`, a list of onboarding card IDs that were completed. Use KQL in `on.condition` to filter by specific completed cards.',
    }),
    examples: [
      i18n.translate(
        'xpack.securitySolution.triggers.setupComplete.documentation.exampleBasic',
        {
          defaultMessage: `## Run on any setup completion
\`\`\`yaml
triggers:
  - type: {triggerId}
\`\`\``,
          values: { triggerId: SECURITY_SETUP_COMPLETE_TRIGGER_ID },
        }
      ),
    ],
  },
};
