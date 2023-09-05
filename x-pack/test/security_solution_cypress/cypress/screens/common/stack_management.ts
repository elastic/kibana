/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const STACK_MANAGEMENT_HOME = getDataTestSubjectSelector('managementHome');

export const SAVED_OBJECTS_SETTINGS = `${getDataTestSubjectSelector('objects')}`;

export const SAVED_OBJECTS_TAGS_FILTER = '[data-text="Tags"][title="Tags"]';

export const GET_SAVED_OBJECTS_TAGS_OPTION = (optionId: string) =>
  getDataTestSubjectSelector(`tag-searchbar-option-${optionId}`);

export const SAVED_OBJECTS_SEARCH_BAR = getDataTestSubjectSelector('savedObjectSearchBar');

export const SAVED_OBJECTS_ROW_TITLES = getDataTestSubjectSelector('savedObjectsTableRowTitle');
