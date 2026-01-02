/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PreinstalledWorkflow {
  id: string;
  /**
   * Relative file path from the workflows directory to the YAML file
   * Example: './preinstalled_workflows/alert_validation_worklfow.yml'
   */
  filePath: string;
}

export const PREINSTALLED_WORKFLOWS: PreinstalledWorkflow[] = [
  {
    id: 'workflow-3cf6d7f4-864f-4722-834d-ae1743f445ee',
    filePath: './preinstalled_workflows/alert_validation_workflow.yml',
  },
];

