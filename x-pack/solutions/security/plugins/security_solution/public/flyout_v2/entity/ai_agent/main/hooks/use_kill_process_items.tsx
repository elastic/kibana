/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useGetEndpointDetails, useWithShowResponder } from '../../../../../management/hooks';
import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { HostStatus } from '../../../../../../common/endpoint/types';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  METADATA_API_ERROR_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
} from '../../../../../common/components/endpoint/responder/from_alerts/translations';
import type { AgentRun } from '../../../../../entity_analytics/components/ai_security/activity/types';
import { AI_AGENT_TEST_IDS } from '../test_ids';

const NO_ENDPOINT_AGENT_ID = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.killProcess.noEndpointAgentId',
  { defaultMessage: 'The run has no Elastic Defend agent ID, so its host cannot be reached.' }
);

const killProcessLabel = (pid: number | undefined) =>
  pid !== undefined
    ? i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.killProcess.withPid', {
        defaultMessage: 'Kill process (PID {pid})',
        values: { pid },
      })
    : i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.killProcess.label', {
        defaultMessage: 'Kill process',
      });

/** Quotes stripped, since the value goes inside a quoted console argument. */
const consoleValue = (value: string): string => value.replace(/["\\]/g, '');

/**
 * Take action items to kill the root process of each running run, through the Elastic Defend
 * response console. The console opens with `kill-process` filled in and the analyst sends it.
 * Shown only to users who may kill processes, and disabled while the host can't be reached.
 */
export const useKillProcessItems = (
  runs: readonly AgentRun[]
): ((closePopover: () => void) => ReactElement[]) => {
  const { canKillProcess, canAccessResponseConsole } = useUserPrivileges().endpointPrivileges;
  const canKill = canKillProcess && canAccessResponseConsole && runs.length > 0;
  const agentId = runs.find((run) => run.root.endpointAgentId)?.root.endpointAgentId ?? '';
  const { data, isFetching, error } = useGetEndpointDetails(agentId, {
    enabled: canKill && agentId !== '',
  });
  const showResponder = useWithShowResponder();

  const disabledReason = useMemo<ReactNode | undefined>(() => {
    if (agentId === '') return NO_ENDPOINT_AGENT_ID;
    if (isFetching) return LOADING_ENDPOINT_DATA_TOOLTIP;
    if (error?.body?.statusCode === 404) return NOT_FROM_ENDPOINT_HOST_TOOLTIP;
    if (
      (error?.body?.statusCode === 400 && error.body.message.includes('unenrolled')) ||
      data?.host_status === HostStatus.UNENROLLED
    ) {
      return HOST_ENDPOINT_UNENROLLED_TOOLTIP;
    }
    if (error || !data) return METADATA_API_ERROR_TOOLTIP;
    return undefined;
  }, [agentId, data, error, isFetching]);

  return useCallback(
    (closePopover: () => void) => {
      if (!canKill) return [];
      return runs.map((run) => (
        <EuiContextMenuItem
          key={run.id}
          icon="cross"
          disabled={disabledReason !== undefined}
          toolTipContent={disabledReason}
          data-test-subj={AI_AGENT_TEST_IDS.killProcess}
          onClick={() => {
            if (!data) return;
            closePopover();
            showResponder({
              agentId,
              agentType: 'endpoint',
              hostName: data.metadata.host.name,
              platform: data.metadata.host.os.name.toLowerCase(),
              capabilities: (data.metadata.Endpoint.capabilities ?? []) as EndpointCapabilities[],
              inputCommand: `kill-process --entityId="${consoleValue(run.root.entityId)}"`,
            });
          }}
        >
          {killProcessLabel(run.root.pid)}
        </EuiContextMenuItem>
      ));
    },
    [agentId, canKill, data, disabledReason, runs, showResponder]
  );
};
