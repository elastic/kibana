/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { AttackDiscoveryWorkerExtras, type WorkerSettings } from '@kbn/alertzero-common';
import { WorkerAgentIdField } from '../agent/worker_agent_id_field';
import * as i18n from './translations';
import type { WorkerCustomSettingsComponent } from '../types';

/**
 * This Worker's extras are opt-in, so `settings.extras` is absent until an agent is picked. An
 * unparseable value is treated the same as an absent one: the control falls back to showing the
 * default agent rather than crashing a render.
 */
const readAttackDiscoveryExtras = (settings: WorkerSettings): AttackDiscoveryWorkerExtras => {
  const parsed = AttackDiscoveryWorkerExtras.safeParse(settings.extras ?? {});
  return parsed.success ? parsed.data : {};
};

/**
 * Floor Watch controls for the Attack Discovery Worker. Every change hands the complete `extras`
 * object back to the page draft; adding a field means adding its control and spreading it here.
 */
export const AttackDiscoverySettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const extras = readAttackDiscoveryExtras(settings);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>{i18n.ATTACK_DISCOVERY_AGENT_SECTION_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <WorkerAgentIdField
        current={extras.agentId}
        isDisabled={isDisabled}
        onChange={(agentId) => {
          // Drop the key rather than storing `undefined`: absent is what keeps the workflow on its
          // own default agent, and an explicit undefined would serialize into the settings payload.
          const { agentId: _dropped, ...rest } = extras;
          onExtrasChange(agentId === undefined ? rest : { ...rest, agentId });
        }}
        label={i18n.ATTACK_DISCOVERY_AGENT_LABEL}
        helpText={i18n.ATTACK_DISCOVERY_AGENT_HELP}
        ariaLabel={i18n.ATTACK_DISCOVERY_AGENT_ARIA_LABEL}
        dataTestSubj="alertZeroAttackDiscoveryAgent"
      />
    </>
  );
};
