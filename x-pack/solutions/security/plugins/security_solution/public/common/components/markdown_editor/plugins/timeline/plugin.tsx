/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import type { EuiSelectableOption, EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { EuiModalBody, EuiModalHeader, EuiCodeBlock } from '@elastic/eui';

import { TimelineTypeEnum } from '../../../../../../common/api/timeline';
import { SelectableTimeline } from '../../../../../timelines/components/timeline/selectable_timeline';
import type { OpenTimelineResult } from '../../../../../timelines/components/open_timeline/types';
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

  const handleGetSelectableOptions = useCallback(
    ({ timelines }: { timelines: OpenTimelineResult[] }) => [
      ...timelines.map(
        (t: OpenTimelineResult, index: number) =>
          ({
            description: t.description,
            favorite: t.favorite,
            label: t.title,
            id: t.savedObjectId,
            key: `${t.title}-${index}`,
            title: t.title,
            checked: undefined,
          } as EuiSelectableOption)
      ),
    ],
    []
  );

  const handleTimelineChange = useCallback(
    (timelineTitle: string, timelineId: string | null, graphEventId?: string) => {
      const url = formatUrl(getTimelineUrl(timelineId ?? '', graphEventId), {
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
        <SelectableTimeline
          hideUntitled={true}
          getSelectableOptions={handleGetSelectableOptions}
          onTimelineChange={handleTimelineChange}
          onClosePopover={onClosePopover}
          timelineType={TimelineTypeEnum.default}
        />
      </EuiModalBody>
    </>
  );
};

const TimelineEditor = memo(TimelineEditorComponent);

export const plugin = ({
  interactionsUpsellingMessage,
}: {
  interactionsUpsellingMessage?: string;
}): EuiMarkdownEditorUiPlugin => {
  return {
    name: ID,
    button: {
      label: interactionsUpsellingMessage ?? i18n.INSERT_TIMELINE,
      iconType: 'timeline',
      isDisabled: !!interactionsUpsellingMessage,
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
