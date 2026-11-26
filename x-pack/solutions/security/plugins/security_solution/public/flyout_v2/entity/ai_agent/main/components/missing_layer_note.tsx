/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiDescriptionList,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import {
  COLLECTION_GAPS,
  GAPS_REGISTER_NAME,
  type GapId,
} from '../../../../../entity_analytics/components/ai_agents/gaps';
import { GAP_BLOCKS, GAP_LINK, GAP_REGISTER, GAP_STATUS, GAP_WORKAROUND } from '../translations';
import { AI_AGENT_TEST_IDS } from '../test_ids';

/** Opens the gaps register row behind a missing layer. */
export const GapLink = memo(({ gapId }: { gapId: GapId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useGeneratedHtmlId();
  const gap = COLLECTION_GAPS[gapId];
  return (
    <EuiPopover
      aria-labelledby={titleId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="m"
      button={
        <EuiLink
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={`${AI_AGENT_TEST_IDS.gapLink}-${gapId}`}
        >
          {GAP_LINK}
        </EuiLink>
      }
    >
      <EuiPopoverTitle id={titleId}>{gap.title}</EuiPopoverTitle>
      <div
        css={css`
          max-width: 360px;
        `}
      >
        <EuiDescriptionList
          compressed
          type="column"
          listItems={[
            { title: GAP_BLOCKS, description: gap.blocks },
            { title: GAP_STATUS, description: gap.status },
            { title: GAP_WORKAROUND, description: gap.workaround },
            { title: GAP_REGISTER, description: GAPS_REGISTER_NAME },
          ]}
        />
      </div>
    </EuiPopover>
  );
});
GapLink.displayName = 'GapLink';

/** A short note for a data layer this agent doesn't have, linking to its gaps row. */
export const MissingLayerNote = memo(
  ({ message, gapId, testId }: { message: string; gapId: GapId; testId: string }) => (
    <KbnInfoCallout size="s" data-test-subj={testId} title={message}>
      <GapLink gapId={gapId} />
    </KbnInfoCallout>
  )
);
MissingLayerNote.displayName = 'MissingLayerNote';
