/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULES_UI_EDIT_PRIVILEGE,
  RULES_UI_READ_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { SecurityPageName } from '../app/types';
import { links } from './links';

describe('rules links', () => {
  it('requires every Alert Analysis workflow settings capability', () => {
    const alertAnalysisWorkflowLink = links.links?.find(
      ({ id }) => id === SecurityPageName.alertAnalysisWorkflow
    );

    expect(alertAnalysisWorkflowLink?.capabilities).toEqual([
      [RULES_UI_READ_PRIVILEGE, RULES_UI_EDIT_PRIVILEGE, 'advancedSettings.save'],
    ]);
  });
});
