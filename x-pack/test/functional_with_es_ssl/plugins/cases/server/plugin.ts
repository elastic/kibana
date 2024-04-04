/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesServerSetup } from '@kbn/cases-plugin/server/types';
import { Plugin, CoreSetup } from '@kbn/core/server';
import { getExternalReferenceAttachment } from './attachments/external_reference';
import { getPersistableStateAttachmentServer } from './attachments/persistable_state';

export interface CasesExamplePublicSetupDeps {
  cases: CasesServerSetup;
}

export class CasesFixturePlugin implements Plugin<void, void, CasesExamplePublicSetupDeps> {
  public setup(core: CoreSetup, { cases }: CasesExamplePublicSetupDeps) {
    cases.attachmentFramework.registerExternalReference(getExternalReferenceAttachment());
    cases.attachmentFramework.registerPersistableState(getPersistableStateAttachmentServer());
  }

  public start() {}
  public stop() {}
}
