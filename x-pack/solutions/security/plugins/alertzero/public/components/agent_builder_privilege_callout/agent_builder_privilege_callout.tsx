/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { AGENT_BUILDER_PRIVILEGE_CALLOUT_MESSAGE } from './translations';

/** Tells the user that investigations and chats need the Agent Builder Kibana privilege. */
export const AgentBuilderPrivilegeCallout = () => (
  <EuiCallOut
    announceOnMount
    size="s"
    color="warning"
    iconType="lock"
    data-test-subj="alertZeroAgentBuilderPrivilegeCallout"
  >
    {AGENT_BUILDER_PRIVILEGE_CALLOUT_MESSAGE}
  </EuiCallOut>
);
