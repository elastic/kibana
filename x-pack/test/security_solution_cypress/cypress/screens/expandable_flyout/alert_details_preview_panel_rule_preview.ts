/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePreviewRulePreviewTitle'
);
export const DOCUMENT_DETAILS_FLYOUT_CREATED_BY = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePreviewCreatedByText'
);
export const DOCUMENT_DETAILS_FLYOUT_UPDATED_BY = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePreviewUpdatedByText'
);
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_HEADER = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePreviewAboutSectionHeader'
);
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePreviewAboutSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePreviewDefinitionSectionHeader');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePreviewDefinitionSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePreviewScheduleSectionHeader');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePreviewScheduleSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_FOOTER = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePreviewFooter'
);
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_FOOTER_LINK =
  getDataTestSubjectSelector('goToRuleDetails');
