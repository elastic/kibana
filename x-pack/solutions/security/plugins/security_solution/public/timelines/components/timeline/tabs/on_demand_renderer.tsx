/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic } from '@elastic/eui';
import type { TimelineId } from '../../../../../common/types';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { getTimelineShowStatusByIdSelector } from '../../../store/selectors';

/**
 * We check for the timeline open status to request the fields for the fields browser as the fields request
 * is often a much longer running request for customers with a significant number of indices and fields in those indices.
 * This request should only be made after the user has decided to interact with a specific tab in the timeline to prevent any performance impacts
 * to the underlying security solution views, as this query will always run when the timeline exists on the page.
 *
 * `hasTimelineTabBeenOpenedOnce` - We want to keep timeline loading times as fast as possible after the user
 * has chosen to interact with timeline at least once, so we use this flag to prevent re-requesting of this fields data
 * every time timeline is closed and re-opened after the first interaction.
 */

export interface OnDemandRendererProps {
  children: React.ReactElement | null;
  dataTestSubj: string;
  isOverflowYScroll?: boolean;
  shouldShowTab: boolean;
  timelineId: TimelineId;
}

export const OnDemandRenderer = React.memo(
  ({
    children,
    dataTestSubj,
    shouldShowTab,
    isOverflowYScroll,
    timelineId,
  }: OnDemandRendererProps) => {
    const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
    const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, timelineId));

    const [hasTimelineTabBeenOpenedOnce, setHasTimelineTabBeenOpenedOnce] = useState(false);

    useEffect(() => {
      if (!hasTimelineTabBeenOpenedOnce && show && shouldShowTab) {
        setHasTimelineTabBeenOpenedOnce(true);
      }
    }, [hasTimelineTabBeenOpenedOnce, shouldShowTab, show]);

    return (
      <div
        // The shouldShowTab check here is necessary for the flex container to accurately size to the modal window when it's opened
        css={css`
          display: ${shouldShowTab ? 'flex' : 'none'};
          overflow: ${isOverflowYScroll ? 'hidden scroll' : 'hidden'};
          flex: 1;
        `}
        data-test-subj={dataTestSubj}
      >
        {hasTimelineTabBeenOpenedOnce ? children : <EuiLoadingElastic size="xl" />}
      </div>
    );
  }
);

OnDemandRenderer.displayName = 'OnDemandRenderer';

export const OnDemandSuspenseFallback = () => (
  <EuiFlexGroup direction="row" justifyContent="spaceAround">
    <EuiFlexItem
      grow={false}
      css={css`
        justify-content: center;
      `}
    >
      <EuiLoadingElastic size="xxl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
