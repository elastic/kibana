/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { KubernetesAssetImage } from './kubernetes_asset_image';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: jest.fn(),
  };
});

jest.mock('../../images/kubernetes_dashboards/ecs_light.svg', () => 'ecs-light-mock.svg', {
  virtual: true,
});
jest.mock('../../images/kubernetes_dashboards/ecs_dark.svg', () => 'ecs-dark-mock.svg', {
  virtual: true,
});
jest.mock('../../images/kubernetes_dashboards/semconv_light.svg', () => 'semconv-light-mock.svg', {
  virtual: true,
});
jest.mock('../../images/kubernetes_dashboards/semconv_dark.svg', () => 'semconv-dark-mock.svg', {
  virtual: true,
});

const useEuiThemeMock = useEuiTheme as jest.MockedFunction<typeof useEuiTheme>;

describe('KubernetesAssetImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    it('defaults to ecs type when no type is provided', async () => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'LIGHT',
      } as ReturnType<typeof useEuiTheme>);

      await act(async () => {
        render(<KubernetesAssetImage />);
      });

      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', 'ECS Kubernetes Dashboard image');
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
