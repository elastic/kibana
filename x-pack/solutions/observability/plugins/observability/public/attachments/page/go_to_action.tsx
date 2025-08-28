/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, type IconType } from '@elastic/eui';
import type { PageAttachmentPersistedState } from '@kbn/page-attachment-schema';

export interface GoToActionProps {
  state: PageAttachmentPersistedState;
}

function GoToAction({ state }: GoToActionProps) {
  const url = state?.url;
  const href = url?.pathAndQuery;

  const actionLabel = url?.actionLabel;
  const iconType = url?.iconType as IconType;
  if (!href || !actionLabel) {
    return null;
  }
  const buttonProps = {
    iconType,
    'aria-label': actionLabel,
    href,
    'data-test-subj': 'cases-go-to-action',
  };

  return <EuiButtonEmpty {...buttonProps}>{actionLabel}</EuiButtonEmpty>;
}

GoToAction.displayName = 'PageAttachmentGoToAction';

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default GoToAction;
