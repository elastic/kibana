/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SAVED_OBJECTS_SETTINGS,
  SAVED_OBJECTS_TAGS_FILTER,
} from '../screens/common/stack_management';

export const goToSavedObjectSettings = () => {
  cy.get(SAVED_OBJECTS_SETTINGS).click();
};

export const clickSavedObjectTagsFilter = () => {
  cy.get(SAVED_OBJECTS_TAGS_FILTER).trigger('click');
};
