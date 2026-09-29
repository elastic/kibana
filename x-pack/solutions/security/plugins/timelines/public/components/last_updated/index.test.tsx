/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';
import { LastUpdatedAt } from '.';

vi.mock('@kbn/i18n-react', async () => {
  const originalModule = await vi.importActual('@kbn/i18n-react');
  const { i18n } = await vi.importActual('@kbn/i18n');
  i18n.init({ locale: 'en' });
  const FormattedRelative = vi.fn();
  FormattedRelative.mockImplementation(() => '2 minutes ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

describe('LastUpdatedAt', () => {
  test('it renders correct relative time', () => {
    const wrapper = mount(
      <I18nProvider>
        <LastUpdatedAt updatedAt={1603995240115} />
      </I18nProvider>
    );

    expect(wrapper.text()).toEqual(' Updated 2 minutes ago');
  });

  test('it renders updating text if "showUpdating" is true', () => {
    const wrapper = mount(
      <I18nProvider>
        <LastUpdatedAt updatedAt={1603995240115} showUpdating />
      </I18nProvider>
    );

    expect(wrapper.text()).toEqual(' Updating...');
  });
});
