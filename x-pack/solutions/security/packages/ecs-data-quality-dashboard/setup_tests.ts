/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// context:
// https://github.com/elastic/eui/issues/4408#issuecomment-754125867
vi.mock('@elastic/eui/lib/services/accessibility/html_id_generator', async () => {
  const mocked = {
    ...(await vi.importActual('@elastic/eui/lib/services/accessibility/html_id_generator')),
    htmlIdGenerator: () => () => `id-${Math.random()}`,
  };
  return { ...mocked, default: mocked };
});

// https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = vi.fn();
