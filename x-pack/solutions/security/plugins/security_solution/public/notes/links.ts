/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { NOTES_PATH, SecurityPageName, NOTES_FEATURE_ID } from '../../common/constants';
import { NOTES } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.notes,
  path: NOTES_PATH,
  title: NOTES,
  description: i18n.translate('xpack.securitySolution.appLinks.notesDescription', {
    defaultMessage:
      'Oversee, revise, and revisit the notes attached to alerts, events and Timelines.',
  }),
  // It only makes sense to show this link when the user is also granted access to security solution
  capabilities: [[SECURITY_UI_SHOW_PRIVILEGE, `${NOTES_FEATURE_ID}.read`]],
  landingIcon: 'filebeatApp',
  skipUrlState: true,
  hideTimeline: false,
};
