/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiTitle, useEuiTheme } from '@elastic/eui';
import type { PndDiscoveryContext, PndProposalGroup } from '@kbn/pnd-common';

import { useDiscoveryContext } from '../../../hooks/use_discovery_context';
import { BlastRadiusChips } from './blast_radius_chips';
import { mergeDiscoveryEntities } from './helpers/merge_discovery_entities';
import type { PndBlastRadiusEntity } from './helpers/merge_discovery_entities';
import * as i18n from './translations';

/** The section heading's type, from the prototype: the same 13px as a queue section's own header. */
const SECTION_TITLE_FONT_SIZE_PX = 13;
const SECTION_TITLE_LINE_HEIGHT_PX = 18;

/** A stable identity for "nothing read yet", so the merge is not redone on every render. */
const NO_CONTEXTS: PndDiscoveryContext[] = [];

export interface BlastRadiusProps {
  /** The {@link PndBlastRadiusEntity} id the queue is filtered by, or `null` when it is not. */
  activeEntityId: string | null;
  /**
   * The **same** groups the queue renders, so the chips describe what is on screen: narrowing the
   * watch filter narrows the blast radius with it, the way it narrows the KPI tiles.
   */
  groups: PndProposalGroup[];
  /** Pressing a chip asks the queue to filter by that entity, or to stop filtering by it. */
  onToggleEntity: (entity: PndBlastRadiusEntity) => void;
}

/**
 * What the attacks behind the queue actually reached: every host, account and address the visible
 * proposals' discoveries touched, as a row of chips that filter the queue.
 *
 * The entities come from `GET /internal/pnd/discovery-context`, which answers **per Attack
 * Discovery** — the fold across discoveries is {@link mergeDiscoveryEntities}, so a chip's count is
 * how many constituent alerts carry the term across the whole queue rather than inside one discovery.
 *
 * **Nothing renders when there are no entities.** Not a heading over an empty row, and not an error.
 * The route degrades to `{ contexts: [] }` by design rather than failing, an uncorrelated proposal
 * carries no discovery to enrich, and a discovery whose alerts have aged out contributes nothing —
 * all three are ordinary, and a section that appeared and then emptied would read as a fault. It is
 * also why the row is unboxed: with no panel to leave behind, its absence is not a hole in the page.
 */
export const BlastRadius: React.FC<BlastRadiusProps> = ({
  activeEntityId,
  groups,
  onToggleEntity,
}) => {
  const { euiTheme } = useEuiTheme();

  const correlationIds = useMemo(
    () => groups.flatMap(({ proposals }) => proposals.map(({ correlationId }) => correlationId)),
    [groups]
  );

  const { data } = useDiscoveryContext({ correlationIds });

  const entities = useMemo(
    () => mergeDiscoveryEntities(data?.contexts ?? NO_CONTEXTS),
    [data?.contexts]
  );

  if (entities.length === 0) {
    return null;
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
      data-test-subj="pndBlastRadius"
    >
      <EuiTitle
        css={css`
          font-size: ${SECTION_TITLE_FONT_SIZE_PX}px;
          font-weight: ${euiTheme.font.weight.medium};
          line-height: ${SECTION_TITLE_LINE_HEIGHT_PX}px;
        `}
        size="xs"
      >
        <h3>{i18n.BLAST_RADIUS_TITLE}</h3>
      </EuiTitle>

      <BlastRadiusChips
        activeEntityId={activeEntityId}
        entities={entities}
        onToggleEntity={onToggleEntity}
      />
    </div>
  );
};
