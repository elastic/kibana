/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getRowRenderer } from '../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { useDocumentDetailsContext } from '../../shared/context';
import { EVENT_RENDERER_TEST_ID } from './test_ids';

/**
 * Event renderer of an event document
 */
export const EventRenderer: FC = () => {
  const { euiTheme } = useEuiTheme();
  const { dataAsNestedObject, scopeId } = useDocumentDetailsContext();

  const renderer = useMemo(
    () => getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers }),
    [dataAsNestedObject]
  );
  const rowRenderer = useMemo(
    () =>
      renderer
        ? renderer.renderRow({
            contextId: 'event-details',
            data: dataAsNestedObject,
            scopeId,
          })
        : null,
    [renderer, dataAsNestedObject, scopeId]
  );

  if (!renderer) {
    return null;
  }
  return (
    <EuiFlexItem data-test-subj={EVENT_RENDERER_TEST_ID}>
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
