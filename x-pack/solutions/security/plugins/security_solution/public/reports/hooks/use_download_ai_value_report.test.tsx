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
import type { TimeRange } from '../../common/store/inputs/model';

jest.mock('../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
const useKibanaMock = useKibana as jest.Mock;

jest.mock('../providers/ai_value/export_provider', () => ({ useAIValueExportContext: jest.fn() }));
const useAIValueExportContextMock = useAIValueExportContext as jest.Mock;

const shareServiceMock = {
  toggleShareContextMenu: jest.fn(),
};

const buildForwardedStateMock = jest.fn();

const anchorElementMock = { someAnchorElementProp: 'baz' } as unknown as HTMLElement;

const absoluteTimeRange: TimeRange = {
  kind: 'absolute',
  to: '2025-11-18T13:18:59.691Z',
  from: '2025-10-18T12:18:59.691Z',
};

const reportTitle = 'Elastic AI value report dude!';

const mockKibana = (share: typeof shareServiceMock | undefined, serverless: boolean) =>
  useKibanaMock.mockReturnValue({
    services: {
      share,
      serverless,
      uiSettings: {
        get: jest.fn(() => reportTitle),
      },
    },
  });

type HookResult = ReturnType<typeof useDownloadAIValueReport>;
const TestComponent = ({
  anchorElement,
  timeRange,
  hookValueFn,
}: {
  anchorElement: HTMLElement | null;
  timeRange: TimeRange;
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
    jest.resetAllMocks();

    // We set all the conditions so that the report is enabled.
    // Then we toggle each condition off in the subsequent describe statements as needed
    mockKibana(shareServiceMock, false);

    useAIValueExportContextMock.mockReturnValue({
      buildForwardedState: buildForwardedStateMock,
    });
  });
  let hookResult: HookResult = { isExportEnabled: true, toggleContextMenu: noop };
  const callHook = (anchorElement: HTMLElement | null, timeRange: TimeRange) => {
    render(
      <TestComponent
        anchorElement={anchorElement}
        timeRange={timeRange}
        hookValueFn={(value) => {
          hookResult = value;
        }}
      />
    );
  };
  describe('when it is used in serverless', () => {
    beforeEach(() => {
      mockKibana(shareServiceMock, true);
      callHook(anchorElementMock, absoluteTimeRange);
    });
    it('returns isExportEnabled false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });

    it('returns a noop toggleContextMenu', () => {
      hookResult.toggleContextMenu();
      expect(shareServiceMock.toggleShareContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('when the anchor element is null', () => {
    beforeEach(() => {
      callHook(null, absoluteTimeRange);
    });
    it('returns isExportEnabled false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });

    it('returns a noop toggleContextMenu', () => {
      hookResult.toggleContextMenu();
      expect(shareServiceMock.toggleShareContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('when the there is not a forwardedState', () => {
    beforeEach(() => {
      useAIValueExportContextMock.mockReturnValue({});
      callHook(anchorElementMock, absoluteTimeRange);
    });

    it('returns isExportEnabled false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });
    it('returns a noop toggleContextMenu', () => {
      hookResult.toggleContextMenu();
      expect(shareServiceMock.toggleShareContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('when the shareService is not available', () => {
    beforeEach(() => {
      mockKibana(undefined, false);
      callHook(anchorElementMock, absoluteTimeRange);
    });
    it('returns isExportEnabled false', () => {
      expect(hookResult.isExportEnabled).toBe(false);
    });
  });

  describe('when the export is enabled', () => {
    beforeEach(() => {
      buildForwardedStateMock.mockImplementation(({ timeRange }: { timeRange: unknown }) => ({
        timeRange,
        insight: 'insight',
        reportDataHash: 'hash',
      }));
      callHook(anchorElementMock, absoluteTimeRange);
    });
    it('returns isExportEnabled true', () => {
      expect(hookResult.isExportEnabled).toBe(true);
    });

    it('returns absolute timeRange values in locator params', () => {
      hookResult.toggleContextMenu();
      expect(
        shareServiceMock.toggleShareContextMenu.mock.calls[0][0].sharingData.locatorParams.params
          .timeRange.from
      ).toBe(absoluteTimeRange.from);
    });
  });

  describe('when scheduling with a relative time range', () => {
    const relativeTimeRange: TimeRange = {
      kind: 'relative',
      fromStr: 'now-7d',
      toStr: 'now',
      // resolved values are irrelevant for scheduling; included to satisfy the TimeRange shape
      from: '2025-12-12T00:00:00.000Z',
      to: '2025-12-19T00:00:00.000Z',
    };

    beforeEach(() => {
      buildForwardedStateMock.mockImplementation(({ timeRange }: { timeRange: unknown }) => ({
        timeRange,
        insight: 'insight',
        reportDataHash: 'hash',
      }));
      callHook(anchorElementMock, relativeTimeRange);
    });

    it('returns relative timeRange values in locator params', () => {
      hookResult.toggleContextMenu();
      expect(
        shareServiceMock.toggleShareContextMenu.mock.calls[0][0].sharingData.locatorParams.params
          .timeRange.fromStr
      ).toBe('now-7d');
    });
  });
});
