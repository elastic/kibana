/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CAP_EXCEEDED_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.capExceededTitle',
  { defaultMessage: 'Too many timelines selected' }
);

export const capExceededText = (max: number) =>
  i18n.translate('xpack.securitySolution.timeline.superTimeline.capExceededText', {
    defaultMessage:
      'You can combine at most {max} timelines into a Super Timeline. Select {max} or fewer.',
    values: { max },
  });

export const TOO_FEW_TIMELINES_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.tooFewTimelinesTitle',
  { defaultMessage: 'Select at least 2 timelines' }
);

export const tooFewTimelinesText = (min: number) =>
  i18n.translate('xpack.securitySolution.timeline.superTimeline.tooFewTimelinesText', {
    defaultMessage: 'A Super Timeline requires at least {min} source timelines.',
    values: { min },
  });

export const OVERWRITE_CONFIRM_MESSAGE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.overwriteConfirmMessage',
  { defaultMessage: 'Opening a Super Timeline will discard your unsaved changes. Continue?' }
);

export const OVERWRITE_CONFIRM_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.overwriteConfirmTitle',
  { defaultMessage: 'Discard unsaved changes?' }
);

export const OVERWRITE_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.overwriteConfirmButton',
  { defaultMessage: 'Open Super Timeline' }
);

export const PARTIAL_FETCH_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.partialFetchTitle',
  { defaultMessage: 'Some timelines could not be loaded' }
);

export const partialFetchText = (ids: string) =>
  i18n.translate('xpack.securitySolution.timeline.superTimeline.partialFetchText', {
    defaultMessage: 'The following timelines could not be fetched and were skipped: {ids}.',
    values: { ids },
  });

export const TOO_FEW_SUCCEEDED_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.tooFewSucceededTitle',
  { defaultMessage: 'Not enough timelines loaded' }
);

export const tooFewSucceededText = (min: number) =>
  i18n.translate('xpack.securitySolution.timeline.superTimeline.tooFewSucceededText', {
    defaultMessage: 'At least {min} timelines must load successfully to build a Super Timeline.',
    values: { min },
  });

export const SKIPPED_QUERY_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.skippedQueryTitle',
  { defaultMessage: 'Some timeline queries could not be merged' }
);

export const skippedQueryText = (titles: string) =>
  i18n.translate('xpack.securitySolution.timeline.superTimeline.skippedQueryText', {
    defaultMessage:
      'The following timelines use EQL or ESQL and their queries were not included: {titles}. Their pinned events and notes are still shown.',
    values: { titles },
  });

export const ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.errorTitle',
  { defaultMessage: 'Failed to open Super Timeline' }
);

export const unnamedTimeline = (index: number) =>
  i18n.translate('xpack.securitySolution.timeline.superTimeline.unnamedTimeline', {
    defaultMessage: 'Timeline {number}',
    values: { number: index + 1 },
  });

export const NO_NOTES_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.noNotesTitle',
  { defaultMessage: 'No notes across the selected timelines' }
);

export const NO_NOTES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.superTimeline.noNotesDescription',
  {
    defaultMessage:
      'This view aggregates notes from all source timelines. Notes added to individual timelines will appear here.',
  }
);
