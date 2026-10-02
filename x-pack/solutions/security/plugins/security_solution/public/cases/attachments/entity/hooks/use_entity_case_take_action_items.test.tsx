/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useEntityCaseTakeActionItems } from './use_entity_case_take_action_items';
import { useEntityCasePermissions } from './use_case_permission';
import type { EntityToAttach } from '..';
import {
  DEFAULT_FACELIFT_VERSION,
  setActiveFaceliftVersion,
} from '../../../../entity_analytics/components/home/facelift/active_version';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('./use_case_permission');

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseEntityCasePermissions = useEntityCasePermissions as jest.Mock;

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
    jest.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseEntityCasePermissions.mockReturnValue({
      canAddToNewCase: true,
      canAddToExistingCase: true,
    });
    mockUseKibana().services.cases.config = { attachmentsEnabled: true };
    // The facelift v.8 prototype collapses the two actions into one "Add to case".
    setActiveFaceliftVersion('v1');
  });

  afterAll(() => setActiveFaceliftVersion(DEFAULT_FACELIFT_VERSION));

  it('returns both items when the user can add to new and existing cases', () => {
    expect(renderItemKeys()).toEqual(['addToNewCase', 'addToExistingCase']);
  });

  it('hides "add to new case" when the user cannot create a new case', () => {
    mockUseEntityCasePermissions.mockReturnValue({
      canAddToNewCase: false,
      canAddToExistingCase: true,
    });

    expect(renderItemKeys()).toEqual(['addToExistingCase']);
  });

  it('hides "add to existing case" when the user cannot update a case', () => {
    mockUseEntityCasePermissions.mockReturnValue({
      canAddToNewCase: true,
      canAddToExistingCase: false,
    });

    expect(renderItemKeys()).toEqual(['addToNewCase']);
  });

  it('returns no items when the user has neither case permission', () => {
    mockUseEntityCasePermissions.mockReturnValue({
      canAddToNewCase: false,
      canAddToExistingCase: false,
    });

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

  describe('facelift v.8', () => {
    beforeEach(() => setActiveFaceliftVersion('v8'));

    it('returns a single "add to case" item', () => {
      expect(renderItemKeys()).toEqual(['addToCase']);
    });

    it('returns no items when the user cannot update a case', () => {
      mockUseEntityCasePermissions.mockReturnValue({
        canAddToNewCase: true,
        canAddToExistingCase: false,
      });

      expect(renderItemKeys()).toEqual([]);
    });
  });
});
