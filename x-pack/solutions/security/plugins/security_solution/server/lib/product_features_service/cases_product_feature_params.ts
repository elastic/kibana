/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import {
  CASES_CONNECTORS_CAPABILITY,
  GET_CONNECTORS_CONFIGURE_API_TAG,
} from '@kbn/cases-plugin/common/constants';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { CasesFeatureParams } from '@kbn/security-solution-features/src/cases/types';
import { APP_ID } from '../../../common/constants';

const originalCasesUiCapabilities = createCasesUICapabilities();
const originalCasesApiTags = getCasesApiTags(APP_ID);

const defaultUiCapabilities = {
  ...originalCasesUiCapabilities,
  all: originalCasesUiCapabilities.all.filter(
    (capability) => capability !== CASES_CONNECTORS_CAPABILITY
  ),
  read: originalCasesUiCapabilities.read.filter(
    (capability) => capability !== CASES_CONNECTORS_CAPABILITY
  ),
};

const defaultApiTags = {
  ...originalCasesApiTags,
  all: originalCasesApiTags.all.filter(
    (capability) => capability !== GET_CONNECTORS_CONFIGURE_API_TAG
  ),
  read: originalCasesApiTags.read.filter(
    (capability) => capability !== GET_CONNECTORS_CONFIGURE_API_TAG
  ),
};

const connectorsUiCapabilities = {
  all: [CASES_CONNECTORS_CAPABILITY],
  read: [CASES_CONNECTORS_CAPABILITY],
};
const connectorsApiTags = {
  all: [GET_CONNECTORS_CONFIGURE_API_TAG],
  read: [GET_CONNECTORS_CONFIGURE_API_TAG],
};

export const casesProductFeatureParams: CasesFeatureParams = {
  apiTags: {
    default: defaultApiTags,
    connectors: connectorsApiTags,
  },
  uiCapabilities: {
    default: defaultUiCapabilities,
    connectors: connectorsUiCapabilities,
  },
  savedObjects: { files: filesSavedObjectTypes },
};
