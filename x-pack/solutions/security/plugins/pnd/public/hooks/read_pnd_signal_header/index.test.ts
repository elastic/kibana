/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER,
  PND_EXECUTION_CORRELATED_HEADER,
} from '../../../common/constants';
import { readPndSignalHeader } from '.';

const createResponse = (headers: Record<string, string>): Response =>
  ({ headers: new Headers(headers) } as Response);

describe('readPndSignalHeader', () => {
  it('reads `true`', () => {
    expect(
      readPndSignalHeader(
        createResponse({ [PND_EXECUTION_CORRELATED_HEADER]: 'true' }),
        PND_EXECUTION_CORRELATED_HEADER
      )
    ).toBe(true);
  });

  it('reads `false`, which is the whole reason the signal is a header', () => {
    expect(
      readPndSignalHeader(
        createResponse({ [PND_EXECUTION_CORRELATED_HEADER]: 'false' }),
        PND_EXECUTION_CORRELATED_HEADER
      )
    ).toBe(false);
  });

  it('is case-insensitive about the header name, as a real Response is', () => {
    expect(
      readPndSignalHeader(
        createResponse({ [PND_EXECUTION_CORRELATED_HEADER.toUpperCase()]: 'false' }),
        PND_EXECUTION_CORRELATED_HEADER
      )
    ).toBe(false);
  });

  it('stays undefined when the header is absent, rather than guessing', () => {
    expect(
      readPndSignalHeader(createResponse({}), PND_EXECUTION_CORRELATED_HEADER)
    ).toBeUndefined();
  });

  it('stays undefined for a value that is neither `true` nor `false`', () => {
    expect(
      readPndSignalHeader(
        createResponse({ [PND_EXECUTION_CORRELATED_HEADER]: 'maybe' }),
        PND_EXECUTION_CORRELATED_HEADER
      )
    ).toBeUndefined();
  });

  it('stays undefined when there is no response at all', () => {
    expect(readPndSignalHeader(undefined, PND_EXECUTION_CORRELATED_HEADER)).toBeUndefined();
  });

  it('reads whichever signal header it is asked for, so the two never drift apart', () => {
    expect(
      readPndSignalHeader(
        createResponse({
          [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true',
          [PND_EXECUTION_CORRELATED_HEADER]: 'false',
        }),
        PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER
      )
    ).toBe(true);
  });
});
