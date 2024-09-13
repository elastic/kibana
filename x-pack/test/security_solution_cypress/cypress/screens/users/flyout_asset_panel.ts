/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const ASSET_TYPE_FIELD = getDataTestSubjectSelector('event-field-asset.type');

export const OKTA_DOCUMENT_TAB = getDataTestSubjectSelector('securitySolutionFlyoutOktaTab');

export const ENTRA_DOCUMENT_TAB = getDataTestSubjectSelector('securitySolutionFlyoutEntraTab');
