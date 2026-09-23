/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Investigation } from '@kbn/agentic-investigations-common';
import type { ProposalItem } from '../../../../common/proposals/list';
import type { QueueSection } from './use_queue_section';
import { useCategoryQueueSection, useClosedQueueSection } from './use_queue_section';

export interface QueueSections {
  sections: QueueSection[];
  /** Every loaded proposal, for the modals and the chat links. */
  proposalsById: Map<string, ProposalItem>;
  /** Unfiltered: Impact derives its chips from the whole set. */
  investigations: Investigation[];
}

export const useQueueSections = (): QueueSections => {
  const respond = useCategoryQueueSection('respond');
  const investigate = useCategoryQueueSection('investigate');
  const configure = useCategoryQueueSection('configure');
  const closed = useClosedQueueSection();

  const sections = [respond, investigate, configure, closed];

  // Keyed on the rows themselves, not the section objects: those are rebuilt every
  // render, which would rebuild and re-sort the union on every poll.
  const proposalsById = useMemo(
    () =>
      new Map(
        [
          ...respond.proposals,
          ...investigate.proposals,
          ...configure.proposals,
          ...closed.proposals,
        ].map((proposal) => [proposal.id, proposal])
      ),
    [respond.proposals, investigate.proposals, configure.proposals, closed.proposals]
  );

  // Each section pages by its own recency, so priorityScore is what gives the
  // union an impact-first order.
  const investigations = useMemo(
    () =>
      [
        ...respond.investigations,
        ...investigate.investigations,
        ...configure.investigations,
        ...closed.investigations,
      ].toSorted((a, b) => {
        const priorityDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        return priorityDiff !== 0 ? priorityDiff : b.updatedAt.localeCompare(a.updatedAt);
      }),
    [
      respond.investigations,
      investigate.investigations,
      configure.investigations,
      closed.investigations,
    ]
  );

  return { sections, proposalsById, investigations };
};
