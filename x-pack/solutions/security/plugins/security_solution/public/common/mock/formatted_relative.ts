/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

vi.mock('@kbn/i18n-react', async () => {
  const { i18n } = await vi.importActual('@kbn/i18n');
  i18n.init({ locale: 'en' });
  const originalModule = await vi.importActual('@kbn/i18n-react');

  const FormattedRelative = vi.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});
