/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { ChatAction } from './chat';
import { CopyToClipboardAction } from './copy_to_clipboard';
import { AddToNewCaseAction } from './add_to_new_case';

export interface Props {
  markdownComment: string;
  indexName?: string;
  showAddToNewCaseAction?: boolean;
  showCopyToClipboardAction?: boolean;
  showChatAction?: boolean;
}

const ActionsComponent: React.FC<Props> = ({
  showAddToNewCaseAction,
  showCopyToClipboardAction,
  showChatAction,
  markdownComment,
  indexName,
}) => {
  if (!showAddToNewCaseAction && !showCopyToClipboardAction && !showChatAction) {
    return null;
  }

  return (
    <EuiFlexGroup data-test-subj="actions">
      {showAddToNewCaseAction && (
        <EuiFlexItem grow={false}>
          <AddToNewCaseAction markdownComment={markdownComment} />
        </EuiFlexItem>
      )}

      {showCopyToClipboardAction && (
        <EuiFlexItem grow={false}>
          {' '}
          <CopyToClipboardAction markdownComment={markdownComment} />{' '}
        </EuiFlexItem>
      )}

      {showChatAction && indexName && (
        <EuiFlexItem grow={false}>
          <ChatAction indexName={indexName} markdownComment={markdownComment} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

ActionsComponent.displayName = 'ActionsComponent';

export const Actions = React.memo(ActionsComponent);
