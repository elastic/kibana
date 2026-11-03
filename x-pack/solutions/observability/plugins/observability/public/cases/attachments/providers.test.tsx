/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import { PluginContext } from '../../context/plugin_context/plugin_context';
import type { ObservabilityAttachmentContext } from './providers';
import { createCaseAttachmentProviders } from './providers';

const ConfigProbe = () => {
  const { config } = useContext(PluginContext);
  return <span data-test-subj="probe">{config ? 'has-config' : 'no-config'}</span>;
};

describe('createCaseAttachmentProviders', () => {
  it('renders attachments inside the Observability plugin context once it resolves', async () => {
    const Providers = createCaseAttachmentProviders(
      async () =>
        ({
          core: {},
          plugins: {},
          pluginContext: { config: {} },
        } as unknown as ObservabilityAttachmentContext)
    );

    render(
      <Providers>
        <ConfigProbe />
      </Providers>
    );

    expect(await screen.findByTestId('probe')).toHaveTextContent('has-config');
  });

  it('says the attachment could not load when the context fails', async () => {
    const Providers = createCaseAttachmentProviders(() => Promise.reject(new Error('boom')));

    render(
      <Providers>
        <ConfigProbe />
      </Providers>
    );

    expect(await screen.findByText(/couldn't load/)).toBeInTheDocument();
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument();
  });
});
