/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

// Legacy pages render `header-page-title`; pages migrated to AppHeader render `appHeaderTitle`.
export const PAGE_TITLE = '[data-test-subj="header-page-title"],[data-test-subj="appHeaderTitle"]';

export const NOT_FOUND = '[data-test-subj="notFoundPage"]';

export const LOADING_SPINNER = '.euiLoadingSpinner';

export const PAGE_CONTENT = '[data-test-subj="pageContainer"]';

export const PAGE_CONTENT_SPINNER = `${PAGE_CONTENT} ${LOADING_SPINNER}`;

export const NO_PRIVILEGES_BOX = getDataTestSubjectSelector('noPrivilegesPage');
