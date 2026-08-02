/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLifecycleSearch,
  buildLifecycleTabSearch,
  clearLifecycleSearch,
  DEFAULT_LIFECYCLE_TAB_ID,
  isLifecycleTabId,
  LIFECYCLE_FLYOUT_QUERY_PARAM,
  LIFECYCLE_FLYOUT_TAB_QUERY_PARAM,
  LIFECYCLE_TAB_IDS,
  readLifecycleAlertId,
  readLifecycleTabId,
} from '.';

describe('LIFECYCLE_FLYOUT_QUERY_PARAM', () => {
  it('is the query param the overlay opens on', () => {
    expect(LIFECYCLE_FLYOUT_QUERY_PARAM).toBe('lifecycle');
  });
});

describe('LIFECYCLE_FLYOUT_TAB_QUERY_PARAM', () => {
  it('is the query param the active tab travels in', () => {
    expect(LIFECYCLE_FLYOUT_TAB_QUERY_PARAM).toBe('lifecycleTab');
  });
});

describe('LIFECYCLE_TAB_IDS', () => {
  it('is the two tabs decision 1 of the 2026-08-17 sync leaves, in the order they are rendered', () => {
    expect(LIFECYCLE_TAB_IDS).toEqual(['overview', 'timeline']);
  });
});

describe('DEFAULT_LIFECYCLE_TAB_ID', () => {
  it('is the first tab, so an overlay opened with no tab lands on Overview', () => {
    expect(DEFAULT_LIFECYCLE_TAB_ID).toBe('overview');
  });
});

describe('isLifecycleTabId', () => {
  it.each(LIFECYCLE_TAB_IDS)('accepts the %s tab', (tabId) => {
    expect(isLifecycleTabId(tabId)).toBe(true);
  });

  it('rejects a tab the flyout does not have', () => {
    expect(isLifecycleTabId('nope')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isLifecycleTabId('')).toBe(false);
  });

  it('rejects null, which is what an absent param reads as', () => {
    expect(isLifecycleTabId(null)).toBe(false);
  });
});

describe('readLifecycleTabId', () => {
  it('reads the tab the overlay was deep-linked to', () => {
    expect(readLifecycleTabId('?lifecycle=ad-1&lifecycleTab=timeline')).toBe('timeline');
  });

  it('reads it whichever order the params are in', () => {
    expect(readLifecycleTabId('?lifecycleTab=timeline&lifecycle=ad-1')).toBe('timeline');
  });

  it('falls back to Overview when the param is absent', () => {
    expect(readLifecycleTabId('?lifecycle=ad-1')).toBe('overview');
  });

  it('falls back to Overview for an empty search string', () => {
    expect(readLifecycleTabId('')).toBe('overview');
  });

  it('falls back to Overview for an unknown tab rather than rendering nothing', () => {
    expect(readLifecycleTabId('?lifecycle=ad-1&lifecycleTab=nope')).toBe('overview');
  });

  it('falls back to Overview for an empty value', () => {
    expect(readLifecycleTabId('?lifecycle=ad-1&lifecycleTab=')).toBe('overview');
  });

  /**
   * The retired tab ids, which used to be tabs of their own and are now **sections inside
   * Overview**. A link a colleague pasted before the 2026-08-17 sync must land on the tab that
   * holds that content now, rather than on an empty flyout.
   */
  it.each(['attachments', 'tuning', 'lifecycle'])(
    'resolves the retired %s tab to Overview, which is where its section now lives',
    (retired) => {
      expect(readLifecycleTabId(`?lifecycle=ad-1&lifecycleTab=${retired}`)).toBe('overview');
    }
  );
});

describe('buildLifecycleTabSearch', () => {
  it('adds the tab to a search string that only had the overlay open', () => {
    expect(buildLifecycleTabSearch('?lifecycle=ad-1', 'timeline')).toBe(
      '?lifecycle=ad-1&lifecycleTab=timeline'
    );
  });

  it('replaces the tab that was already selected rather than appending a second one', () => {
    expect(buildLifecycleTabSearch('?lifecycle=ad-1&lifecycleTab=timeline', 'overview')).toBe(
      '?lifecycle=ad-1&lifecycleTab=overview'
    );
  });

  it('keeps the params the page already had, so switching tabs never loses filters', () => {
    expect(buildLifecycleTabSearch('?bucket=tune&lifecycle=ad-1', 'timeline')).toBe(
      '?bucket=tune&lifecycle=ad-1&lifecycleTab=timeline'
    );
  });
});

describe('readLifecycleAlertId', () => {
  it('reads the discovery id the overlay was opened for', () => {
    expect(readLifecycleAlertId('?lifecycle=ad-1')).toBe('ad-1');
  });

  it('reads it alongside other params', () => {
    expect(readLifecycleAlertId('?bucket=tune&lifecycle=ad-1')).toBe('ad-1');
  });

  it('decodes an id that needed encoding', () => {
    expect(readLifecycleAlertId('?lifecycle=ad%201%2F2')).toBe('ad 1/2');
  });

  it('returns undefined when the param is absent', () => {
    expect(readLifecycleAlertId('?bucket=tune')).toBeUndefined();
  });

  it('returns undefined for an empty search string', () => {
    expect(readLifecycleAlertId('')).toBeUndefined();
  });

  it('returns undefined for an empty value, so ?lifecycle= never opens an empty overlay', () => {
    expect(readLifecycleAlertId('?lifecycle=')).toBeUndefined();
  });
});

describe('buildLifecycleSearch', () => {
  it('adds the param to an empty search string', () => {
    expect(buildLifecycleSearch('', 'ad-1')).toBe('?lifecycle=ad-1');
  });

  it('keeps the params the page already had, so opening the overlay never loses filters', () => {
    expect(buildLifecycleSearch('?bucket=tune', 'ad-1')).toBe('?bucket=tune&lifecycle=ad-1');
  });

  it('replaces an id that was already open rather than appending a second one', () => {
    expect(buildLifecycleSearch('?lifecycle=ad-0', 'ad-1')).toBe('?lifecycle=ad-1');
  });

  it('encodes an id that needs it', () => {
    expect(buildLifecycleSearch('', 'ad 1/2')).toBe('?lifecycle=ad+1%2F2');
  });
});

describe('clearLifecycleSearch', () => {
  it('removes the param', () => {
    expect(clearLifecycleSearch('?lifecycle=ad-1')).toBe('');
  });

  it('keeps every other param, so closing the overlay never loses filters', () => {
    expect(clearLifecycleSearch('?bucket=tune&lifecycle=ad-1')).toBe('?bucket=tune');
  });

  it('removes the tab param too, so a closed overlay leaves no orphan tab in the URL', () => {
    expect(clearLifecycleSearch('?lifecycle=ad-1&lifecycleTab=timeline')).toBe('');
  });

  it('removes the tab param while keeping the page own params', () => {
    expect(clearLifecycleSearch('?bucket=tune&lifecycle=ad-1&lifecycleTab=timeline')).toBe(
      '?bucket=tune'
    );
  });

  it('leaves a search string that never had the param alone', () => {
    expect(clearLifecycleSearch('?bucket=tune')).toBe('?bucket=tune');
  });

  it('returns an empty string for an empty search string', () => {
    expect(clearLifecycleSearch('')).toBe('');
  });
});
