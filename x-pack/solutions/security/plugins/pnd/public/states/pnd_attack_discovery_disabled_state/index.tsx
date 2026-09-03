/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import * as i18n from '../translations';

/**
 * The per-space advanced setting that gates the whole loop. Named on screen
 * because nothing else tells the reader why PND is empty: with it off, no
 * trigger is emitted and every PND route answers 200 with no rows.
 */
export const ATTACK_DISCOVERY_WORKFLOWS_UI_SETTING =
  'securitySolution:enableAttackDiscoveryWorkflows';

/** The 200-with-no-rows state, when the response reported the feature off. */
export const PndAttackDiscoveryDisabledState: React.FC = () => (
  <EuiEmptyPrompt
    body={
      <>
        <p>{i18n.ATTACK_DISCOVERY_DISABLED_BODY}</p>
        <EuiSpacer size="s" />
        <EuiCode>{ATTACK_DISCOVERY_WORKFLOWS_UI_SETTING}</EuiCode>
      </>
    }
    data-test-subj="pndAttackDiscoveryDisabledState"
    iconType="securitySignalDetected"
    title={<h2>{i18n.ATTACK_DISCOVERY_DISABLED_TITLE}</h2>}
  />
);
