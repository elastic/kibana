/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { UseReportHuntLibraryOpenedParams } from './use_report_hunt_library_opened';
import { useReportHuntLibraryOpened } from './use_report_hunt_library_opened';

const setup = (initialProps: UseReportHuntLibraryOpenedParams) => {
  const core = coreMock.createStart();
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <React.StrictMode>
      <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
    </React.StrictMode>
  );
  const hook = renderHook(
    (props: UseReportHuntLibraryOpenedParams) => useReportHuntLibraryOpened(props),
    { initialProps, wrapper }
  );
  return { ...hook, reportEvent: core.analytics.reportEvent as jest.Mock };
};

describe('useReportHuntLibraryOpened', () => {
  it('waits for the hunt list, then reports its counts once', () => {
    const { reportEvent, rerender } = setup({ huntCount: undefined, availableHuntCount: 0 });
    expect(reportEvent).not.toHaveBeenCalled();

    rerender({ huntCount: 8, availableHuntCount: 6 });
    rerender({ huntCount: 8, availableHuntCount: 5 });

    expect(reportEvent.mock.calls).toEqual([
      ['alertzero_ui_hunt_library_opened', { hunt_count: 8, available_hunt_count: 6 }],
    ]);
  });
});
