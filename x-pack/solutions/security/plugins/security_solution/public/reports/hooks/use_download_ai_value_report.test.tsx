/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { noop } from 'lodash';
import { useKibana } from '../../common/lib/kibana';
import { useAIValueExportContext } from '../providers/ai_value/export_provider';
import { useDownloadAIValueReport } from './use_download_ai_value_report';

jest.mock('../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
const useKibanaMock = useKibana as jest.Mock;

jest.mock('../providers/ai_value/export_provider', () => ({ useAIValueExportContext: jest.fn() }));
const useAIValueExportContextMock = useAIValueExportContext as jest.Mock;

const shareServiceMock = {
  toggleShareContextMenu: jest.fn(),
};

const buildForwardedStateMock = jest.fn();

const anchorElementMock = { someAnchorElementProp: 'baz' } as unknown as HTMLElement;

const timeRange = {
  to: '2025-11-18T13:18:59.691Z',
  from: '2025-10-18T12:18:59.691Z',
};

const mockKibana = (share: typeof shareServiceMock | undefined, serverless: boolean) =>
  useKibanaMock.mockReturnValue({
    services: {
      share,
      serverless,
    },
  });

type HookResult = ReturnType<typeof useDownloadAIValueReport>;
const TestComponent = ({
  anchorElement,
  hookValueFn,
}: {
  anchorElement: HTMLElement | null;
  hookValueFn: (value: HookResult) => void;
}) => {
  const hookValue = useDownloadAIValueReport({
    anchorElement,
    timeRange,
  });

  hookValueFn(hookValue);
  return <></>;
};

describe('useDownloadAIValueReport', () => {
  beforeEach(() => {
    // We set all the conditions so that the report is enabled.
    // Then we toggle each condition off in the subsequent describe statements as needed
    mockKibana(shareServiceMock, false);

    useAIValueExportContextMock.mockReturnValue({
      buildForwardedState: buildForwardedStateMock,
    });
  });
  let hookResult: HookResult = { isExportEnabled: true, toggleContextMenu: noop };
  const callHook = (anchorElement: HTMLElement | null) => {
    render(
      <TestComponent
        anchorElement={anchorElement}
        hookValueFn={(value) => {
          hookResult = value;
        }}
      />
    );
  };
  describe('when it is used in serverless', () => {
    beforeEach(() => {
      mockKibana(shareServiceMock, true);
      callHook(anchorElementMock);
    });
    it('should set isExportEnabled to false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });

    it('should not call shareService.toggleShareContextMenu', () => {
      hookResult.toggleContextMenu();
      expect(shareServiceMock.toggleShareContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('when the anchor element is null', () => {
    beforeEach(() => {
      callHook(null);
    });
    it('should set isExportEnabled to false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });

    it('should not call shareService.toggleShareContextMenu', () => {
      hookResult.toggleContextMenu();
      expect(shareServiceMock.toggleShareContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('when the there is not a forwardedState', () => {
    beforeEach(() => {
      useAIValueExportContextMock.mockResolvedValue({});
      callHook(anchorElementMock);
    });

    it('should set isExportEnabled to false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });
    it('should not call shareService.toggleShareContextMenu', () => {
      hookResult.toggleContextMenu();
      expect(shareServiceMock.toggleShareContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('when the shareService is not available', () => {
    beforeEach(() => {
      mockKibana(undefined, false);
      callHook(anchorElementMock);
    });
    it('should set isExportEnabled to false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });
  });

  describe('when the export is enabled', () => {
    const forwardedState = { timeRange };
    beforeEach(() => {
      buildForwardedStateMock.mockReturnValue(forwardedState);
      callHook(anchorElementMock);
    });
    it('should set isExportEnabled to true', () => {
      expect(hookResult.isExportEnabled).toBe(true);
    });

    it('should call shareService.toggleShareContextMenu with the right parameters', () => {
      hookResult.toggleContextMenu();
      expect(shareServiceMock.toggleShareContextMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          allowShortUrl: false,
          anchorElement: anchorElementMock,
          asExport: true,
          isDirty: false,
          objectType: 'ai_value_report',
          objectTypeMeta: {
            config: {
              integration: {
                export: {
                  pdfReports: {},
                },
              },
            },
            title: 'Download this report',
          },
          sharingData: {
            locatorParams: {
              id: 'AI_VALUE_REPORT_LOCATOR',
              params: forwardedState,
            },
            title: 'AI Value Report',
          },
        })
      );
    });
  });
});
