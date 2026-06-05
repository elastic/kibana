/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { encode } from '@kbn/rison';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useDefaultDocumentFlyoutProperties } from '../../../shared/hooks/use_default_flyout_properties';
import { useOpenAttackFlyoutV2FromUrl } from './use_open_attack_flyout_v2_from_url';
import { ATTACK_FLYOUT_V2_URL_PARAM } from '../utils/attack_flyout_v2_url_param';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../shared/hooks/use_default_flyout_properties');
jest.mock('../../../shared/components/flyout_provider', () => ({
  flyoutProviders: jest.fn(({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="flyout-providers">{children}</div>
  )),
}));
jest.mock('../attack_flyout_wrapper', () => ({
  AttackFlyoutWrapper: (props: unknown) => (
    <div data-test-subj="attack-flyout-wrapper">{JSON.stringify(props)}</div>
  ),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useStore: () => ({ getState: jest.fn(), dispatch: jest.fn(), subscribe: jest.fn() }),
}));

const renderWithInitialEntry = (initialEntry: string) => {
  const result = renderHook(
    () => ({
      hook: useOpenAttackFlyoutV2FromUrl({ onAttackUpdated: jest.fn() }),
      location: useLocation(),
    }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      ),
    }
  );
  return result;
};

describe('useOpenAttackFlyoutV2FromUrl', () => {
  const openSystemFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        overlays: { openSystemFlyout },
      },
    });
    (useDefaultDocumentFlyoutProperties as jest.Mock).mockReturnValue({
      maxWidth: 1200,
      minWidth: 400,
      ownFocus: false,
      paddingSize: 'm',
      resizable: true,
      size: 's',
    });
  });

  it('does nothing when the new flyout system flag is disabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    const encoded = encode({ attackId: 'attack-1', indexName: 'idx' });
    renderWithInitialEntry(`/attacks?${ATTACK_FLYOUT_V2_URL_PARAM}=${encoded}`);
    expect(openSystemFlyout).not.toHaveBeenCalled();
  });

  it('does nothing when the URL param is missing', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    renderWithInitialEntry('/attacks?other=value');
    expect(openSystemFlyout).not.toHaveBeenCalled();
  });

  it('opens the v2 flyout when the URL param is present and v2 is enabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const encoded = encode({ attackId: 'attack-1', indexName: 'my-index' });
    renderWithInitialEntry(`/attacks?${ATTACK_FLYOUT_V2_URL_PARAM}=${encoded}`);
    expect(openSystemFlyout).toHaveBeenCalledTimes(1);
    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start' })
    );
  });

  it('removes the URL param after opening, preserving other params', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const encoded = encode({ attackId: 'attack-1', indexName: 'my-index' });
    const { result } = renderWithInitialEntry(
      `/attacks?${ATTACK_FLYOUT_V2_URL_PARAM}=${encoded}&other=value`
    );
    expect(result.current.location.search).toBe('?other=value');
  });

  it('removes the URL param entirely when it was the only one', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const encoded = encode({ attackId: 'attack-1', indexName: 'my-index' });
    const { result } = renderWithInitialEntry(`/attacks?${ATTACK_FLYOUT_V2_URL_PARAM}=${encoded}`);
    expect(result.current.location.search).toBe('');
  });

  it('only opens once even when the hook re-runs', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const encoded = encode({ attackId: 'attack-1', indexName: 'my-index' });
    const { rerender } = renderWithInitialEntry(
      `/attacks?${ATTACK_FLYOUT_V2_URL_PARAM}=${encoded}`
    );
    rerender();
    rerender();
    expect(openSystemFlyout).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed URL param values', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    renderWithInitialEntry(`/attacks?${ATTACK_FLYOUT_V2_URL_PARAM}=not-rison@`);
    expect(openSystemFlyout).not.toHaveBeenCalled();
  });
});
