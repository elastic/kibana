/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { registerWorkflowSteps } from './register_workflow_steps';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import { setAlertStatusStepDefinition } from './set_alert_status_step/set_alert_status_step';
import { setAlertTagsStepDefinition } from './set_alert_tags_step/set_alert_tags_step';
import { setAttackTagsStepDefinition } from './set_attack_tags_step/set_attack_tags_step';
import { assignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { assignAttackStepDefinition } from './assign_attack_step/assign_attack_step';
import { setAttackStatusStepDefinition } from './set_attack_status_step/set_attack_status_step';
import { enableRuleStepDefinition } from './enable_rule_step/enable_rule_step';
import { disableRuleStepDefinition } from './disable_rule_step/disable_rule_step';
import { createRuleExceptionStepDefinition } from './create_rule_exception_step/create_rule_exception_step';
import { createExceptionListItemStepDefinition } from './create_exception_list_item_step/create_exception_list_item_step';
import { createNoteStepDefinition } from './create_note_step/create_note_step';
import { deleteNoteStepDefinition } from './delete_note_step/delete_note_step';
import { getNotesStepDefinition } from './get_notes_step/get_notes_step';
import { updateNoteStepDefinition } from './update_note_step/update_note_step';
import { createRuleStepDefinition } from './create_rule_step/create_rule_step';
import { patchRuleStepDefinition } from './patch_rule_step/patch_rule_step';

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;

describe('registerWorkflowSteps (server)', () => {
  it('registers all steps', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(18);
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      renderAlertNarrativeStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      buildAlertEntityGraphStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAlertStatusStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAlertTagsStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      assignAlertStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      assignAttackStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAttackStatusStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      setAttackTagsStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      enableRuleStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      disableRuleStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      createRuleExceptionStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      createExceptionListItemStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      createNoteStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      deleteNoteStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(getNotesStepDefinition);
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      updateNoteStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      createRuleStepDefinition
    );
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      patchRuleStepDefinition
    );
  });
});
