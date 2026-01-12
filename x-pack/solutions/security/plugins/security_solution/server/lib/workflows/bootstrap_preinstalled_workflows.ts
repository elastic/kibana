/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { PREINSTALLED_WORKFLOWS, type PreinstalledWorkflow } from './workflow_registry';

function createSystemRequest(): KibanaRequest {
  const rawRequest = {
    headers: {
      'kbn-system-request': 'true',
    },
    path: '/',
  };

  return kibanaRequestFactory(rawRequest);
}

export interface BootstrapResult {
  installed: number;
  updated: number;
  skipped: number;
  errors: number;
}

type BootstrapAction = 'installed' | 'updated' | 'skipped';

/**
 * Service class for bootstrapping preinstalled workflows.
 * Handles installation of new workflows and updates to existing workflows when YAML files change.
 */
export class PreinstalledWorkflowsBootstrap {
  private readonly systemRequest: KibanaRequest;
  private readonly workflowsDir: string;
  private readonly yamlCache = new Map<string, string>();

  constructor(
    private readonly workflowsManagement: WorkflowsServerPluginSetup,
    private readonly spaceId: string,
    private readonly logger: Logger
  ) {
    this.systemRequest = createSystemRequest();
    // workflowsDir points to the workflows directory, filePath in registry is relative to this
    this.workflowsDir = resolve(__dirname);
  }

  /**
   * Main bootstrap method - installs or updates all preinstalled workflows
   */
  public async bootstrap(): Promise<BootstrapResult> {
    this.logger.info(
      `[PreinstalledWorkflows] Bootstrap method started - workflowsDir: ${this.workflowsDir}, workflowCount: ${PREINSTALLED_WORKFLOWS.length}, spaceId: ${this.spaceId}, hasManagement: ${!!this.workflowsManagement?.management}`
    );
    
    if (!this.workflowsManagement?.management) {
      this.logger.warn('[PreinstalledWorkflows] Workflows management plugin not available, skipping workflow installation');
      return { installed: 0, updated: 0, skipped: 0, errors: 0 };
    }

    const stats: BootstrapResult = {
      installed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    this.logger.info(`Starting bootstrap of ${PREINSTALLED_WORKFLOWS.length} pre-installed workflow(s)`);

    for (const workflow of PREINSTALLED_WORKFLOWS) {
      try {
        const result = await this.processWorkflow(workflow);
        stats[result]++;
      } catch (error: any) {
        if (error.statusCode === 409 || error.message?.includes('already exists')) {
          this.logger.debug(`Workflow ${workflow.id} already exists (conflict), skipping`);
          stats.skipped++;
        } else {
          this.logger.error(`Failed to process workflow ${workflow.id}: ${error.message}`, {
            error: error.stack,
          });
          stats.errors++;
        }
      }
    }

    this.logger.info(
      `Completed workflow bootstrap: ${stats.installed} installed, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`
    );

    return stats;
  }

  /**
   * Process a single workflow - install if new, update if changed
   */
  private async processWorkflow(workflow: PreinstalledWorkflow): Promise<BootstrapAction> {
    this.logger.debug(`Processing workflow ${workflow.id} from ${workflow.filePath}`);
    
    const existing = await this.workflowsManagement.management!.getWorkflow(workflow.id, this.spaceId);
    
    if (existing) {
      this.logger.debug(`Workflow ${workflow.id} already exists. ${existing.deletedAt ? 'It is soft deleted' : ''}`.trim());
    } else {
      this.logger.debug(`Workflow ${workflow.id} does not exist, will install`);
    }
    
    const fileYaml = this.loadWorkflowYaml(workflow.filePath);
    this.logger.debug(`Loaded YAML for ${workflow.id}, length: ${fileYaml.length} characters`);

    if (!existing) {
      await this.installWorkflow(workflow, fileYaml);
      return 'installed';
    }

    if (this.shouldUpdate(existing.yaml || '', fileYaml) || existing.deletedAt === null) {
      await this.updateWorkflow(workflow.id, fileYaml);
      return 'updated';
    }

    this.logger.debug(`Workflow ${workflow.id} already exists and YAML is unchanged, skipping`);
    return 'skipped';
  }

  /**
   * Install a new workflow
   */
  private async installWorkflow(workflow: PreinstalledWorkflow, yaml: string): Promise<void> {
    this.logger.debug(`Loading workflow YAML for ${workflow.id}, length: ${yaml.length} characters`);

    const createdWorkflow = await this.workflowsManagement.management!.createWorkflow(
      {
        id: workflow.id,
        yaml,
      },
      this.spaceId,
      this.systemRequest
    );

    this.logger.info(
      `Successfully installed pre-installed workflow: ${workflow.id} (enabled: ${createdWorkflow.enabled}, valid: ${createdWorkflow.valid})`
    );
  }

  /**
   * Update an existing workflow with new YAML
   */
  private async updateWorkflow(workflowId: string, yaml: string): Promise<void> {
    this.logger.info(`Workflow ${workflowId} exists but YAML has changed, updating...`);

    await this.workflowsManagement.management!.updateWorkflow(
      workflowId,
      { yaml },
      this.spaceId,
      this.systemRequest
    );

    this.logger.info(`Successfully updated pre-installed workflow: ${workflowId}`);
  }

  /**
   * Check if workflow should be updated by comparing YAML
   */
  private shouldUpdate(existingYaml: string, fileYaml: string): boolean {
    return this.normalizeYaml(existingYaml) !== this.normalizeYaml(fileYaml);
  }

  /**
   * Load workflow YAML from file (with caching)
   * @param relativeFilePath - Relative file path from the workflows directory (e.g., './preinstalled_workflows/file.yml')
   */
  private loadWorkflowYaml(relativeFilePath: string): string {
    if (this.yamlCache.has(relativeFilePath)) {
      return this.yamlCache.get(relativeFilePath)!;
    }

    // Normalize path: remove leading ./ if present, then join
    const normalizedPath = relativeFilePath.startsWith('./') 
      ? relativeFilePath.slice(2) 
      : relativeFilePath;
    const filePath = resolve(join(this.workflowsDir, normalizedPath));
    
    this.logger.debug(`Loading workflow YAML from: ${filePath} (resolved from ${relativeFilePath})`);
    
    try {
      const yaml = readFileSync(filePath, 'utf-8');
      this.yamlCache.set(relativeFilePath, yaml);
      return yaml;
    } catch (error: any) {
      const errorMessage = `Failed to read workflow file ${relativeFilePath} at ${filePath}: ${error.message}`;
      this.logger.error(errorMessage, {
        workflowsDir: this.workflowsDir,
        relativeFilePath,
        resolvedPath: filePath,
        error: error.stack,
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Normalize YAML strings for comparison
   */
  private normalizeYaml(yaml: string): string {
    return yaml
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }
}

/**
 * Convenience function for backward compatibility.
 * Creates a bootstrap instance and runs it.
 */
export async function bootstrapPreinstalledWorkflows(
  workflowsManagement: WorkflowsServerPluginSetup,
  spaceId: string,
  logger: Logger
): Promise<void> {
  logger.info('[PreinstalledWorkflows] Bootstrap function called');
  logger.debug(
    `[PreinstalledWorkflows] Creating bootstrap instance - hasWorkflowsManagement: ${!!workflowsManagement}, hasManagement: ${!!workflowsManagement?.management}, spaceId: ${spaceId}, workflowCount: ${PREINSTALLED_WORKFLOWS.length}`
  );
  
  const bootstrap = new PreinstalledWorkflowsBootstrap(workflowsManagement, spaceId, logger);
  const result = await bootstrap.bootstrap();
  
  logger.info(
    `[PreinstalledWorkflows] Bootstrap completed - installed: ${result.installed}, updated: ${result.updated}, skipped: ${result.skipped}, errors: ${result.errors}`
  );
}
