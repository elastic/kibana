/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ComponentType } from 'react';
import type { AppMenuConfig } from '@kbn/app-menu';
import type { ConsoleProps } from '../../types';

export interface ConsoleRegistrationInterface<TMeta extends object = any> {
  id: string;
  consoleProps: ConsoleProps;
  /**
   * Any additional metadata about the console. Helpful for when consuming Registered consoles
   * (ex. could hold the details data for the Host that the console is opened against)
   */
  meta?: TMeta;

  /**
   * The title rendered in the console overlay's app header. Must be a plain string - the header
   * is a declarative `AppHeaderView`, not an arbitrary render target.
   */
  pageTitle?: string;

  /**
   * An optional component that will be rendered in the Responder page overlay, above the Console area
   */
  PageBodyComponent?: ComponentType<ManagedConsoleExtensionComponentProps<TMeta>>;

  /**
   * An optional component that contributes to the console overlay header's app menu (ex. the
   * "Response actions history" action). The component does not render its own trigger button -
   * the overlay's header renders that declaratively from the `AppMenuConfig` reported through
   * `onMenuChange`. The component is only responsible for any UI it needs beyond the trigger
   * itself (ex. a flyout opened by the action's `run` handler).
   *
   * NOTE: this is a `Component` - not `JSX`. It will be initialized/rendered when the Responder
   * page overlay is shown.
   */
  HeaderActionsComponent?: ComponentType<ManagedConsoleHeaderActionsComponentProps<TMeta>>;
}

/**
 * The Props that are provided to the component constructors provided in `ConsoleRegistrationInterface`
 */
export interface ManagedConsoleExtensionComponentProps<TMeta extends object = any> {
  meta: { [key in keyof TMeta]: TMeta[key] };
}

/**
 * The Props provided to `ConsoleRegistrationInterface['HeaderActionsComponent']`
 */
export interface ManagedConsoleHeaderActionsComponentProps<TMeta extends object = any>
  extends ManagedConsoleExtensionComponentProps<TMeta> {
  /** Reports the app menu config the overlay header should render (`undefined` clears it) */
  onMenuChange: (menu: AppMenuConfig | undefined) => void;
}

export interface RegisteredConsoleClient<TMeta extends object = any>
  extends Pick<ConsoleRegistrationInterface<TMeta>, 'id' | 'meta'> {
  show(): void;

  hide(): void;

  terminate(): void;

  isVisible(): boolean;
}

export interface ConsoleManagerClient {
  /** Registers a new console */
  register<TMeta extends object = any>(
    console: ConsoleRegistrationInterface<TMeta>
  ): Readonly<RegisteredConsoleClient>;

  /** Opens console in a dialog */
  show(id: string): void;

  /** Hides the console (minimize) */
  hide(id: string): void;

  /** Removes the console from management and calls `onBeforeClose` if one was defined */
  terminate(id: string): void;

  /** Retrieve a running console */
  getOne<Meta extends object = Record<string, unknown>>(
    id: string
  ): Readonly<RegisteredConsoleClient<Meta>> | undefined;

  /** Get a list of running consoles */
  getList<Meta extends object = Record<string, unknown>>(): ReadonlyArray<
    Readonly<RegisteredConsoleClient<Meta>>
  >;
}
