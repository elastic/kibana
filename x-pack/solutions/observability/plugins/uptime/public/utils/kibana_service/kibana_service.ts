/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { ClientPluginsStart } from '../../plugin';
import { apiService } from '../api_service/api_service';

class KibanaService {
  private static instance: KibanaService;
  private _core!: CoreStart;
  private _startPlugins!: ClientPluginsStart;
  private _theme!: Observable<CoreTheme>;

  public get core() {
    return this._core;
  }

  public set core(coreStart: CoreStart) {
    this._core = coreStart;
    apiService.http = this._core.http;
  }

  public get startPlugins() {
    return this._startPlugins;
  }

  public set startPlugins(startPlugins: ClientPluginsStart) {
    this._startPlugins = startPlugins;
  }

  public get theme() {
    return this._theme;
  }

  public set theme(coreTheme: Observable<CoreTheme>) {
    this._theme = coreTheme;
  }

  public get toasts() {
    return this._core.notifications.toasts;
  }

  private constructor() {}

  static getInstance(): KibanaService {
    if (!KibanaService.instance) {
      KibanaService.instance = new KibanaService();
    }

    return KibanaService.instance;
  }
}

export const kibanaService = KibanaService.getInstance();
