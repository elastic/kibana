/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_COMMENT_INPUT = '[data-test-subj="add-comment"] textarea';

// Legacy renders a titled "Cases" back link; the redesign renders the app header back button.
export const BACK_TO_CASES_BTN = 'a[title="Cases"],[data-test-subj="appHeaderBack"]';

// Rendered by the unified attachments flow (feature flag on) when attaching a timeline.
export const CREATE_CASE_FLYOUT = '[data-test-subj="create-case-flyout"]';

export const VIEW_CASE_TOASTER_LINK = '[data-test-subj="toaster-content-case-view-link"]';

export const DESCRIPTION_INPUT = '[data-test-subj="caseDescription"] textarea';

export const EMPTY_TIMELINE = '[data-test-subj="euiSelectableMessage"]';

export const INSERT_TIMELINE_BTN = '.euiMarkdownEditorToolbar [aria-label="Insert Timeline link"]';

export const LOADING_SPINNER = '[data-test-subj="create-case-loading-spinner"]';

export const SUBMIT_BTN = '[data-test-subj="create-case-submit"]';

export const TAGS_INPUT = '[data-test-subj="caseTags"] [data-test-subj="comboBoxSearchInput"]';

export const TIMELINE = '[data-test-subj="selectable-input"] [data-test-subj="timeline"]';

export const TITLE_INPUT = '[data-test-subj="caseTitle"] [data-test-subj="input"]';
