/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const QUERY_BAR = getDataTestSubjectSelector('globalDatePicker');
export const QUERY_BAR_MENU = getDataTestSubjectSelector('showQueryBarMenu');
export const QUERY_BAR_MENU_REMOVE_ALL_FILTERS_BUTTON = getDataTestSubjectSelector(
  'filter-sets-removeAllFilters'
);
export const KQL_FILTER = `[id="popoverFor_filter0"]`;
