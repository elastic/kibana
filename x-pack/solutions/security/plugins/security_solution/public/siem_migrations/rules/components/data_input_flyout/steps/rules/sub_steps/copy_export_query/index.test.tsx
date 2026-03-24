/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCopyExportQueryStep } from '.';
import type { CopyExportQueryStepProps } from '.';
import { TestProviders } from '../../../../../../../../common/mock';
import { MigrationSource } from '../../../../../../../common/types';

const renderCopyExportQueryStep = (props: CopyExportQueryStepProps) => {
  const { result } = renderHook(() => useCopyExportQueryStep(props), {
    wrapper: TestProviders,
  });
  return result;
};

describe('useCopyExportQueryStep', () => {
  const title = 'Export rules';
  it('returns step props with "incomplete" status', () => {
    const result = renderCopyExportQueryStep({
      migrationSource: MigrationSource.SPLUNK,
      status: 'incomplete',
      onCopied: jest.fn(),
    });
    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'incomplete',
      title,
    });
  });

  it('returns step props with "complete" status', () => {
    const result = renderCopyExportQueryStep({
      migrationSource: MigrationSource.SPLUNK,
      status: 'complete',
      onCopied: jest.fn(),
    });
    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'complete',
      title,
    });
  });

  it('returns step props with "disabled" status', () => {
    const result = renderCopyExportQueryStep({
      migrationSource: MigrationSource.SPLUNK,
      status: 'disabled',
      onCopied: jest.fn(),
    });
    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'disabled',
      title,
    });
  });

  it('returns step props with "loading" status', () => {
    const result = renderCopyExportQueryStep({
      migrationSource: MigrationSource.SPLUNK,
      status: 'loading',
      onCopied: jest.fn(),
    });
    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'loading',
      title,
    });
  });

  it('returns step props with "warning" status', () => {
    const result = renderCopyExportQueryStep({
      migrationSource: MigrationSource.SPLUNK,
      status: 'warning',
      onCopied: jest.fn(),
    });
    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'warning',
      title,
    });
  });

  it('returns step props with "danger" status', () => {
    const result = renderCopyExportQueryStep({
      migrationSource: MigrationSource.SPLUNK,
      status: 'danger',
      onCopied: jest.fn(),
    });
    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'danger',
      title,
    });
  });

  it('returns step props with "current" status', () => {
    const result = renderCopyExportQueryStep({
      migrationSource: MigrationSource.SPLUNK,
      status: 'current',
      onCopied: jest.fn(),
    });
    expect(result.current).toEqual({
      children: expect.anything(),
      status: 'current',
      title,
    });
  });
});
