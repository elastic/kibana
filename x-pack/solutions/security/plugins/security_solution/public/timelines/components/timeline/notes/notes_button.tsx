/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { type TimelineType, TimelineTypeEnum } from '../../../../../common/api/timeline';

const NOTES = i18n.translate('xpack.securitySolution.timeline.notes.notesButtonLabel', {
  defaultMessage: 'Notes',
});

export const NOTES_BUTTON_CLASS_NAME = 'notes-button';

interface NotesButtonProps {
  ariaLabel?: string;
  isDisabled?: boolean;
  toggleShowNotes?: (eventId?: string, eventData?: DataTableRecord & TimelineItem) => void;
  toolTip: string;
  timelineType: TimelineType;
  eventData?: DataTableRecord & TimelineItem;
  eventId?: string;
  /**
   * Number of notes. If > 0, then a red dot is shown in the top right corner of the icon.
   */
  notesCount?: number;
}

export const NotesButton = React.memo<NotesButtonProps>(
  ({
    ariaLabel = NOTES,
    isDisabled,
    timelineType,
    toggleShowNotes,
    toolTip,
    eventData,
    eventId,
    notesCount = 0,
  }) => {
    const { euiTheme } = useEuiTheme();
    const isTemplate = timelineType === TimelineTypeEnum.template;
    const onClick = useCallback(() => {
      if (eventId != null) {
        toggleShowNotes?.(eventId, eventData);
      } else {
        toggleShowNotes?.();
      }
    }, [toggleShowNotes, eventId, eventData]);

    return (
      <EuiToolTip content={toolTip} data-test-subj="timeline-notes-tool-tip">
        <EuiFlexGroup
          css={css`
            position: relative;
          `}
        >
          <EuiFlexItem grow={false}>
            {notesCount > 0 ? (
              <span
                className="timeline-notes-notification-dot"
                data-test-subj="timeline-notes-notification-dot"
                css={css`
                  position: absolute;
                  display: block;
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background-color: ${euiTheme.colors.danger};
                  top: 17%;
                  left: 52%;
                `}
              />
            ) : null}
            <EuiButtonIcon
              aria-label={ariaLabel}
              className={NOTES_BUTTON_CLASS_NAME}
              data-test-subj="timeline-notes-button-small"
              disabled={isDisabled}
              iconType="editorComment"
              onClick={onClick}
              size="s"
              isDisabled={isTemplate}
              color="text"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    );
  }
);

NotesButton.displayName = 'NotesButton';
