/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ServerlessVectordbPlugin } from './plugin';
import { CONSOLE_DEFAULT_CONTENT } from './console_default_content';

describe('ServerlessVectordbPlugin setup', () => {
  it('seeds Console with the vector search sample requests', () => {
    const setDefaultEditorContent = jest.fn();

    new ServerlessVectordbPlugin().setup(coreMock.createSetup(), {
      console: { setDefaultEditorContent },
    });

    expect(setDefaultEditorContent).toHaveBeenCalledWith(CONSOLE_DEFAULT_CONTENT);
  });

  it('does not fail when the console plugin is unavailable', () => {
    expect(() => new ServerlessVectordbPlugin().setup(coreMock.createSetup(), {})).not.toThrow();
  });
});
