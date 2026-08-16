/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MIN_MW_SUPPORTED_AGENT_VERSION } from '../../../../../../common/utils/agent_mw_support';

export const MwsAgentVersionCallout = ({
  affectedMonitorCount,
}: {
  affectedMonitorCount: number;
}) => {
  if (affectedMonitorCount === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        title={i18n.translate(
          'xpack.synthetics.maintenanceWindowCallout.agentVersionUnsupported.title',
          {
            defaultMessage: 'Some agents may not support maintenance windows',
          }
        )}
        color="warning"
        iconType="warning"
        data-test-subj="maintenanceWindowAgentVersionCallout"
      >
        {i18n.translate(
          'xpack.synthetics.maintenanceWindowCallout.agentVersionUnsupported.description',
          {
            defaultMessage:
              '{count, plural, one {# monitor is} other {# monitors are}} assigned a maintenance window but {count, plural, one {runs} other {run}} on an Elastic Agent version older than {minVersion}, which does not support maintenance windows. {count, plural, one {It} other {They}} may keep running during the maintenance window until the agent is upgraded.',
            values: { count: affectedMonitorCount, minVersion: MIN_MW_SUPPORTED_AGENT_VERSION },
          }
        )}
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
