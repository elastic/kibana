/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { generateAttachmentType } from './modules/cases/utils/attachments';
import { routes } from './routes';
import type { SetupPlugins } from './types';

export class ThreatIntelligence {
  public async setup(_core: CoreSetup, plugins: SetupPlugins) {
    const externalAttachmentType: ExternalReferenceAttachmentType = generateAttachmentType();
    plugins.cases.attachmentFramework.registerExternalReference(externalAttachmentType);

    return {};
  }

  public start() {
    return {
      routes,
    };
  }

  public stop() {}
}
