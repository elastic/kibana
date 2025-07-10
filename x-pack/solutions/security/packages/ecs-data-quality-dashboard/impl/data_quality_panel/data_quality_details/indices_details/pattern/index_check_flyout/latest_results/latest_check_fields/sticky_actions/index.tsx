/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { Actions } from '../../../../../../../actions';

interface Props {
  markdownComment: string;
  showAddToNewCaseAction?: boolean;
  showCopyToClipboardAction?: boolean;
  showChatAction?: boolean;
  indexName?: string;
  checkedAt?: number;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    stickyContainer: css({
      padding: `${euiTheme.size.l} 0`,
      background: euiTheme.colors.emptyShade,
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      borderTop: `1px solid ${euiTheme.border.color}`,
    }),
  };
};

const StickyActionsComponent: FC<Props> = ({
  indexName,
  markdownComment,
  showCopyToClipboardAction,
  showAddToNewCaseAction,
  showChatAction,
  checkedAt,
}) => {
  const styles = useStyles();

  return (
    <div css={styles.stickyContainer}>
      <Actions
        checkedAt={checkedAt}
        indexName={indexName}
        markdownComment={markdownComment}
        showChatAction={showChatAction}
        showCopyToClipboardAction={showCopyToClipboardAction}
        showAddToNewCaseAction={showAddToNewCaseAction}
      />
    </div>
  );
};

StickyActionsComponent.displayName = 'StickyActionsComponent';

export const StickyActions = React.memo(StickyActionsComponent);
