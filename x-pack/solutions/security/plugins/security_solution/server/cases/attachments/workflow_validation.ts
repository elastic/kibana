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
  fields: ReadonlyArray<'alertIds' | 'documents' | 'documentIds'>
): string[] => {
  const event = isPlainObject(inputs.event) ? (inputs.event as Record<string, unknown>) : undefined;

  return fields.flatMap((field) => {
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
    inputKeys,
    missingInputsMessage,
    mismatchMessage,
  }: {
    inputKeys: ReadonlyArray<'alertIds' | 'documents' | 'documentIds'>;
    missingInputsMessage: string;
    mismatchMessage: string;
  }) =>
  ({ targets, inputs }: WorkflowAttachmentValidationContext): void => {
    const selectedIds = getSelectedIds(inputs, inputKeys);
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
  inputKeys: ['alertIds'],
  missingInputsMessage: 'Alert attachment workflow origins require selected alert inputs.',
  mismatchMessage: 'Alert workflow origin targets must match the selected alerts.',
});

// Attacks are run through the alerts workflow panel, so the selected ids arrive in `event.alertIds`
// exactly as they do for alerts — they are the attack ids rather than the ids of the alerts the
// attacks group together.
export const validateAttackWorkflowTargets = createTargetValidator({
  inputKeys: ['alertIds'],
  missingInputsMessage: 'Attack attachment workflow origins require selected attack inputs.',
  mismatchMessage: 'Attack workflow origin targets must match the selected attacks.',
});

export const validateEventWorkflowTargets = createTargetValidator({
  inputKeys: ['documents', 'documentIds'],
  missingInputsMessage: 'Event attachment workflow origins require selected document inputs.',
  mismatchMessage: 'Event workflow origin targets must match the selected documents.',
});
