/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { Wrapper } from '../../shared/test_wrapper';
import { UnifiedHostPanel } from './unified_host_panel';
import type { HostPlatform } from './unified_host_panel';

jest.mock('../auto_detect', () => ({
  AutoDetectPanel: ({ suppressBreadcrumb }: { suppressBreadcrumb?: boolean }) => (
    <div
      data-test-subj="mockAutoDetectPanel"
      data-suppress-breadcrumb={String(Boolean(suppressBreadcrumb))}
    >
      AutoDetectPanel
    </div>
  ),
}));

jest.mock('../otel_logs', () => ({
  OtelLogsPanel: ({ lockedPlatform }: { lockedPlatform?: string }) => (
    <div data-test-subj="mockOtelLogsPanel" data-locked-platform={lockedPlatform ?? ''}>
      OtelLogsPanel
    </div>
  ),
}));

const renderPanel = (props: React.ComponentProps<typeof UnifiedHostPanel>) =>
  render(<UnifiedHostPanel {...props} />, { wrapper: Wrapper({ location: '/' }) });

describe('UnifiedHostPanel', () => {
  describe('on Linux', () => {
    it('renders the collector toggle and defaults to the Elastic Agent panel', () => {
      renderPanel({ platform: 'linux' });

      expect(screen.getByRole('group', { name: 'Select collection method' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Elastic Agent' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OpenTelemetry' })).toBeInTheDocument();

      const autoDetect = screen.getByTestId('mockAutoDetectPanel');
      expect(autoDetect).toBeInTheDocument();
      expect(autoDetect).toHaveAttribute('data-suppress-breadcrumb', 'true');
      expect(screen.queryByTestId('mockOtelLogsPanel')).not.toBeInTheDocument();
    });

    it('honors defaultCollector="otel" and passes lockedPlatform to OtelLogsPanel', () => {
      renderPanel({ platform: 'linux', defaultCollector: 'otel' });

      const otel = screen.getByTestId('mockOtelLogsPanel');
      expect(otel).toBeInTheDocument();
      expect(otel).toHaveAttribute('data-locked-platform', 'linux');
      expect(screen.queryByTestId('mockAutoDetectPanel')).not.toBeInTheDocument();
    });

    it('switches panels when the user toggles the collector', () => {
      renderPanel({ platform: 'linux' });

      expect(screen.getByTestId('mockAutoDetectPanel')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'OpenTelemetry' }));

      expect(screen.queryByTestId('mockAutoDetectPanel')).not.toBeInTheDocument();
      expect(screen.getByTestId('mockOtelLogsPanel')).toHaveAttribute(
        'data-locked-platform',
        'linux'
      );

      fireEvent.click(screen.getByRole('button', { name: 'Elastic Agent' }));

      expect(screen.getByTestId('mockAutoDetectPanel')).toBeInTheDocument();
      expect(screen.queryByTestId('mockOtelLogsPanel')).not.toBeInTheDocument();
    });
  });

  describe('on macOS', () => {
    it('renders the collector toggle and forwards "mac" as the locked platform to OTel', () => {
      renderPanel({ platform: 'mac', defaultCollector: 'otel' });

      expect(screen.getByRole('group', { name: 'Select collection method' })).toBeInTheDocument();
      expect(screen.getByTestId('mockOtelLogsPanel')).toHaveAttribute(
        'data-locked-platform',
        'mac'
      );
    });
  });

  describe('on Windows', () => {
    it('hides the collector toggle and renders only the OTel panel', () => {
      renderPanel({ platform: 'windows' });

      expect(
        screen.queryByRole('group', { name: 'Select collection method' })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Elastic Agent' })).not.toBeInTheDocument();

      expect(screen.getByTestId('mockOtelLogsPanel')).toHaveAttribute(
        'data-locked-platform',
        'windows'
      );
      expect(screen.queryByTestId('mockAutoDetectPanel')).not.toBeInTheDocument();
    });

    it('forces OTel even when defaultCollector="agent" is passed', () => {
      renderPanel({ platform: 'windows', defaultCollector: 'agent' });

      expect(screen.getByTestId('mockOtelLogsPanel')).toBeInTheDocument();
      expect(screen.queryByTestId('mockAutoDetectPanel')).not.toBeInTheDocument();
    });

    it('forces OTel when platform changes from a non-Windows platform to windows', () => {
      const { rerender } = render(<UnifiedHostPanel platform="linux" />, {
        wrapper: Wrapper({ location: '/' }),
      });

      expect(screen.getByTestId('mockAutoDetectPanel')).toBeInTheDocument();

      const rerenderWithPlatform = (platform: HostPlatform) =>
        rerender(<UnifiedHostPanel platform={platform} />);

      rerenderWithPlatform('windows');

      expect(screen.queryByTestId('mockAutoDetectPanel')).not.toBeInTheDocument();
      expect(screen.getByTestId('mockOtelLogsPanel')).toHaveAttribute(
        'data-locked-platform',
        'windows'
      );
      expect(
        screen.queryByRole('group', { name: 'Select collection method' })
      ).not.toBeInTheDocument();
    });
  });
});
