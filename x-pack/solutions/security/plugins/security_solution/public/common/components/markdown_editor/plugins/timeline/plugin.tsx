/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { EuiCodeBlock, EuiModalBody, EuiModalHeader } from '@elastic/eui';

import { SelectTimelineModalBody } from '../../../../../cases/attachments/timeline/select_timeline_modal_body';
import { getTimelineUrl, useFormatUrl } from '../../../link_to';

import { ID } from './constants';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';

interface TimelineEditorProps {
  onClosePopover: () => void;
  onInsert: (markdown: string, config: { block: boolean }) => void;
}

const TimelineEditorComponent: React.FC<TimelineEditorProps> = ({ onClosePopover, onInsert }) => {
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);

  const handleTimelineChange = useCallback(
    (timelineTitle: string, timelineId: string | null) => {
      const url = formatUrl(getTimelineUrl(timelineId ?? ''), {
        absolute: true,
        skipSearch: true,
      });
      onInsert(`[${timelineTitle}](${url})`, {
        block: false,
      });
    },
    [formatUrl, onInsert]
  );

  return (
    <>
      <EuiModalHeader />
      <EuiModalBody>
        <SelectTimelineModalBody onTimelineChange={handleTimelineChange} onClose={onClosePopover} />
      </EuiModalBody>
    </>
  );
};

const TimelineEditor = memo(TimelineEditorComponent);

export const plugin = ({
  interactionsUpsellingMessage,
  canSeeTimeline,
}: {
  interactionsUpsellingMessage?: string;
  canSeeTimeline: boolean;
}): EuiMarkdownEditorUiPlugin => {
  return {
    name: ID,
    button: {
      label: interactionsUpsellingMessage ?? i18n.INSERT_TIMELINE,
      iconType: 'timeline',
      isDisabled: !canSeeTimeline || !!interactionsUpsellingMessage,
    },
    helpText: (
      <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
        {'[title](url)'}
      </EuiCodeBlock>
    ),
    editor: function editor({ node, onSave, onCancel }) {
      return <TimelineEditor onClosePopover={onCancel} onInsert={onSave} />;
    },
  };
};
