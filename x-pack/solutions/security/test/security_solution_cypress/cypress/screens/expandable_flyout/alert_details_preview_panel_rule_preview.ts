/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePanelTitle'
);
export const DOCUMENT_DETAILS_FLYOUT_CREATED_BY = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePanelCreatedByText'
);
export const DOCUMENT_DETAILS_FLYOUT_UPDATED_BY = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePanelUpdatedByText'
);
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_HEADER = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePanelAboutSectionHeader'
);
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePanelAboutSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePanelDefinitionSectionHeader');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePanelDefinitionSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_HEADER =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePanelScheduleSectionHeader');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_CONTENT =
  getDataTestSubjectSelector('securitySolutionFlyoutRulePanelScheduleSectionContent');
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_FOOTER = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePreviewPanelFooter'
);
export const DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_FOOTER_LINK = getDataTestSubjectSelector(
  'securitySolutionFlyoutRulePreviewPanelFooterOpenRuleFlyout'
);
