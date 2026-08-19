/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export enum InputValueCharacterIssue {
  CONTROL_CHARACTER = 'control_character',
  EDGE_WHITESPACE = 'edge_whitespace',
}

export const EDGE_WHITESPACE_WARNING = i18n.translate(
  'utils.inputValueValidation.edgeWhitespaceWarningMessage',
  {
    defaultMessage:
      'Leading or trailing whitespace prevents matching and will be removed automatically.',
  }
);

export const CONTROL_CHARACTER_ERROR = i18n.translate(
  'utils.inputValueValidation.controlCharacterErrorMessage',
  {
    defaultMessage: 'Control characters prevent matching. Remove them and re-enter the value.',
  }
);

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F-\u009F]/;

const getStringCharacterIssue = (value: string): InputValueCharacterIssue | undefined => {
  if (!value.length) {
    return;
  }

  const trimmedValue = value.trim();

  if (CONTROL_CHARACTER_PATTERN.test(trimmedValue)) {
    return InputValueCharacterIssue.CONTROL_CHARACTER;
  }

  if (value !== trimmedValue) {
    return InputValueCharacterIssue.EDGE_WHITESPACE;
  }
};

export const getInputValueCharacterIssue = (
  value?: string | string[]
): InputValueCharacterIssue | undefined => {
  if (Array.isArray(value)) {
    for (const arrayValue of value) {
      const issue = getStringCharacterIssue(arrayValue);

      if (issue) {
        return issue;
      }
    }

    return;
  }

  return value === undefined ? undefined : getStringCharacterIssue(value);
};

export const getInputValueCharacterIssueMessage = (
  issue?: InputValueCharacterIssue
): string | undefined => {
  if (issue === InputValueCharacterIssue.CONTROL_CHARACTER) {
    return CONTROL_CHARACTER_ERROR;
  }

  if (issue === InputValueCharacterIssue.EDGE_WHITESPACE) {
    return EDGE_WHITESPACE_WARNING;
  }
};
