/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { AttackDiscovery, AttackDiscoveryAlert, Replacements } from '@kbn/elastic-assistant-common';
import React from 'react';

import { AttackDiscoveryTab } from './attack_discovery_tab';
import { AlertsTab } from './alerts_tab';
import * as i18n from './translations';
import type { ViewInAiAssistantOverlay } from '../view_in_ai_assistant/use_view_in_ai_assistant';

export interface TabInfo {
  content: JSX.Element;
  id: string;
  name: string;
}

export const getTabs = ({
  attackDiscovery,
  replacements,
  showAnonymized = false,
  viewInAiAssistantOverlay,
}: {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
  replacements?: Replacements;
  showAnonymized?: boolean;
  viewInAiAssistantOverlay: ViewInAiAssistantOverlay;
}): TabInfo[] => [
  {
    id: 'attackDiscovery--id',
    name: i18n.ATTACK_DISCOVERY,
    content: (
      <>
        <EuiSpacer />
        <AttackDiscoveryTab
          attackDiscovery={attackDiscovery}
          replacements={replacements}
          showAnonymized={showAnonymized}
          viewInAiAssistantOverlay={viewInAiAssistantOverlay}
        />
      </>
    ),
  },
  {
    id: 'alerts--id',
    name: i18n.ALERTS,
    content: (
      <>
        <EuiSpacer />
        <AlertsTab attackDiscovery={attackDiscovery} replacements={replacements} />
      </>
    ),
  },
];
