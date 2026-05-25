/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Process } from '@kbn/session-view-plugin/common';
import type { CustomProcess } from '../../../../../flyout/document_details/session_view/context';
import { isCustomProcess, isProcess } from './helpers';

const createProcess = (): Process =>
  ({
    getAlerts: jest.fn(),
  } as unknown as Process);

const createCustomProcess = (): CustomProcess =>
  ({
    id: 'custom-process-id',
    details: {},
    endTime: '2023-01-01T00:00:00.000Z',
  } as CustomProcess);

describe('isProcess', () => {
  it('returns true when the value is a Process', () => {
    expect(isProcess(createProcess())).toBe(true);
  });

  it('returns false when the value is a CustomProcess', () => {
    expect(isProcess(createCustomProcess())).toBe(false);
  });

  it('returns false when the value is null', () => {
    expect(isProcess(null)).toBe(false);
  });
});

describe('isCustomProcess', () => {
  it('returns true when the value is a CustomProcess', () => {
    expect(isCustomProcess(createCustomProcess())).toBe(true);
  });

  it('returns false when the value is a Process', () => {
    expect(isCustomProcess(createProcess())).toBe(false);
  });

  it('returns false when the value is null', () => {
    expect(isCustomProcess(null)).toBe(false);
  });
});
