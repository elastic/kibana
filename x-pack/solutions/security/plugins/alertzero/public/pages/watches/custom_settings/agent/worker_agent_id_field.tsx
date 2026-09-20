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
import { useWorkerAgents } from './use_worker_agents';

interface WorkerAgentIdFieldProps {
  /** Undefined means no agent has been picked: the default agent is shown but nothing is stored. */
  current?: string;
  isDisabled?: boolean;
  /**
   * Called with `undefined` when the user selects the default agent: picking the default is how a
   * user un-picks, and storing it would pin the Worker to today's default forever instead of
   * following it.
   */
  onChange: (agentId: string | undefined) => void;
  /** Copy is owned by the Watch team that renders this control, not by this component. */
  label: string;
  helpText: string;
  ariaLabel: string;
  /** Distinguishes this Worker's control in tests and telemetry. */
  dataTestSubj: string;
}

/**
 * Agent picker for a Worker, mirroring the alert analysis workflow's setting. Selecting is what
 * stores a value — an untouched field leaves the Worker's stored agent absent and the workflow
 * running its own default agent.
 *
 * Worker-agnostic by construction: it takes the current value and a change handler, so a Watch
 * team adds an agent control by rendering this with its own copy and writing the result into its
 * own `extras`. No Worker id is branched on here.
 */
export const WorkerAgentIdField: React.FC<WorkerAgentIdFieldProps> = ({
  current,
  isDisabled,
  onChange,
  label,
  helpText,
  ariaLabel,
  dataTestSubj,
}) => {
  const { agents, isLoading } = useWorkerAgents(!isDisabled);
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
    <EuiFormRow label={label} helpText={helpText} fullWidth data-test-subj={`${dataTestSubj}Field`}>
      <EuiSuperSelect
        fullWidth
        options={agentOptions}
        valueOfSelected={selectedAgentId}
        isLoading={isLoading}
        disabled={isDisabled}
        aria-label={ariaLabel}
        onChange={(agentId) =>
          onChange(agentId === agentBuilderDefaultAgentId ? undefined : agentId)
        }
        data-test-subj={`${dataTestSubj}Selector`}
      />
    </EuiFormRow>
  );
};
