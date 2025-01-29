/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

/* Preview Section */

export const PREVIEW_SECTION = getDataTestSubjectSelector('previewSection');

export const PREVIEW_BANNER = getDataTestSubjectSelector('previewSectionBannerText');

export const PREVIEW_BACK_BUTTON = getDataTestSubjectSelector('previewSectionBackButton');

export const PREVIEW_CLOSE_BUTTON = getDataTestSubjectSelector('previewSectionCloseButton');

/* Preview Footer */

export const DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER = getDataTestSubjectSelector(
  'securitySolutionFlyoutPreviewFooter'
);
export const DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutPreviewFooterLink'
);
