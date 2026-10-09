/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { AskPndFab } from './pnd_chrome';
import { getPndDeepLinks } from '../../deep_links';
import { SecurityPageName } from '@kbn/deeplinks-security';

const renderWithPath = (path: string, ui: React.ReactElement) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<Router history={history}>{ui}</Router>);
};

describe('PND chrome', () => {
  it('registers Throughline deep links without Discover or Dashboards stubs', () => {
    const deepLinks = getPndDeepLinks();
    const ids = deepLinks.map((link) => link.id);

    expect(ids).toEqual([
      SecurityPageName.pndChats,
      SecurityPageName.alerts,
      SecurityPageName.attacks,
      SecurityPageName.pndRecords,
      SecurityPageName.pndThreatHunt,
      SecurityPageName.pndStreams,
      SecurityPageName.pndWatches,
    ]);
    expect(ids).not.toContain('discover');
    expect(ids).not.toContain('dashboards');
    expect(ids).not.toContain('more');
  });

  it('shows the Ask PND FAB outside Chats and hides it on Chats', () => {
    const { unmount } = renderWithPath('/watches', <AskPndFab />);
    expect(screen.getByTestId('pndAskFab')).toBeInTheDocument();
    unmount();

    renderWithPath('/chats', <AskPndFab />);
    expect(screen.queryByTestId('pndAskFab')).not.toBeInTheDocument();
  });
});
