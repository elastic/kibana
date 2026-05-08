/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { SECURITY_EVENT_ATTACHMENT_TYPE, toStringOrStringArray } from '@kbn/cases-plugin/common';
import type { CaseAttachmentWithoutOwner } from '@kbn/cases-plugin/public/types';

export function getNonEmptyField(field: unknown): string | null {
  const normalizedField = toStringOrStringArray(field);
  const firstItem = Array.isArray(normalizedField) ? normalizedField[0] : normalizedField;
  if (firstItem == null || isEmpty(firstItem)) {
    return null;
  }

  return firstItem;
}

export const generateEventAttachmentWithoutOwner = ({
  attachmentId,
  index,
}: {
  attachmentId: unknown;
  index: unknown;
}): CaseAttachmentWithoutOwner | undefined => {
  const normalizedAttachmentId = toStringOrStringArray(attachmentId);
  if (normalizedAttachmentId == null) {
    return undefined;
  }

  const normalizedIndex = toStringOrStringArray(index);
  return {
    type: SECURITY_EVENT_ATTACHMENT_TYPE,
    attachmentId: normalizedAttachmentId,
    ...(!normalizedIndex ? {} : { metadata: { index: normalizedIndex } }),
  } as CaseAttachmentWithoutOwner;
};
