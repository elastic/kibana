/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useHuntAgents } from './use_hunt_agents';
import * as i18n from './translations';

interface HuntAgentIdFieldProps {
  /** Undefined means no agent has been picked: the default agent is shown but nothing is stored. */
  current?: string;
  isDisabled?: boolean;
  onChange: (agentId: string) => void;
}

/**
 * Agent picker for the Continuous Threat Hunt Worker, mirroring the alert analysis workflow's
 * setting. Selecting is what stores a value — an untouched field leaves the Worker's `extras`
 * absent and the workflow running its own default agent.
 */
export const HuntAgentIdField: React.FC<HuntAgentIdFieldProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  const { agents, isLoading } = useHuntAgents(!isDisabled);
  const selectedAgentId = current ?? agentBuilderDefaultAgentId;
  const agentOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
    const options = agents.map((agent) => ({ value: agent.id, inputDisplay: agent.name }));
    // Keep the currently selected agent visible even if it is missing from the fetched list (for
    // example a custom agent that was deleted), so the selection is never silently lost.
    if (!options.some((option) => option.value === selectedAgentId)) {
      options.push({ value: selectedAgentId, inputDisplay: selectedAgentId });
    }
    return options;
  }, [agents, selectedAgentId]);

  return (
    <EuiFormRow
      label={i18n.HUNT_AGENT_LABEL}
      helpText={i18n.HUNT_AGENT_HELP}
      fullWidth
      data-test-subj="alertZeroHuntAgentField"
    >
      <EuiSuperSelect
        fullWidth
        options={agentOptions}
        valueOfSelected={selectedAgentId}
        isLoading={isLoading}
        disabled={isDisabled}
        aria-label={i18n.HUNT_AGENT_ARIA_LABEL}
        onChange={onChange}
        data-test-subj="alertZeroHuntAgentSelector"
      />
    </EuiFormRow>
  );
};
