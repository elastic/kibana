/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpStart,
  DocLinksStart,
  IUiSettingsClient,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../plugin';

interface UxKibanaServices extends ApmPluginStartDeps {
  http: HttpStart;
  docLinks: DocLinksStart;
  uiSettings: IUiSettingsClient;
  application: ApplicationStart;
  notifications: NotificationsStart;
  rendering: RenderingService;
}

export function useKibanaServices() {
  return useKibana<UxKibanaServices>().services;
}
