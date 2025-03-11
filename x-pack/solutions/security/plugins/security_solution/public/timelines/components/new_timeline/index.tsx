/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { TimelineId } from '../../../../common/types';
import { useCreateTimeline } from '../../hooks/use_create_timeline';
import { type TimelineType, TimelineTypeEnum } from '../../../../common/api/timeline';

const NEW_TIMELINE = i18n.translate('xpack.securitySolution.timelines.newTimelineButtonLabel', {
  defaultMessage: 'Create new Timeline',
});

const NEW_TEMPLATE_TIMELINE = i18n.translate(
  'xpack.securitySolution.timelines.newTemplateTimelineButtonLabel',
  {
    defaultMessage: 'Create new Timeline template',
  }
);

interface NewTimelineButtonProps {
  /**
   * Type of timeline to create (default or template)
   */
  type: TimelineType;
}

/**
 * This component renders the "Create new Timeline" or "Create new Timeline template" button depending on the timeline type passed in.
 * It is used in the Timelines page.
 */
export const NewTimelineButton = React.memo<NewTimelineButtonProps>(({ type }) => {
  const createNewTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: type,
  });

  const dataTestSubj = `timelines-page-create-new-${
    type === TimelineTypeEnum.default ? 'timeline' : 'timeline-template'
  }`;

  const handleCreateNewTimeline = useCallback(async () => {
    await createNewTimeline();
  }, [createNewTimeline]);

  return (
    <EuiButton
      iconType="plusInCircle"
      data-test-subj={dataTestSubj}
      onClick={handleCreateNewTimeline}
      fill
    >
      {type === TimelineTypeEnum.default ? NEW_TIMELINE : NEW_TEMPLATE_TIMELINE}
    </EuiButton>
  );
});

NewTimelineButton.displayName = 'NewTimelineButton';
