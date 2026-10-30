/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HOW_DETECTION_WORKS_TITLE = i18n.translate(
  'xpack.nightshift.detectionOnboarding.howDetectionWorksTitle',
  { defaultMessage: 'How does detection work?' }
);

export const LEARNS_TITLE = i18n.translate('xpack.nightshift.detectionOnboarding.learnsTitle', {
  defaultMessage: 'Elastic nightshift constantly learns how your system is working',
});

export const LEARNS_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionOnboarding.learnsDescription',
  {
    defaultMessage:
      'It observes in the background and notices unusual changes — so you can catch issues early, before they get bigger.',
  }
);

export const PRIORITIZES_TITLE = i18n.translate(
  'xpack.nightshift.detectionOnboarding.prioritizesTitle',
  { defaultMessage: 'You only see the problems that are worth your time' }
);

export const PRIORITIZES_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionOnboarding.prioritizesDescription',
  {
    defaultMessage:
      'Related signals are pulled together into significant events instead of a pile of tiny alerts — so you see what actually needs attention.',
  }
);

export const INVESTIGATES_TITLE = i18n.translate(
  'xpack.nightshift.detectionOnboarding.investigatesTitle',
  { defaultMessage: 'Then it helps you investigate and dig into the issue' }
);

export const INVESTIGATES_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionOnboarding.investigatesDescription',
  {
    defaultMessage:
      'When something matters, you get a clear starting point — what changed, where it shows up, and enough context to decide what to do next.',
  }
);

export const SELECT_SOURCES_TITLE = i18n.translate(
  'xpack.nightshift.detectionOnboarding.selectSourcesTitle',
  { defaultMessage: 'Select data sources to analyze' }
);

export const LOCKED_TITLE = i18n.translate('xpack.nightshift.detectionOnboarding.lockedTitle', {
  defaultMessage: 'Detection setup requires manage access',
});

export const LOCKED_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionOnboarding.lockedDescription',
  {
    defaultMessage:
      'A user with Nightshift manage access has to set up detection for this space. Ask them to add a source.',
  }
);

export const NO_SOURCES_TITLE = i18n.translate(
  'xpack.nightshift.detectionOnboarding.noSourcesTitle',
  { defaultMessage: 'No sources configured' }
);

export const NO_SOURCES_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionOnboarding.noSourcesDescription',
  {
    defaultMessage:
      'Detection is stopped because this space has no sources. Only earlier results are shown.',
  }
);

export const ADD_SOURCE_LABEL = i18n.translate(
  'xpack.nightshift.detectionOnboarding.addSourceLabel',
  { defaultMessage: 'Add a source' }
);
