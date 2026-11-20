/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import { registerWorkflowSteps } from './register_workflow_steps';
import { renderAlertNarrativeStepDefinition } from './render_alert_narrative_step';
import { buildAlertEntityGraphStepDefinition } from './build_alert_entity_graph_step';
import { assignAlertStepDefinition } from './assign_alert_step/assign_alert_step';
import { setAlertStatusStepDefinition } from './set_alert_status_step/set_alert_status_step';
import { setAlertTagsStepDefinition } from './set_alert_tags_step/set_alert_tags_step';
import { assignAttackStepDefinition } from './assign_attack_step/assign_attack_step';
import { setAttackStatusStepDefinition } from './set_attack_status_step/set_attack_status_step';
import { setAttackTagsStepDefinition } from './set_attack_tags_step/set_attack_tags_step';
import { enableRuleStepDefinition } from './enable_rule_step/enable_rule_step';
import { disableRuleStepDefinition } from './disable_rule_step/disable_rule_step';
import { createRuleExceptionStepDefinition } from './create_rule_exception_step/create_rule_exception_step';
import { buildExceptionEntriesFilterStepDefinition } from './build_exception_entries_filter_step/build_exception_entries_filter_step';
import { createExceptionListItemStepDefinition } from './create_exception_list_item_step/create_exception_list_item_step';
import { createNoteStepDefinition } from './create_note_step/create_note_step';
import { deleteNoteStepDefinition } from './delete_note_step/delete_note_step';
import { getNotesStepDefinition } from './get_notes_step/get_notes_step';
import { updateNoteStepDefinition } from './update_note_step/update_note_step';
import { createRuleStepDefinition } from './create_rule_step/create_rule_step';
import { patchRuleStepDefinition } from './patch_rule_step/patch_rule_step';
import { getAlertEntitiesStepDefinition } from './get_alert_entities_step/get_alert_entities_step';
import { matchAttackFingerprintsStepDefinition } from './match_attack_fingerprints/match_attack_fingerprints_step';
import { aesopSelectWinnerStepDefinition } from './aesop_select_winner/aesop_select_winner_step';
import { aesopCaptureDatasetStepDefinition } from './aesop_capture_dataset/aesop_capture_dataset_step';
import { aesopCollectFailuresStepDefinition } from './aesop_collect_failures/aesop_collect_failures_step';

type StepLoader = () => Promise<PublicStepDefinition | undefined>;

const isStepLoader = (arg: unknown): arg is StepLoader => typeof arg === 'function';

const getStepLoaders = (
  workflowsExtensions: ReturnType<typeof workflowsExtensionsMock.createSetup>
): StepLoader[] =>
  workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => {
    if (!isStepLoader(arg)) {
      throw new Error('Expected registerStepDefinition to receive an async loader');
    }
    return arg;
  });

const createWorkflowsExtensionsMock = workflowsExtensionsMock.createSetup;
const enabled = { experimentalFeatures: { aesopPrototypeEnabled: true } };

describe('registerWorkflowSteps (public)', () => {
  it('calls registerStepDefinition synchronously for all steps', () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, enabled);

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(24);
    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(expect.any(Function));
  });

  it('async loaders resolve to each step definition', async () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, enabled);

    const [
      loader1,
      loader2,
      loader3,
      loader4,
      loader5,
      loader6,
      loader7,
      loader8,
      loader9,
      loader10,
      loader11,
      loader12,
      loader13,
      loader14,
      loader15,
      loader16,
      loader17,
      loader18,
      loader19,
      loader20,
      loader21,
      loader22,
      loader23,
      loader24,
    ] = getStepLoaders(workflowsExtensions);

    await expect(loader1()).resolves.toBe(renderAlertNarrativeStepDefinition);
    await expect(loader2()).resolves.toBe(buildAlertEntityGraphStepDefinition);
    await expect(loader3()).resolves.toBe(assignAlertStepDefinition);
    await expect(loader4()).resolves.toBe(setAlertStatusStepDefinition);
    await expect(loader5()).resolves.toBe(setAlertTagsStepDefinition);
    await expect(loader6()).resolves.toBe(assignAttackStepDefinition);
    await expect(loader7()).resolves.toBe(setAttackStatusStepDefinition);
    await expect(loader8()).resolves.toBe(setAttackTagsStepDefinition);
    await expect(loader9()).resolves.toBe(enableRuleStepDefinition);
    await expect(loader10()).resolves.toBe(disableRuleStepDefinition);
    await expect(loader11()).resolves.toBe(createRuleExceptionStepDefinition);
    await expect(loader12()).resolves.toBe(buildExceptionEntriesFilterStepDefinition);
    await expect(loader13()).resolves.toBe(createExceptionListItemStepDefinition);
    await expect(loader14()).resolves.toBe(createNoteStepDefinition);
    await expect(loader15()).resolves.toBe(deleteNoteStepDefinition);
    await expect(loader16()).resolves.toBe(getNotesStepDefinition);
    await expect(loader17()).resolves.toBe(updateNoteStepDefinition);
    await expect(loader18()).resolves.toBe(createRuleStepDefinition);
    await expect(loader19()).resolves.toBe(patchRuleStepDefinition);
    await expect(loader20()).resolves.toBe(getAlertEntitiesStepDefinition);
    await expect(loader21()).resolves.toBe(matchAttackFingerprintsStepDefinition);
    await expect(loader22()).resolves.toBe(aesopSelectWinnerStepDefinition);
    await expect(loader23()).resolves.toBe(aesopCaptureDatasetStepDefinition);
    await expect(loader24()).resolves.toBe(aesopCollectFailuresStepDefinition);
  });

  it('does not register the AESOP steps when the prototype is disabled', async () => {
    const workflowsExtensions = createWorkflowsExtensionsMock();

    registerWorkflowSteps(workflowsExtensions, {
      experimentalFeatures: { aesopPrototypeEnabled: false },
    });

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(21);
    const loaded = await Promise.all(getStepLoaders(workflowsExtensions).map((load) => load()));
    expect(loaded).not.toContain(aesopSelectWinnerStepDefinition);
    expect(loaded).not.toContain(aesopCaptureDatasetStepDefinition);
    expect(loaded).not.toContain(aesopCollectFailuresStepDefinition);
  });
});
