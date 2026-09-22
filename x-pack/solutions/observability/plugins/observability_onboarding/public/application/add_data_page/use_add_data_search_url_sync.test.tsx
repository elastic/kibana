/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter, useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { useAddDataSearchUrlSync } from './use_add_data_search_url_sync';

const Probe = () => {
  const [value, setValue] = useAddDataSearchUrlSync();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <input
        data-test-subj="probeInput"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div data-test-subj="probeSearch">{location.search}</div>
      <button data-test-subj="probeNavigate" onClick={() => navigate('/?search=from-url')} />
    </>
  );
};

const renderProbe = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CompatRouter>
        <Probe />
      </CompatRouter>
    </MemoryRouter>
  );

describe('useAddDataSearchUrlSync', () => {
  it('initializes the value from the ?search= param', () => {
    renderProbe('/?search=redis');
    expect(screen.getByTestId('probeInput')).toHaveValue('redis');
  });

  it('writes the trimmed value to the URL as the user types', async () => {
    const user = userEvent.setup();
    renderProbe('/');
    await user.type(screen.getByTestId('probeInput'), 'redis ');
    expect(screen.getByTestId('probeInput')).toHaveValue('redis ');
    expect(screen.getByTestId('probeSearch')).toHaveTextContent('?search=redis');
  });

  it('removes the param when the value is cleared', async () => {
    const user = userEvent.setup();
    renderProbe('/?search=redis');
    await user.clear(screen.getByTestId('probeInput'));
    expect(screen.getByTestId('probeSearch').textContent).toBe('');
  });

  it('preserves unrelated params, including repeated ones', async () => {
    const user = userEvent.setup();
    renderProbe('/?tag=a&tag=b');
    await user.type(screen.getByTestId('probeInput'), 'nginx');
    const search = screen.getByTestId('probeSearch').textContent ?? '';
    expect(search).toContain('tag=a');
    expect(search).toContain('tag=b');
    expect(search).toContain('search=nginx');
  });

  it('adopts external URL changes (back/forward, navigation)', async () => {
    const user = userEvent.setup();
    renderProbe('/?search=redis');
    await user.click(screen.getByTestId('probeNavigate'));
    expect(screen.getByTestId('probeInput')).toHaveValue('from-url');
  });
});
