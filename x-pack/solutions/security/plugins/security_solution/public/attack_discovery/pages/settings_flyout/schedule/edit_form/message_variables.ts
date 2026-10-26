/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ActionVariables } from '@kbn/triggers-actions-ui-types';

export const getMessageVariables = (): ActionVariables => {
  return {
    state: [],
    params: [],
    context: [
      {
        name: 'attack.alertIds',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.alertIds',
          {
            defaultMessage: 'The alert IDs that the attack discovery is based on',
          }
        ),
      },
      {
        name: 'attack.detailsMarkdown',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.detailsMarkdown',
          {
            defaultMessage:
              'Details of the attack with bulleted markdown that always uses special syntax for field names and values from the source data',
          }
        ),
        useWithTripleBracesInTemplates: true,
      },
      {
        name: 'attack.summaryMarkdown',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.summaryMarkdown',
          {
            defaultMessage: 'A markdown summary of attack discovery, using the same syntax',
          }
        ),
        useWithTripleBracesInTemplates: true,
      },
      {
        name: 'attack.title',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.title',
          {
            defaultMessage: 'A title for the attack discovery, in plain text',
          }
        ),
      },
      {
        name: 'attack.timestamp',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.timestamp',
          {
            defaultMessage: 'The time the attack discovery was generated',
          }
        ),
      },
      {
        name: 'attack.entitySummaryMarkdown',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.entitySummaryMarkdown',
          {
            defaultMessage:
              'A short (no more than a sentence) summary of the attack discovery featuring only the host.name and user.name fields (when they are applicable), using the same syntax',
          }
        ),
        useWithTripleBracesInTemplates: true,
      },
      {
        name: 'attack.mitreAttackTactics',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.mitreAttackTactics',
          {
            defaultMessage: 'An array of MITRE ATT&CK tactic for the attack discovery',
          }
        ),
      },
      {
        name: 'attack.detailsUrl',
        description: i18n.translate(
          'xpack.securitySolution.attackDiscovery.schedule.messageVariable.attack.detailsUrl',
          {
            defaultMessage: 'A link to the attack discovery details',
          }
        ),
        useWithTripleBracesInTemplates: true,
      },
    ],
  };
};
