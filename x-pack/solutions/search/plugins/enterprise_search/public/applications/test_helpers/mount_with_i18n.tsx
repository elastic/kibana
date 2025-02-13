/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mount } from 'enzyme';

import { I18nProvider } from '@kbn/i18n-react';

/**
 * This helper wraps a component with @kbn/i18n's <I18nProvider> which
 * fixes "Could not find required `intl` object" console errors when running tests
 *
 * Example usage (should be the same as mount()):
 *
 * const wrapper = mountWithI18n(<Component />);
 */
export const mountWithIntl = (children: React.ReactElement) => {
  return mount(<I18nProvider>{children}</I18nProvider>);
};
