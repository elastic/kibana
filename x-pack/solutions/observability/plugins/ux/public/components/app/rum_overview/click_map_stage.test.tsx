/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { ClickMapStage } from './click_map_stage';

jest.mock('rrweb', () => ({
  Replayer: class {
    pause() {}
    on() {
      return this;
    }
    destroy() {}
  },
}));

jest.mock('rrweb/dist/style.css', () => ({}));

const snapshot = {
  sessionId: 'snap-1',
  href: 'https://example/app',
  width: 1280,
  height: 800,
  events: [{ type: 4 }, { type: 2 }],
};

describe('ClickMapStage hotspots', () => {
  it('shows a sampled-count tooltip on hover and opens sessions from the popover', async () => {
    const user = userEvent.setup();
    const onViewSessions = jest.fn();
    render(
      <I18nProvider>
        <ClickMapStage
          snapshot={snapshot}
          clicks={[
            { x: 120, y: 80, count: 12, sessionIds: ['sess-a', 'sess-b'] },
            { x: 400, y: 200, count: 3 },
          ]}
          sampledClicks={20}
          onViewSessions={onViewSessions}
        />
      </I18nProvider>
    );

    await user.hover(screen.getByTestId('uxClickMapHotspot-120-80'));
    const tooltip = await screen.findByTestId('uxClickMapTooltip');
    expect(tooltip).toHaveTextContent('12 clicks');
    expect(tooltip).toHaveTextContent('of sampled clicks on this page');
    expect(screen.queryByTestId('uxClickMapViewSessions')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('uxClickMapHotspot-120-80'));
    expect(await screen.findByTestId('uxClickMapPopover')).toBeInTheDocument();
    await user.click(screen.getByTestId('uxClickMapViewSessions'));
    expect(onViewSessions).toHaveBeenCalledWith(['sess-a', 'sess-b']);
  });
});
