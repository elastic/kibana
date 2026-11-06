/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexItem, EuiSkeletonText, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getRowRenderer } from '../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { useEventDetails } from '../../../../flyout/document_details/shared/hooks/use_event_details';
import { EVENT_RENDERER_TEST_ID } from './test_ids';

const SCOPE_ID = 'document-details-flyout';

export interface EventRendererProps {
  /**
   * Document record to render the event renderer for
   */
  hit: DataTableRecord;
  /**
   * Pre-fetched ECS-nested object. When provided the internal fetch is skipped.
   * The old flyout passes this from its context to avoid a duplicate network request.
   * When omitted (new flyout) the data is fetched internally via useEventDetails.
   */
  dataAsNestedObject?: Ecs | null;
}

/**
 * Event renderer of an event document.
 * Fetches the full ECS-nested document via useEventDetails and renders it using the appropriate row renderer.
 */
export const EventRenderer: FC<EventRendererProps> = ({
  hit,
  dataAsNestedObject: dataAsNestedObjectProp,
}) => {
  const { euiTheme } = useEuiTheme();

  // This fetches the document for the Discover flyout that does not provide `dataAsNestedObject`.
  // Eventually we should update all the row renderers to use a `hit` instead.
  // Also this is skipped for the old flyout, as we have `dataAsNestedObject` available.
  const { dataAsNestedObject: fetchedData, loading } = useEventDetails({
    eventId: hit.raw._id,
    indexName: hit.raw._index,
    skip: dataAsNestedObjectProp !== undefined,
  });

  const dataAsNestedObject =
    dataAsNestedObjectProp !== undefined ? dataAsNestedObjectProp : fetchedData;

  const renderer = useMemo(
    () =>
      dataAsNestedObject
        ? getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers })
        : null,
    [dataAsNestedObject]
  );

  const rowRenderer = useMemo(
    () =>
      renderer && dataAsNestedObject
        ? renderer.renderRow({
            contextId: 'event-details',
            data: dataAsNestedObject,
            scopeId: SCOPE_ID,
          })
        : null,
    [renderer, dataAsNestedObject]
  );

  if (loading && dataAsNestedObjectProp === undefined) {
    return <EuiSkeletonText lines={3} />;
  }

  if (!renderer) {
    return null;
  }

  return (
    <EuiFlexItem data-test-subj={EVENT_RENDERER_TEST_ID}>
      <EuiSpacer size="s" />
      <EuiTitle size="xxs">
        <h5>{'Event renderer'}</h5>
      </EuiTitle>
      <div
        css={css`
          overflow-x: auto;
          padding-block: ${euiTheme.size.s};
        `}
      >
        <div className={'eui-displayInlineBlock'}>{rowRenderer}</div>
      </div>
    </EuiFlexItem>
  );
};

EventRenderer.displayName = 'EventRenderer';
