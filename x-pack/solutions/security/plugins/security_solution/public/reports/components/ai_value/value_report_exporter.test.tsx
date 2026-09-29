/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { ValueReportExporter } from './value_report_exporter';
import { useToasts } from '../../../common/lib/kibana';

// Mock dependencies
vi.mock('../../../common/lib/kibana', () => {
  const mocked = {
    useToasts: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

// Mock PDFDocument
vi.mock('pdf-lib', () => {
  const mocked = {
    PDFDocument: {
      create: vi.fn(() => ({
        addPage: vi.fn(() => ({
          drawImage: vi.fn(),
        })),
        embedPng: vi.fn(() => ({
          width: 800,
          height: 600,
        })),
        save: vi.fn(() => new Uint8Array([1, 2, 3])),
      })),
    },
  };
  return { ...mocked, default: mocked };
});

// Mock domtoimage
vi.mock('dom-to-image-more', () => {
  const mocked = {
    toBlob: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseToasts = useToasts as MockedFunction<typeof useToasts>;

describe('ValueReportExporter', () => {
  const mockAddError = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseToasts.mockReturnValue({
      addError: mockAddError,
    } as unknown as ReturnType<typeof useToasts>);

    const { toBlob } = await vi.importMock('dom-to-image-more');
    toBlob.mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
  });

  it('renders children with export function', () => {
    const mockChildren = vi.fn(() => <div>{'Test Content'}</div>);

    render(<ValueReportExporter>{mockChildren}</ValueReportExporter>);

    expect(mockChildren).toHaveBeenCalledWith(expect.any(Function));
  });

  it('provides export function to children', () => {
    let exportFunction: (() => void) | null = null;

    const children = (exportPDF: () => void) => {
      exportFunction = exportPDF;
      return <div>{'Test Content'}</div>;
    };

    render(<ValueReportExporter>{children}</ValueReportExporter>);

    expect(exportFunction).toBeDefined();
    expect(exportFunction).toEqual(expect.any(Function));
  });

  it('handles export error gracefully', async () => {
    const { toBlob } = await vi.importMock('dom-to-image-more');
    toBlob.mockRejectedValue(new Error('Export failed'));

    let exportFunction: (() => void) | null = null;

    const children = (exportPDF: () => void) => {
      exportFunction = exportPDF;
      return <div>{'Test Content'}</div>;
    };

    render(<ValueReportExporter>{children}</ValueReportExporter>);

    expect(exportFunction).toBeDefined();

    expect(() => {
      if (exportFunction) {
        exportFunction();
      }
    }).not.toThrow();
  });

  it('memoizes the component correctly', () => {
    const mockChildren = vi.fn(() => <div>{'Test Content'}</div>);

    const { rerender } = render(<ValueReportExporter>{mockChildren}</ValueReportExporter>);
    const initialCallCount = mockChildren.mock.calls.length;
    rerender(<ValueReportExporter>{mockChildren}</ValueReportExporter>);
    expect(mockChildren.mock.calls.length).toBe(initialCallCount);
  });

  it('handles different children functions', () => {
    const differentChildren = vi.fn(() => <div>{'Different Content'}</div>);

    render(<ValueReportExporter>{differentChildren}</ValueReportExporter>);

    expect(differentChildren).toHaveBeenCalledWith(expect.any(Function));
  });
});
