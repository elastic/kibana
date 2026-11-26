/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ReportTypes } from '../configurations/constants';
import { useActions, type ActionTypes } from './use_actions';

// the Kibana context of a host app, like Synthetics, does not provide the Lens service
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { get: () => '' } },
      application: { navigateToApp: jest.fn() },
    },
  }),
}));

const getLens = () => {
  const action = (id: string) => ({ id, getDisplayName: () => id, execute: jest.fn() });
  return {
    actions: {
      createOpenInLensAction: jest.fn(() => action('openInLens')),
      createSaveToDashboardAction: jest.fn(() => action('save')),
    },
  } as unknown as LensPublicStart;
};

describe('useActions', () => {
  const openInLensAndSave: ActionTypes[] = ['openInLens', 'save'];
  const saveOnly: ActionTypes[] = ['save'];
  const props = {
    reportType: ReportTypes.KPI,
    attributes: [],
    setAddToCaseOpen: jest.fn(),
  };

  it('creates the Lens actions from the lens service of the embeddable', () => {
    const lens = getLens();

    const { result } = renderHook(() =>
      useActions({
        ...props,
        lens,
        title: 'Prefilled title',
        withActions: openInLensAndSave,
      })
    );

    expect(lens.actions.createOpenInLensAction).toHaveBeenCalledWith({
      openInNewTab: true,
      title: 'Prefilled title',
    });
    expect(lens.actions.createSaveToDashboardAction).toHaveBeenCalledWith(
      expect.objectContaining({ isSaveable: true, title: 'Prefilled title' })
    );
    expect(result.current.map(({ id }) => id)).toEqual(['openInLens', 'expViewSave']);
  });

  it('keeps the id and the order of the save action', () => {
    const { result } = renderHook(() =>
      useActions({ ...props, lens: getLens(), withActions: saveOnly })
    );

    expect(result.current[0]).toEqual(expect.objectContaining({ id: 'expViewSave', order: 49 }));
  });
});
