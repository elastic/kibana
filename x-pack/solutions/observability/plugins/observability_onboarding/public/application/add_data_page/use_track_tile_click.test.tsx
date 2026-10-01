/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useHistory } from 'react-router-dom';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { OBSERVABILITY_ONBOARDING_ADD_DATA_TILE_CLICK_TELEMETRY_EVENT } from '../../../common/telemetry_events';
import { useTrackTileClick } from './use_track_tile_click';

const TILE_CLICK_EVENT = OBSERVABILITY_ONBOARDING_ADD_DATA_TILE_CLICK_TELEMETRY_EVENT.eventType;

const setup = (initialPath: string) => {
  const core = coreMock.createStart();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={core}>
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    </KibanaContextProvider>
  );
  const { result } = renderHook(
    () => ({ trackTileClick: useTrackTileClick(), history: useHistory() }),
    { wrapper }
  );
  return { ...result.current, reportEvent: core.analytics.reportEvent };
};

const click = {} as React.MouseEvent;

describe('useTrackTileClick', () => {
  it('reports the tile fields before running the original handler', () => {
    const { trackTileClick, reportEvent } = setup('/');
    const onClick = jest.fn(() => expect(reportEvent).toHaveBeenCalledTimes(1));

    trackTileClick({ tile_id: 'docker', surface: 'tile', collection_id: 'docker' }, onClick)(click);

    expect(reportEvent).toHaveBeenCalledWith(TILE_CLICK_EVENT, {
      tile_id: 'docker',
      surface: 'tile',
      collection_id: 'docker',
      has_search_term: false,
    });
    expect(onClick).toHaveBeenCalledWith(click);
  });

  it('flags clicks made while the search field holds a term', () => {
    const { trackTileClick, reportEvent } = setup('/?search=nginx');

    trackTileClick({ tile_id: 'epr:nginx', surface: 'search_result' })(click);

    expect(reportEvent).toHaveBeenCalledWith(TILE_CLICK_EVENT, {
      tile_id: 'epr:nginx',
      surface: 'search_result',
      has_search_term: true,
    });
  });

  it('reads the search term before a route tile navigates away', () => {
    const { trackTileClick, history, reportEvent } = setup('/?search=nginx');

    act(() =>
      trackTileClick({ tile_id: 'kubernetes', surface: 'tile' }, () => history.push('/kubernetes'))(
        click
      )
    );

    expect(reportEvent).toHaveBeenCalledWith(TILE_CLICK_EVENT, {
      tile_id: 'kubernetes',
      surface: 'tile',
      has_search_term: true,
    });
    expect(history.location.pathname).toBe('/kubernetes');
  });

  it('does not count an empty search param as a search term', () => {
    const { trackTileClick, reportEvent } = setup('/?search=');

    trackTileClick({ tile_id: 'linux', surface: 'tile' })(click);

    expect(reportEvent).toHaveBeenCalledWith(TILE_CLICK_EVENT, {
      tile_id: 'linux',
      surface: 'tile',
      has_search_term: false,
    });
  });
});
