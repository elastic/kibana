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
import { AskAlertZeroFab } from './alertzero_chrome';
import { getAlertZeroDeepLinks } from '../../deep_links';
import { SecurityPageName } from '@kbn/deeplinks-security';

const renderWithPath = (path: string, ui: React.ReactElement) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<Router history={history}>{ui}</Router>);
};

describe('AlertZero chrome', () => {
  it('registers Throughline deep links without Discover or Dashboards stubs', () => {
    const deepLinks = getAlertZeroDeepLinks();
    const ids = deepLinks.map((link) => link.id);

    expect(ids).toEqual([
      SecurityPageName.alertZeroChats,
      SecurityPageName.alerts,
      SecurityPageName.attacks,
      SecurityPageName.alertZeroRecords,
      SecurityPageName.alertZeroThreatHunt,
      SecurityPageName.alertZeroStreams,
      SecurityPageName.alertZeroWatches,
    ]);
    expect(ids).not.toContain('discover');
    expect(ids).not.toContain('dashboards');
    expect(ids).not.toContain('more');
  });

  it('shows the Ask AlertZero FAB outside Chats and hides it on Chats', () => {
    const { unmount } = renderWithPath('/watches', <AskAlertZeroFab />);
    expect(screen.getByTestId('alertZeroAskFab')).toBeInTheDocument();
    unmount();

    renderWithPath('/chats', <AskAlertZeroFab />);
    expect(screen.queryByTestId('alertZeroAskFab')).not.toBeInTheDocument();
  });
});
