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
  name: string;
  tags?: string[];
}

export type AlertRetrievalMode = 'custom_only' | 'custom_query' | 'esql';

export interface WorkflowConfiguration {
  alertRetrievalMode: AlertRetrievalMode;
  alertRetrievalWorkflowIds: string[];
  esqlQuery?: string;
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
