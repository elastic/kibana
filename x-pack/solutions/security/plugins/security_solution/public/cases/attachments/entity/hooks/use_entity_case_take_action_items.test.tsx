/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useEntityCaseTakeActionItems } from './use_entity_case_take_action_items';
import { useCanAttachToCase } from '../../hooks/use_can_attach_to_case';
import type { EntityToAttach } from '..';

vi.mock('../../../../common/lib/kibana');
vi.mock('../../../../common/hooks/use_experimental_features');
vi.mock('../../hooks/use_can_attach_to_case');

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as Mock;
const mockUseCanAttachToCase = useCanAttachToCase as Mock;

const ENTITY: EntityToAttach = {
  id: 'entity-store-id-abc',
  name: 'alice',
  type: 'user',
};

const noop = () => {};

const renderItemKeys = (entity: EntityToAttach = ENTITY): Array<string | null> => {
  const { result } = renderHook(() => useEntityCaseTakeActionItems(entity));
  return result.current(noop).map((element) => element.key);
};

describe('useEntityCaseTakeActionItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseCanAttachToCase.mockReturnValue(true);
    mockUseKibana().services.cases.config = { attachmentsEnabled: true };
  });

  it('returns the case action when the user has case permissions', () => {
    expect(renderItemKeys()).toEqual(['addToCase']);
  });

  it('returns no items when the user has no case permission', () => {
    mockUseCanAttachToCase.mockReturnValue(false);

    expect(renderItemKeys()).toEqual([]);
  });

  it('returns no items when the entity attachments feature is disabled', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    expect(renderItemKeys()).toEqual([]);
  });

  it('returns no items when cases attachments are disabled', () => {
    mockUseKibana().services.cases.config = { attachmentsEnabled: false };

    expect(renderItemKeys()).toEqual([]);
  });

  it('returns no items when the entity is missing identifying fields', () => {
    expect(renderItemKeys({ ...ENTITY, id: '' })).toEqual([]);
    expect(renderItemKeys({ ...ENTITY, name: '' })).toEqual([]);
  });
});
