/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  type AttackDiscovery,
  type AttackDiscoveryAlert,
  getAttackDiscoveryMarkdown,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { ATTACK_DISCOVERY_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';

const DEFAULT_ATTACK_DISCOVERY_ATTACHMENT_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.agentBuilder.attachmentLabel',
  {
    defaultMessage: 'Attack discovery',
  }
);

export const useAttackDiscoveryAttachment = (
  attackDiscovery?: AttackDiscovery | AttackDiscoveryAlert,
  replacements?: Replacements
): (() => void) => {
  const alertAttachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.alert,
      attachmentData: {
        alert: attackDiscovery
          ? getAttackDiscoveryMarkdown({
              attackDiscovery,
              replacements,
            })
          : '',
        attachmentLabel: attackDiscovery?.title ?? DEFAULT_ATTACK_DISCOVERY_ATTACHMENT_LABEL,
      },
      attachmentPrompt: ATTACK_DISCOVERY_ATTACHMENT_PROMPT,
    }),
    [attackDiscovery, replacements]
  );

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(alertAttachment);

  return openAgentBuilderFlyout;
};
