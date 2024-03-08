/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const USER_PANEL_HEADER = getDataTestSubjectSelector('user-panel-header');

const MANAGED_DATA_SECTION = getDataTestSubjectSelector('managedUser-data');

export const OKTA_MANAGED_DATA_TITLE = `${MANAGED_DATA_SECTION} ${getDataTestSubjectSelector(
  'managed-user-accordion-userAssetOktaLeftSection'
)}`;

export const ENTRA_MANAGED_DATA_TITLE = `${MANAGED_DATA_SECTION} ${getDataTestSubjectSelector(
  'managed-user-accordion-userAssetEntraLeftSection'
)}`;
