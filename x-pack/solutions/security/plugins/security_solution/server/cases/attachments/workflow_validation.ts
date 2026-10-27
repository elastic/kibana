/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isPlainObject } from 'lodash';
import type { WorkflowAttachmentValidationContext } from '@kbn/cases-plugin/server';

const getSelectedIds = (
  inputs: Record<string, unknown>,
  field: 'alertIds' | 'documents'
): string[] => {
  const event = isPlainObject(inputs.event) ? (inputs.event as Record<string, unknown>) : undefined;
  const pairs = event?.[field];
  if (!Array.isArray(pairs)) {
    return [];
  }

  return pairs.flatMap((pair) => {
    if (!isPlainObject(pair) || typeof pair._id !== 'string') {
      return [];
    }
    return [pair._id];
  });
};

const targetsMatch = (targets: readonly string[], selectedIds: readonly string[]): boolean => {
  const targetSet = new Set(targets);
  const selectedSet = new Set(selectedIds);
  return (
    targetSet.size === selectedSet.size &&
    [...targetSet].every((targetId) => selectedSet.has(targetId))
  );
};

const createTargetValidator =
  ({
    inputKey,
    missingInputsMessage,
    mismatchMessage,
  }: {
    inputKey: 'alertIds' | 'documents';
    missingInputsMessage: string;
    mismatchMessage: string;
  }) =>
  ({ targets, inputs }: WorkflowAttachmentValidationContext): void => {
    const selectedIds = getSelectedIds(inputs, inputKey);
    if (selectedIds.length === 0) {
      throw Boom.badRequest(missingInputsMessage);
    }
    if (
      !targetsMatch(
        targets.map(({ id }) => id),
        selectedIds
      )
    ) {
      throw Boom.badRequest(mismatchMessage);
    }
  };

export const validateAlertWorkflowTargets = createTargetValidator({
  inputKey: 'alertIds',
  missingInputsMessage: 'Alert attachment workflow origins require selected alert inputs.',
  mismatchMessage: 'Alert workflow origin targets must match the selected alerts.',
});

// Attacks are run through the alerts workflow panel, so the selected ids arrive in `event.alertIds`
// exactly as they do for alerts — they are the attack ids rather than the ids of the alerts the
// attacks group together.
export const validateAttackWorkflowTargets = createTargetValidator({
  inputKey: 'alertIds',
  missingInputsMessage: 'Attack attachment workflow origins require selected attack inputs.',
  mismatchMessage: 'Attack workflow origin targets must match the selected attacks.',
});

export const validateEventWorkflowTargets = createTargetValidator({
  inputKey: 'documents',
  missingInputsMessage: 'Event attachment workflow origins require selected document inputs.',
  mismatchMessage: 'Event workflow origin targets must match the selected documents.',
});
