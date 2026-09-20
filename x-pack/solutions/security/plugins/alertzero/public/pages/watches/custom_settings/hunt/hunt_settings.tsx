/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { ContinuousThreatHuntWorkerExtras, type WorkerSettings } from '@kbn/alertzero-common';
import { HuntAgentIdField } from './hunt_agent_id_field';
import * as i18n from './translations';
import type { WorkerCustomSettingsComponent } from '../types';

/**
 * This Worker's extras are opt-in, so `settings.extras` is absent until an agent is picked. An
 * unparseable value is treated the same as an absent one: the control falls back to showing the
 * default agent rather than crashing a render.
 */
const readHuntExtras = (settings: WorkerSettings): ContinuousThreatHuntWorkerExtras => {
  const parsed = ContinuousThreatHuntWorkerExtras.safeParse(settings.extras ?? {});
  return parsed.success ? parsed.data : {};
};

/**
 * Hunt Watch controls for the Continuous Threat Hunt Worker. Every change hands the complete
 * `extras` object back to the page draft; adding a field means adding its control and spreading
 * it here.
 */
export const HuntSettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const extras = readHuntExtras(settings);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>{i18n.HUNT_AGENT_SECTION_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <HuntAgentIdField
        current={extras.agentId}
        isDisabled={isDisabled}
        onChange={(agentId) => onExtrasChange({ ...extras, agentId })}
      />
    </>
  );
};
