/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { KubernetesAssetImage } from './kubernetes_asset_image';

vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: vi.fn(),
  };
});

vi.mock('../../images/kubernetes_dashboards/ecs_light.svg', () => ({
  default: 'ecs-light-mock.svg',
}));
vi.mock('../../images/kubernetes_dashboards/ecs_dark.svg', () => ({
  default: 'ecs-dark-mock.svg',
}));
vi.mock('../../images/kubernetes_dashboards/semconv_light.svg', () => ({
  default: 'semconv-light-mock.svg',
}));
vi.mock('../../images/kubernetes_dashboards/semconv_dark.svg', () => ({
  default: 'semconv-dark-mock.svg',
}));

const useEuiThemeMock = useEuiTheme as MockedFunction<typeof useEuiTheme>;

describe('KubernetesAssetImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ECS type', () => {
    it('renders light image when theme is LIGHT', async () => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'LIGHT',
      } as ReturnType<typeof useEuiTheme>);

      await act(async () => {
        render(<KubernetesAssetImage type="ecs" />);
      });

      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'ECS Kubernetes Dashboard image');
      });
    });

    it('renders dark image when theme is DARK', async () => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'DARK',
      } as ReturnType<typeof useEuiTheme>);

      await act(async () => {
        render(<KubernetesAssetImage type="ecs" />);
      });

      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'ECS Kubernetes Dashboard image');
      });
    });
  });

  describe('Semconv type', () => {
    it('renders light image when theme is LIGHT', async () => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'LIGHT',
      } as ReturnType<typeof useEuiTheme>);

      await act(async () => {
        render(<KubernetesAssetImage type="semconv" />);
      });

      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'OpenTelemetry Kubernetes Dashboard image');
      });
    });

    it('renders dark image when theme is DARK', async () => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'DARK',
      } as ReturnType<typeof useEuiTheme>);

      await act(async () => {
        render(<KubernetesAssetImage type="semconv" />);
      });

      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'OpenTelemetry Kubernetes Dashboard image');
      });
    });
  });

  describe('default type', () => {
    it('defaults to semconv type when no type is provided', async () => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'LIGHT',
      } as ReturnType<typeof useEuiTheme>);

      await act(async () => {
        render(<KubernetesAssetImage />);
      });

      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'OpenTelemetry Kubernetes Dashboard image');
      });
    });
  });

  it('returns null while image is loading', async () => {
    useEuiThemeMock.mockReturnValue({
      colorMode: 'LIGHT',
    } as ReturnType<typeof useEuiTheme>);

    let container: HTMLElement;
    await act(async () => {
      const result = render(<KubernetesAssetImage type="ecs" />);
      container = result.container;
      // Check immediately after render, before the promise resolves
      expect(container.querySelector('img')).toBeNull();
    });
  });
});
