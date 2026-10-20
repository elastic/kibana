/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import type { EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import {
  EuiCodeBlock,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import {
  CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common';

import { SelectTimelineModalBody } from '../../../../../cases/attachments/timeline/select_timeline_modal_body';
import { getTimelineUrl, useFormatUrl } from '../../../link_to';
import { useKibana } from '../../../../lib/kibana';

import { ID } from './constants';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';

interface TimelineEditorProps {
  onClosePopover: () => void;
  onInsert: (markdown: string, config: { block: boolean }) => void;
}

const TimelineEditorComponent: React.FC<TimelineEditorProps> = ({ onClosePopover, onInsert }) => {
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);
  const { analytics, cases } = useKibana().services;
  const attachmentsEnabled = cases?.config?.attachmentsEnabled ?? false;

  // Reports when the Timeline plugin is opened via the markdown toolbar. The timeline markdown
  // plugin is injected exclusively by Security Solution, so the owner is always securitySolution.
  useEffect(() => {
    analytics.reportEvent(CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      plugin_type: 'timeline',
    });
  }, [analytics]);

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
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.SELECT_TIMELINE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {attachmentsEnabled && (
          <>
            <EuiText size="s" color="subdued">
              {i18n.INSERT_TIMELINE_ATTACH_HINT}
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}
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
