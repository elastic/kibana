/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiMarkdownFormat, EuiPopover, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { NOTE_CONTENT_BUTTON_TEST_ID, NOTE_CONTENT_POPOVER_TEST_ID } from './test_ids';

const OPEN_POPOVER = i18n.translate('xpack.securitySolution.notes.expandRow.buttonLabel', {
  defaultMessage: 'Expand',
});

export interface NoteContentProps {
  /**
   * The note content to display
   */
  note: string;
}

/**
 * Renders the note content to be displayed in the notes management table.
 * The content is truncated with an expand button to show the full content within the row.
 */
export const NoteContent = memo(({ note }: NoteContentProps) => {
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        title={OPEN_POPOVER}
        aria-label={OPEN_POPOVER}
        color="text"
        flush="left"
        onClick={togglePopover}
        data-test-subj={NOTE_CONTENT_BUTTON_TEST_ID}
        css={css`
          height: ${euiTheme.size.l};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {note}
      </EuiButtonEmpty>
    ),
    [euiTheme.size.l, note, togglePopover]
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelStyle={{ maxWidth: '50%', maxHeight: '50%', overflow: 'auto' }}
    >
      <EuiMarkdownFormat textSize="s" data-test-subj={NOTE_CONTENT_POPOVER_TEST_ID}>
        {note}
      </EuiMarkdownFormat>
    </EuiPopover>
  );
});

NoteContent.displayName = 'NoteContent';
