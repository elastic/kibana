/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

const WORKFLOWS_APP_ID = 'workflows';

/**
 * Generous timeout for the first navigation into the Workflows app: in dev mode
 * Kibana compiles the app bundle on first access, which can take well over the
 * default 10s.
 */
const APP_LOAD_TIMEOUT = 120_000;

/**
 * Page object for authoring and running a workflow in the Workflows app and
 * reading back an executed step's result. Trimmed from the workflows_management
 * Scout page objects to the flow these exception-step tests need: type YAML in
 * the Monaco editor, save, run, wait for a terminal execution status, then read
 * a step's output/error JSON from the execution panel.
 */
export class WorkflowsAppPage {
  public readonly yamlEditor: Locator;
  public readonly saveButton: Locator;
  public readonly runButton: Locator;
  public readonly executionPanel: Locator;

  constructor(private readonly page: ScoutPage) {
    this.yamlEditor = this.page.testSubj.locator('workflowYamlEditor');
    this.saveButton = this.page.testSubj.locator('saveWorkflowHeaderButton');
    this.runButton = this.page.testSubj.locator('runWorkflowHeaderButton');
    this.executionPanel = this.page.testSubj.locator('workflowExecutionPanel');
  }

  /** Open the editor for a brand-new workflow. */
  async gotoNewWorkflow(): Promise<void> {
    await this.page.gotoApp(WORKFLOWS_APP_ID);
    await this.page.testSubj.waitForSelector('createWorkflowButton', {
      state: 'visible',
      timeout: APP_LOAD_TIMEOUT,
    });
    await this.page.testSubj.click('createWorkflowButton');
    await this.yamlEditor.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT });
  }

  /** Resolve the Monaco `data-uri` of an editor container. */
  private async getEditorUri(editor: Locator): Promise<string> {
    const uri = await editor.locator('.monaco-editor[data-uri]').getAttribute('data-uri');
    if (!uri) {
      throw new Error('Editor data-uri not found');
    }
    return uri;
  }

  /** Set a Monaco editor's value via the model API (reliable, non-flaky). */
  private async setEditorValue(editor: Locator, value: string): Promise<void> {
    const uri = await this.getEditorUri(editor);
    await this.page.evaluate(
      ({ modelUri, editorValue }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Monaco env is global and untyped
        const monacoEnv = (window as any).MonacoEnvironment;
        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }
        const model = monacoEnv.monaco.editor.getModel(modelUri);
        if (!model) {
          throw new Error('Editor model not found');
        }
        model.setValue(editorValue);
      },
      { modelUri: uri, editorValue: value }
    );
  }

  /** Type the workflow definition into the main YAML editor. */
  async setYamlEditorValue(value: string): Promise<void> {
    await this.setEditorValue(this.yamlEditor, value);
  }

  /** Save the workflow and wait for the saved-changes badge. */
  async saveWorkflow(): Promise<void> {
    await this.saveButton.click();
    await this.page.testSubj.waitForSelector('workflowSavedChangesBadge', {
      timeout: APP_LOAD_TIMEOUT,
    });
  }

  /**
   * Run the currently-open, saved workflow with the given inputs.
   *
   * Clicking Run either opens the execute modal (manual triggers with
   * declared `inputs`) or runs the workflow directly and navigates straight
   * to the execution view (no declared inputs). Both are legitimate app
   * behavior, so this races the two outcomes instead of assuming the modal
   * always appears.
   */
  async runWorkflow(inputs: Record<string, unknown> = {}): Promise<void> {
    await this.runButton.click();

    const executeModal = this.page.testSubj.locator('workflowExecuteModal');
    const outcome = await Promise.race([
      executeModal
        .waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT })
        .then(() => 'modal' as const),
      this.page
        .waitForURL('**/workflows/*?executionId=*', { timeout: APP_LOAD_TIMEOUT })
        .then(() => 'ran' as const),
    ]);

    if (outcome === 'ran') {
      return;
    }

    const inputsEditor = this.page.testSubj.locator('workflow-manual-json-editor');
    await inputsEditor.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT });
    await this.setEditorValue(inputsEditor, JSON.stringify(inputs, null, 2));
    await this.page.testSubj.click('executeWorkflowButton');
  }

  /**
   * Wait for the execution detail view to show a terminal status. When
   * expecting `completed`, fail fast (with the failed step's error JSON) if the
   * execution fails instead of timing out.
   */
  async waitForExecutionStatus(status: 'completed' | 'failed', timeout: number): Promise<void> {
    await this.page.waitForURL('**/workflows/*?executionId=*');
    await this.executionPanel.waitFor({ state: 'visible' });

    const withStatus = (s: string) =>
      this.executionPanel.and(this.page.locator(`[data-execution-status="${s}"]`));

    if (status === 'completed') {
      const winner = await Promise.race([
        withStatus('completed')
          .waitFor({ state: 'visible', timeout })
          .then(() => 'completed' as const),
        withStatus('failed')
          .waitFor({ state: 'visible', timeout })
          .then(() => 'failed' as const),
      ]);
      if (winner === 'failed') {
        throw new Error('Expected execution status "completed" but got "failed".');
      }
      return;
    }
    await withStatus(status).waitFor({ state: 'visible', timeout });
  }

  /** Locate a top-level step button in the execution tree by its step name. */
  private getStep(stepName: string): Locator {
    return this.executionPanel
      .locator('button:has(span[data-test-subj="workflowStepName"])')
      .filter({ hasText: stepName });
  }

  /**
   * Open a step in the execution tree and read its result JSON as the caller's
   * expected shape.
   */
  async getStepResultJson<T>(stepName: string, type: 'output' | 'error'): Promise<T> {
    await this.getStep(stepName).click();

    const details = this.page.testSubj.locator('workflowStepExecutionDetails');
    await details.locator(`button[data-test-subj="workflowStepTab_${type}"]`).click();
    await details.locator('button[data-test-subj="workflowViewMode_json"]').click();

    const jsonEditor = this.page.testSubj.locator('workflowStepResultJsonEditor');
    await jsonEditor.waitFor({ state: 'visible' });
    const uri = await this.getEditorUri(jsonEditor);
    const stringValue = await this.page.evaluate((modelUri) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Monaco env is global and untyped
      const monacoEnv = (window as any).MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }
      const model = monacoEnv.monaco.editor.getModel(modelUri);
      if (!model) {
        throw new Error('Step result JSON editor model not found');
      }
      return model.getValue();
    }, uri);

    return JSON.parse(stringValue) as T;
  }
}
