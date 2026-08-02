/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalGroup } from '@kbn/pnd-common';

import type { PndBlastRadiusEntity } from '../../../../components/filters/blast_radius';

export interface FilterGroupsByEntityParams {
  /** The blast radius chip the analyst pressed, or `null` when none is pressed. */
  entity: PndBlastRadiusEntity | null;
  groups: PndProposalGroup[];
}

/**
 * Narrows the queue to the proposals a blast radius chip vouches for (annotation 3).
 *
 * The entity carries every Attack Discovery that contributed its term, so membership is a
 * lookup rather than a second read: a proposal stays when its own discovery is one of them.
 * An uncorrelated run therefore always drops — it has no discovery, so no entity can speak
 * for it, and keeping it would put a row on screen the chip makes no claim about.
 *
 * Groups the filter empties are dropped rather than passed on empty, which is the shape the
 * proposals route itself sends: the four sections are synthesized downstream from whatever
 * arrives, so a bucket with no rows carries no information.
 *
 * Returns the **same array** when nothing is filtering, so an unfiltered queue costs no
 * re-render of the list it feeds.
 */
export const filterGroupsByEntity = ({
  entity,
  groups,
}: FilterGroupsByEntityParams): PndProposalGroup[] => {
  if (entity == null) {
    return groups;
  }

  return groups.reduce<PndProposalGroup[]>((kept, group) => {
    const proposals = group.proposals.filter(({ correlationId }) =>
      entity.correlationIds.includes(correlationId)
    );

    return proposals.length === 0 ? kept : [...kept, { ...group, proposals }];
  }, []);
};
