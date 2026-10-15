/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AgentVersionWarningText } from './mws_agent_version_warning_line';

/**
 * Fallback for when there's no active-MW or pending-sync callout to fold the
 * warning into — e.g. the assigned window hasn't started yet. Own title
 * since "active"/"pending" wouldn't be accurate here.
 */
export const MwsAgentVersionCallout = () => (
  <>
    <EuiCallOut
      title={i18n.translate('xpack.synthetics.maintenanceWindowCallout.agentVersionOnly.title', {
        defaultMessage: 'Maintenance window may not be honored',
      })}
      color="warning"
      iconType="warning"
      data-test-subj="maintenanceWindowAgentVersionCallout"
    >
      <AgentVersionWarningText />
    </EuiCallOut>
    <EuiSpacer size="s" />
  </>
);
