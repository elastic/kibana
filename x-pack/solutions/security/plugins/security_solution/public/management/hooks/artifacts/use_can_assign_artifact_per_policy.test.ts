/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactFormComponentProps } from '../../components/artifact_list_page';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { useLicense } from '../../../common/hooks/use_license';
import type { LicenseService } from '../../../../common/license';
import { buildPerPolicyTag } from '../../../../common/endpoint/service/artifacts/utils';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../common/mock/endpoint';
import { useCanAssignArtifactPerPolicy } from './use_can_assign_artifact_per_policy';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';

jest.mock('../../../common/hooks/use_license');

const useLicenseMock = useLicense as jest.Mock<jest.Mocked<LicenseService>>;

describe('useCanAssignArtifactPerPolicy()', () => {
  let item: ArtifactFormComponentProps['item'];
  let mode: ArtifactFormComponentProps['mode'];
  let hasItemBeenUpdated: boolean;
  let renderHook: () => ReturnType<AppContextTestRender['renderHook']>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderHook = () => {
      return testContext.renderHook(() => {
        return useCanAssignArtifactPerPolicy(item, mode, hasItemBeenUpdated);
      });
    };

    item = new ExceptionsListItemGenerator('seed').generateTrustedApp({
      tags: [buildPerPolicyTag('123')],
    });
    mode = 'edit';
    hasItemBeenUpdated = false;
    useLicenseMock().isPlatinumPlus.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return `true` when license is platinum plus', () => {
    mode = 'create';
    useLicenseMock().isPlatinumPlus.mockReturnValue(true);
    const { result } = renderHook();

    expect(result.current).toEqual(true);
  });

  it('should return `false` when license is not platinum and artifact is global', () => {
    mode = 'create';
    useLicenseMock().isPlatinumPlus.mockReturnValue(false);
    const { result } = renderHook();

    expect(result.current).toEqual(false);
  });

  it('should return `true` when license is not platinum but artifact is currently per-policy', () => {
    const { result } = renderHook();

    expect(result.current).toEqual(true);
  });

  it('should return `true` when license is not platinum and per-policy item was updated to global', () => {
    const { result, rerender } = renderHook();
    item.tags = [GLOBAL_ARTIFACT_TAG];
    hasItemBeenUpdated = true;
    rerender();

    expect(result.current).toEqual(true);
  });
});
