/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badImplementation, badRequest, forbidden } from '@hapi/boom';
import { UnknownSourceSlugError } from '../../utils/resolve_source_slugs';
import { formatSourceToolError } from './source_tool_error';

describe('formatSourceToolError', () => {
  it('relays 4xx Boom messages verbatim and classifies everything else', () => {
    // `classifyError` alone would rewrite a 403 into an index privileges message.
    expect(formatSourceToolError(forbidden('Managing significant events requires manage'))).toBe(
      'Managing significant events requires manage'
    );
    expect(formatSourceToolError(badRequest('Unknown column [foo]'))).toBe('Unknown column [foo]');

    expect(formatSourceToolError(new UnknownSourceSlugError(['checkout']))).toBe(
      'Source not found in this space: checkout'
    );
    expect(formatSourceToolError(badImplementation('boom'))).toBe('Unexpected error: boom');
  });
});
