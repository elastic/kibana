/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { ConfirmSourceActionModal } from './confirm_source_action_modal';

describe('ConfirmSourceActionModal', () => {
  it('tags only the confirm button, with the action as detail', () => {
    render(
      <I18nProvider>
        <ConfirmSourceActionModal
          action="changeQuery"
          source={{ title: 'Source' } as NightshiftSource}
          isLoading={false}
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      </I18nProvider>
    );

    const confirm = screen.getByTestId('confirmModalConfirmButton');
    expect(confirm).toHaveAttribute('data-ebt-action', 'confirmSourceAction');
    expect(confirm).toHaveAttribute('data-ebt-detail', 'changeQuery');
    expect(screen.getByTestId('confirmModalCancelButton').closest('[data-ebt-action]')).toBeNull();
  });
});
