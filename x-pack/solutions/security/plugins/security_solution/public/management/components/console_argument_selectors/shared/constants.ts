/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { BaseSelectorConfig } from './types';

/**
 * Shared CSS style for text truncation with ellipsis
 */
export const SHARED_TRUNCATION_STYLE = css({
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 1,
  lineClamp: 1, // standardized fallback for modern Firefox
  textOverflow: 'ellipsis',
  whiteSpace: 'normal',
});

/**
 * Configuration for CustomScriptSelector
 */
export const CUSTOM_SCRIPTS_CONFIG: BaseSelectorConfig = {
  initialLabel: i18n.translate(
    'xpack.securitySolution.consoleArgumentSelectors.customScriptSelector.initialDisplayLabel',
    { defaultMessage: 'Click to select script' }
  ),
  tooltipText: i18n.translate(
    'xpack.securitySolution.consoleArgumentSelectors.customScriptSelector.tooltipText',
    { defaultMessage: 'Click to choose script' }
  ),
  minWidth: 400,
  rowHeight: 60,
  selectableId: 'options-combobox',
};

/**
 * Configuration for PendingActionsSelector
 */
export const PENDING_ACTIONS_CONFIG: BaseSelectorConfig = {
  initialLabel: i18n.translate(
    'xpack.securitySolution.consoleArgumentSelectors.pendingActionsSelector.initialDisplayLabel',
    { defaultMessage: 'Click to select action' }
  ),
  tooltipText: i18n.translate(
    'xpack.securitySolution.consoleArgumentSelectors.pendingActionsSelector.tooltipText',
    { defaultMessage: 'Click to choose pending action to cancel' }
  ),
  minWidth: 500,
  rowHeight: 70,
  selectableId: 'pending-actions-combobox',
};
