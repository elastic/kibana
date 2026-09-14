/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import type { AppContextTestRender, UserPrivilegesMockSetter } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import {
  buildPerPolicyTag,
  buildSpaceOwnerIdTag,
} from '../../../../common/endpoint/service/artifacts/utils';
import { NO_PRIVILEGE_FOR_MANAGEMENT_OF_GLOBAL_ARTIFACT_MESSAGE } from '../../common/translations';
import { MANAGEMENT_OF_SHARED_PER_POLICY_ARTIFACT_NOT_ALLOWED_MESSAGE } from '../../components/artifact_entry_card/components/translations';
import type { ArtifactActionsDisabledState } from './use_artifact_actions_disabled';
import { useArtifactActionsDisabled } from './use_artifact_actions_disabled';

jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/hooks/use_space_id');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const useSpaceIdMock = useSpaceId as jest.Mock;

describe('useArtifactActionsDisabled()', () => {
  const ACTIVE_SPACE_ID = 'default';
  const OTHER_SPACE_ID = 'foo';

  let testContext: AppContextTestRender;
  let authzMock: UserPrivilegesMockSetter;
  let item: Parameters<typeof useArtifactActionsDisabled>[0];
  let renderHook: () => RenderHookResult<ArtifactActionsDisabledState, unknown>;

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    authzMock = testContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);
    useSpaceIdMock.mockReturnValue(ACTIVE_SPACE_ID);

    renderHook = () => {
      return testContext.renderHook(() => useArtifactActionsDisabled(item));
    };
  });

  afterEach(() => {
    authzMock.reset();
    useSpaceIdMock.mockReset();
  });

  it('should enable actions when the user can manage global artifacts', () => {
    item = { tags: [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag(OTHER_SPACE_ID)] };

    const { result } = renderHook();

    expect(result.current).toEqual({ isDisabled: false, disabledTooltip: undefined });
  });

  it('should enable actions for a per-policy artifact in another space when the user can manage global artifacts', () => {
    item = {
      tags: [buildPerPolicyTag('abc'), buildSpaceOwnerIdTag(OTHER_SPACE_ID)],
    };

    const { result } = renderHook();

    expect(result.current).toEqual({ isDisabled: false, disabledTooltip: undefined });
  });

  it('should disable actions for a global artifact when the user cannot manage global artifacts', () => {
    authzMock.set({ canManageGlobalArtifacts: false });
    item = { tags: [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag(OTHER_SPACE_ID)] };

    const { result } = renderHook();

    expect(result.current).toEqual({
      isDisabled: true,
      disabledTooltip: NO_PRIVILEGE_FOR_MANAGEMENT_OF_GLOBAL_ARTIFACT_MESSAGE,
    });
  });

  it('should disable actions for a per-policy artifact not owned by the active space', () => {
    authzMock.set({ canManageGlobalArtifacts: false });
    item = {
      tags: [buildPerPolicyTag('abc'), buildSpaceOwnerIdTag(OTHER_SPACE_ID)],
    };

    const { result } = renderHook();

    expect(result.current).toEqual({
      isDisabled: true,
      disabledTooltip: MANAGEMENT_OF_SHARED_PER_POLICY_ARTIFACT_NOT_ALLOWED_MESSAGE,
    });
  });

  it('should enable actions for a per-policy artifact owned by the active space', () => {
    authzMock.set({ canManageGlobalArtifacts: false });
    item = {
      tags: [buildPerPolicyTag('abc'), buildSpaceOwnerIdTag(ACTIVE_SPACE_ID)],
    };

    const { result } = renderHook();

    expect(result.current).toEqual({ isDisabled: false, disabledTooltip: undefined });
  });

  it('should disable actions for a per-policy artifact when the active space is unknown', () => {
    authzMock.set({ canManageGlobalArtifacts: false });
    useSpaceIdMock.mockReturnValue(undefined);
    item = {
      tags: [buildPerPolicyTag('abc'), buildSpaceOwnerIdTag(ACTIVE_SPACE_ID)],
    };

    const { result } = renderHook();

    expect(result.current).toEqual({
      isDisabled: true,
      disabledTooltip: MANAGEMENT_OF_SHARED_PER_POLICY_ARTIFACT_NOT_ALLOWED_MESSAGE,
    });
  });
});
