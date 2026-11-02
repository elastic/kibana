/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { UiSettingsMetadataState } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { useEditableSettings } from './use_editable_settings';

const definitions: UiSettingsMetadataState = {
  'test:mode': {
    name: 'Mode',
    description: 'How the page loads data',
    type: 'select',
    value: 'off',
    options: ['off', 'low', 'high'],
    requiresPageReload: true,
  },
};

const setup = () => {
  const coreStart = coreMock.createStart();
  coreStart.settings.client.getAll.mockReturnValue({
    'test:mode': { value: 'off', type: 'select', userValue: 'low' },
  });
  coreStart.settings.metadata.getAll.mockResolvedValue(definitions);

  const { Provider } = createKibanaReactContext(coreStart);
  const wrapper = ({ children }: React.PropsWithChildren) => <Provider>{children}</Provider>;
  const renderEditableSettings = () =>
    renderHook(() => useEditableSettings(['test:mode']), { wrapper });

  return { coreStart, renderEditableSettings };
};

describe('useEditableSettings', () => {
  it('builds fields from the loaded setting definitions and the current values from the client', async () => {
    const { coreStart, renderEditableSettings } = setup();

    const { result } = renderEditableSettings();

    await waitFor(() => expect(result.current.fields['test:mode']).toBeDefined());
    expect(result.current.fields['test:mode']).toMatchObject({
      displayName: 'Mode',
      description: 'How the page loads data',
      options: { values: ['off', 'low', 'high'], labels: {} },
      requiresPageReload: true,
      defaultValue: 'off',
      savedValue: 'low',
    });
    expect(coreStart.settings.metadata.getAll).toHaveBeenCalledTimes(1);
    expect(coreStart.settings.metadata.getAll).toHaveBeenCalledWith('namespace');
  });

  it('shows a danger toast when the setting definitions fail to load', async () => {
    const { coreStart, renderEditableSettings } = setup();
    coreStart.settings.metadata.getAll.mockRejectedValue(new Error('Request failed'));

    const { result } = renderEditableSettings();

    await waitFor(() =>
      expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Unable to load settings',
        text: 'Request failed',
      })
    );
    expect(result.current.fields).toEqual({});
  });
});
