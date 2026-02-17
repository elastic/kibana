/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CpuProfilingPrompt } from './cpu_profiling_prompt';
import { useProfilingPluginSetting } from '../../../../../hooks/use_profiling_integration_setting';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeProvider } from '@emotion/react';

jest.mock('../../../../../hooks/use_profiling_integration_setting');
jest.mock('../../../hooks/use_tab_switcher');

const useProfilingPluginSettingMock = useProfilingPluginSetting as jest.MockedFunction<
  typeof useProfilingPluginSetting
>;
const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;

const mockUseProfilingPluginSetting = (enabled: boolean) => {
  useProfilingPluginSettingMock.mockReturnValue(enabled);
};

const mockUseTabSwitcherContext = (showTabFn: jest.Mock = jest.fn()) => {
  useTabSwitcherContextMock.mockReturnValue({
    showTab: showTabFn,
    isActiveTab: jest.fn(),
    activeTabId: 'overview',
  } as unknown as ReturnType<typeof useTabSwitcherContext>);
};

const renderCpuProfilingPrompt = () =>
  render(
    <I18nProvider>
      <ThemeProvider theme={{}}>
        <CpuProfilingPrompt />
      </ThemeProvider>
    </I18nProvider>
  );

describe('CpuProfilingPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when profiling plugin is enabled', () => {
    mockUseProfilingPluginSetting(true);
    mockUseTabSwitcherContext();

    renderCpuProfilingPrompt();

    expect(screen.getByTestId('infraAssetDetailsCPUProfilingPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('infraCpuProfilingPromptProfilingButton')).toBeInTheDocument();
  });

  it('should not render when profiling plugin is disabled', () => {
    mockUseProfilingPluginSetting(false);
    mockUseTabSwitcherContext();

    const { container } = renderCpuProfilingPrompt();

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('infraAssetDetailsCPUProfilingPrompt')).not.toBeInTheDocument();
  });

  it('should call showTab with profiling tab when button is clicked', async () => {
    const showTabMock = jest.fn();
    mockUseProfilingPluginSetting(true);
    mockUseTabSwitcherContext(showTabMock);

    renderCpuProfilingPrompt();

    const button = screen.getByTestId('infraCpuProfilingPromptProfilingButton');
    await userEvent.click(button);

    expect(showTabMock).toHaveBeenCalledWith('profiling');
    expect(showTabMock).toHaveBeenCalledTimes(1);
  });

  it('should render correct test subjects', () => {
    mockUseProfilingPluginSetting(true);
    mockUseTabSwitcherContext();

    renderCpuProfilingPrompt();

    expect(screen.getByTestId('infraAssetDetailsCPUProfilingPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('infraCpuProfilingPromptProfilingButton')).toBeInTheDocument();
  });
});
