/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM } from '@kbn/security-solution-plugin/common/constants';
import {
  GET_SAVED_OBJECTS_TAGS_OPTION,
  SAVED_OBJECTS_SETTINGS,
  SAVED_OBJECTS_TAGS_FILTER,
} from '../screens/common/stack_management';
import { ADVANCED_SETTINGS_URL } from '../urls/navigation';
import { visit } from './navigation';

export const selectAdvancedSetting = (settingDataTestId: string, setting: string) => {
  visit(`${ADVANCED_SETTINGS_URL}`);

  cy.get(`[data-test-subj="${settingDataTestId}"]`).then(($select) => {
    const currentValue = $select.val();

    if (currentValue !== setting) {
      cy.wrap($select).select(setting);
      cy.get('[data-test-subj="settings-save-button"]').click();
      cy.waitUntil(() => {
        cy.get('[data-test-subj="settings-save-button"]').should('not.exist');
        return true;
      });
    } else {
      cy.log(`Setting "${setting}" is already selected. Skipping save.`);
    }
  });
};

export const selectSuppressionBehaviorOnAlertClosure = (
  setting: SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM
) => {
  selectAdvancedSetting(
    'management-settings-editField-securitySolution:suppressionBehaviorOnAlertClosure',
    setting
  );
};

export const goToSavedObjectSettings = () => {
  cy.get(SAVED_OBJECTS_SETTINGS).click();
};

export const clickSavedObjectTagsFilter = () => {
  cy.get(SAVED_OBJECTS_TAGS_FILTER).trigger('click');
};

export const clickSavedObjectTagOption = (optionId: string) => {
  // EUI field_value_selection renders option elements in both the pre-mounted (hidden) popover
  // panel and the open popover panel — both may pass :visible during the animation. The open
  // panel's elements appear later in DOM order (EUI portals to document.body), so .last()
  // reliably targets the active popover option.
  cy.get(GET_SAVED_OBJECTS_TAGS_OPTION(optionId)).filter(':visible').last().click();
};
