/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { EuiButtonEmpty, EuiIconTip } from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';

import { UPDATE_FIELD_IN_FORM_TOOLTIP } from './translations';

// current implementation of edit form allows only limited set of fields to be updated via AI assistant
export const ALLOWED_FIELDS = new Set(['name', 'description', 'queryBar']);
const allowedFieldMap = {
  name: ['name', 'description'],
  description: ['description', 'name'],
  queryBar: ['queryBar'],
};

const extractFieldNameFromTitle = (title: string): string | null => {
  const match = title.match(/\[([^\]]+)\]/);
  return match ? match[1] : null;
};

export const hasSuggestedAllowedField = (messageContent: string, title: string): boolean => {
  const lowerCasedContent = messageContent.toLowerCase();
  const fieldName = extractFieldNameFromTitle(title);
  if (!fieldName) {
    return false;
  }

  for (const field of allowedFieldMap[fieldName as keyof typeof allowedFieldMap] || []) {
    if (lowerCasedContent.includes(`a new suggested rule field [${field.toLowerCase()}]`)) {
      return true;
    }
  }
  return false;
};

/**
 * Extracts field name from a message that follows the pattern "a new suggested rule field [fieldName] value:"
 * Only extracts if the message contains the exact prefix pattern.
 *
 * @param messageContent - The message content to parse
 * @returns The field name if pattern matches, null otherwise
 */
const extractSuggestedRuleFieldName = (messageContent: string): string | null => {
  const hasValidPrefix = messageContent
    .trim()
    .toLowerCase()
    .includes('a new suggested rule field [');

  if (!hasValidPrefix) {
    return null;
  }

  // Extract field name from square brackets after the valid prefix
  const match = messageContent.match(/a new suggested rule field\s*\[([^\]]+)\]/i);
  return match ? match[1].trim() : null;
};

export interface UpdateFieldInFormButtonProps {
  query: string;
  title: string;
  messageContent: string;
}

export const UpdateFieldInFormButton: FC<PropsWithChildren<UpdateFieldInFormButtonProps>> = ({
  query,
  title,
  messageContent,
}) => {
  const { codeBlockRef } = useAssistantContext();

  const handleClick = () => {
    codeBlockRef?.current?.[title]?.(query, extractSuggestedRuleFieldName(messageContent));
  };

  return (
    <EuiButtonEmpty
      data-test-subj="update-field-in-form-button"
      aria-label={UPDATE_FIELD_IN_FORM_TOOLTIP}
      onClick={handleClick}
      color="text"
      flush="both"
      size="xs"
      css={css`
        width: 100%;
      `}
    >
      <EuiIconTip content={UPDATE_FIELD_IN_FORM_TOOLTIP} position="right" type="documentEdit" />
    </EuiButtonEmpty>
  );
};

UpdateFieldInFormButton.displayName = 'UpdateFieldInFormButton';
