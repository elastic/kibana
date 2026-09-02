/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredConnector } from '../../../../common/siem_migrations/parsers/tines';
import {
  EMAIL_CONNECTOR_PLACEHOLDER,
  SLACK_CONNECTOR_PLACEHOLDER,
} from '../../../../common/siem_migrations/parsers/tines';

export type ConnectorSelections = Partial<Record<RequiredConnector['actionTypeId'], string>>;

/**
 * Replaces known connector placeholders in workflow YAML with selected connector IDs.
 * Unselected placeholders are left unchanged.
 */
export const resolveConnectorPlaceholders = (
  yaml: string,
  selections: ConnectorSelections
): string => {
  let resolved = yaml;
  const emailId = selections['.email'];
  if (emailId != null && emailId.length > 0) {
    resolved = resolved.split(EMAIL_CONNECTOR_PLACEHOLDER).join(emailId);
  }
  const slackId = selections['.slack'];
  if (slackId != null && slackId.length > 0) {
    resolved = resolved.split(SLACK_CONNECTOR_PLACEHOLDER).join(slackId);
  }
  return resolved;
};

export const hasUnresolvedConnectorPlaceholders = (yaml: string): boolean =>
  yaml.includes(EMAIL_CONNECTOR_PLACEHOLDER) || yaml.includes(SLACK_CONNECTOR_PLACEHOLDER);
