/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ReactNode } from 'react';

export const BASE_VERSION_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.header.title',
  {
    defaultMessage: 'Rule modifications',
  }
);

export const LAST_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.header.lastUpdate',
  {
    defaultMessage: 'Last updated',
  }
);

export const UPDATED_BY_AND_WHEN = (updatedBy: ReactNode, updatedAt: ReactNode) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.baseVersionFlyout.header.updated"
    defaultMessage="{updatedBy} on {updatedAt}"
    values={{ updatedBy, updatedAt }}
  />
);

export const FIELD_UPDATES = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.header.fieldUpdates',
  {
    defaultMessage: 'Field updates',
  }
);

export const REVERT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.revertButtonLabel',
  {
    defaultMessage: 'Revert',
  }
);

export const REVERTING_RULE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.revertCalloutTitle',
  {
    defaultMessage: 'Are you sure you want to revert these changes?',
  }
);

export const REVERTING_RULE_CALLOUT_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.revertCalloutMessage',
  {
    defaultMessage: "Reverted changes can't be recovered.",
  }
);

export const BASE_VERSION_FLYOUT_UPDATES_TAB_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.updatesTabTitle',
  {
    defaultMessage: 'Elastic rule diff overview',
  }
);

export const BASE_VERSION_FLYOUT_UPDATES_TAB_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.updatesTabTooltip',
  {
    defaultMessage: 'See all changes made to the rule',
  }
);

export const BASE_VERSION_FLYOUT_JSON_TAB_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.jsonTabTooltip',
  {
    defaultMessage: 'See all changes made to the rule in JSON format',
  }
);

export const BASE_VERSION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.baseVersionLabel',
  {
    defaultMessage: 'Original Elastic rule',
  }
);

export const NEW_REVISION_DETECTED_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.ruleNewRevisionDetectedWarning',
  {
    defaultMessage: 'Installed rule changed',
  }
);

export const NEW_REVISION_DETECTED_WARNING_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.baseVersionFlyout.ruleNewRevisionDetectedWarningMessage',
  {
    defaultMessage:
      'The installed rule was changed, the rule modifications diff flyout has been updated.',
  }
);
