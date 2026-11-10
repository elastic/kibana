/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSecurityJobs } from './hooks/use_security_jobs';
import { MlSettingsFlyout } from './ml_settings_flyout';

jest.mock('./hooks/use_security_jobs', () => ({
  useSecurityJobs: jest.fn(),
}));

jest.mock('./ml_job_settings_content', () => ({
  MlJobSettingsContent: () => <div data-test-subj="ml-job-settings-content" />,
}));

jest.mock('./upgrade_contents', () => ({
  UpgradeContents: ({ popover = true }: { popover?: boolean }) => (
    <div data-test-subj="ml-popover-upgrade-contents" data-popover={String(popover)} />
  ),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFlyout: ({
      children,
      focusTrapProps,
    }: {
      children: React.ReactNode;
      focusTrapProps?: { returnFocus?: boolean };
    }) => (
      <div
        data-test-subj="ml-settings-flyout"
        data-return-focus={String(focusTrapProps?.returnFocus)}
      >
        {children}
      </div>
    ),
  };
});

const mockUseSecurityJobs = useSecurityJobs as jest.Mock;

describe('MlSettingsFlyout', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refetches jobs on open when the user is licensed', () => {
    mockUseSecurityJobs.mockReturnValue({ isLicensed: true, refetch });

    render(<MlSettingsFlyout onClose={jest.fn()} />);

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ml-job-settings-content')).toBeInTheDocument();
    expect(screen.getByTestId('ml-settings-flyout')).toHaveAttribute('data-return-focus', 'false');
  });

  it('skips the jobs refetch when the user is unlicensed', () => {
    mockUseSecurityJobs.mockReturnValue({ isLicensed: false, refetch });

    render(<MlSettingsFlyout onClose={jest.fn()} />);

    expect(refetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('ml-popover-upgrade-contents')).toHaveAttribute(
      'data-popover',
      'false'
    );
  });
});
