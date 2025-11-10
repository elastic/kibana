/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import { productDocumentationTool } from './product_documentation_tool';

describe('productDocumentationTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a tool definition with correct properties', () => {
    const tool = productDocumentationTool();

    expect(tool.id).toBe('core.security.product_documentation');
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.schema).toBeDefined();
  });
});
