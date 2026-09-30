/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactEntityView } from '@kbn/agentic-investigations-common';
import { investigationFlyoutHistoryKey } from '@kbn/agentic-investigations-common';
import { openImpactEntity, registerImpactEntityOpener } from './impact_entity_opener';

describe('impact entity opener', () => {
  it('invokes an opener registered after the call site was wired', () => {
    const opener = jest.fn();
    const entity: ImpactEntityView = { id: 'host-1', name: 'web-01', type: 'host' };

    openImpactEntity(entity);
    expect(opener).not.toHaveBeenCalled();

    registerImpactEntityOpener(opener);
    openImpactEntity(entity);

    expect(opener).toHaveBeenCalledWith(entity, investigationFlyoutHistoryKey);
  });
});
