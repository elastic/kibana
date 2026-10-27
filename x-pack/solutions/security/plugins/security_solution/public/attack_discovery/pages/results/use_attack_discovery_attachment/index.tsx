/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  type AttackDiscoveryAlert,
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { noop } from 'lodash/fp';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { ATTACK_DISCOVERY_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { getAttackDiscoveryAttachmentData } from './get_attack_discovery_attachment_data';

/**
 * Returns a callback that opens Agent Builder with the discovery attached as a
 * `security.attack_discovery`, or a no-op when there is no single persisted discovery.
 */
export const useAttackDiscoveryAttachment = (
  attackDiscovery?: AttackDiscoveryAlert,
  replacements?: Replacements
): (() => void) => {
  const attachment = useMemo(() => {
    const attachmentData =
      attackDiscovery != null
        ? getAttackDiscoveryAttachmentData({ attackDiscovery, replacements })
        : undefined;

    return {
      attachmentData: attachmentData != null ? { ...attachmentData } : {},
      // Shown to the agent and in the conversation timeline instead of the generated id.
      attachmentDescription:
        attachmentData != null
          ? replaceAnonymizedValuesWithOriginalValues({
              messageContent: attachmentData.title,
              replacements: attachmentData.replacements,
            })
          : undefined,
      attachmentPrompt: ATTACK_DISCOVERY_ATTACHMENT_PROMPT,
      attachmentType: SecurityAgentBuilderAttachments.attackDiscovery,
    };
  }, [attackDiscovery, replacements]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(attachment);

  return attackDiscovery != null ? openAgentBuilderFlyout : noop;
};
