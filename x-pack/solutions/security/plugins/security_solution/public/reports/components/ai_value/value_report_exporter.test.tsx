/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ValueReportExporter } from './value_report_exporter';
import { useToasts } from '../../../common/lib/kibana';

// Mock dependencies
jest.mock('../../../common/lib/kibana', () => ({
  useToasts: jest.fn(),
}));

// Mock PDFDocument
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(() => ({
      addPage: jest.fn(() => ({
        drawImage: jest.fn(),
      })),
      embedPng: jest.fn(() => ({
        width: 800,
        height: 600,
      })),
      save: jest.fn(() => new Uint8Array([1, 2, 3])),
    })),
  },
}));

// Mock domtoimage
jest.mock('dom-to-image-more', () => ({
  toBlob: jest.fn(),
}));

const mockUseToasts = useToasts as jest.MockedFunction<typeof useToasts>;

describe('ValueReportExporter', () => {
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToasts.mockReturnValue({
      addError: mockAddError,
    } as unknown as ReturnType<typeof useToasts>);

    const { toBlob } = jest.requireMock('dom-to-image-more');
    toBlob.mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
  });

  it('renders children with export function', () => {
    const mockChildren = jest.fn(() => <div>{'Test Content'}</div>);

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
    const { toBlob } = jest.requireMock('dom-to-image-more');
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
    const mockChildren = jest.fn(() => <div>{'Test Content'}</div>);

    const { rerender } = render(<ValueReportExporter>{mockChildren}</ValueReportExporter>);
    const initialCallCount = mockChildren.mock.calls.length;
    rerender(<ValueReportExporter>{mockChildren}</ValueReportExporter>);
    expect(mockChildren.mock.calls.length).toBe(initialCallCount);
  });

  it('handles different children functions', () => {
    const differentChildren = jest.fn(() => <div>{'Different Content'}</div>);

    render(<ValueReportExporter>{differentChildren}</ValueReportExporter>);

    expect(differentChildren).toHaveBeenCalledWith(expect.any(Function));
  });
});
