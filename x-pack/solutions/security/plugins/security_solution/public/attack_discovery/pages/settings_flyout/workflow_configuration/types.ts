/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WorkflowItem {
  description: string;
  enabled?: boolean;
  id: string;
  isDefault?: boolean;
  managed?: boolean;
  name: string;
  tags?: string[];
}

/**
 * Query mode for the built-in default alert retrieval workflow. Only meaningful
 * when {@link WorkflowConfiguration.defaultRetrievalEnabled} is `true`.
 */
export type AlertRetrievalMode = 'custom_query' | 'esql';

/**
 * Composite workflow configuration for alert retrieval and validation.
 *
 * Three independent retrieval toggles compose the alert set; at least one must be enabled:
 * - {@link skillEnabled} (Toggle 1): the attack discovery skill performs its own additional retrieval.
 * - {@link defaultRetrievalEnabled} (Toggle 2): the built-in default alert retrieval workflow runs.
 * - {@link alertRetrievalWorkflowsEnabled} (Toggle 3): user-created alert retrieval workflows run.
 */
export interface WorkflowConfiguration {
  alertRetrievalMode: AlertRetrievalMode;
  alertRetrievalWorkflowIds: string[];
  alertRetrievalWorkflowsEnabled: boolean;
  defaultRetrievalEnabled: boolean;
  esqlQuery?: string;
  skillEnabled: boolean;
  validationWorkflowId: string;
}

export interface WorkflowPickerProps {
  'data-test-subj'?: string;
  helpText?: string;
  isInvalid?: boolean;
  isLoading?: boolean;
  label: string;
  onChange: (workflowIds: string[]) => void;
  placeholder?: string;
  required?: boolean;
  selectedWorkflowIds: string[];
  singleSelection?: boolean;
  workflows: WorkflowItem[];
}

export interface DefaultAlertRetrievalAccordionProps {
  children: React.ReactNode;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export interface WorkflowConfigurationPanelProps {
  connectorId: string | undefined;
  isInvalid?: boolean;
  onChange: (config: WorkflowConfiguration) => void;
  value: WorkflowConfiguration;
}
