/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import { CasesUiSetup } from '@kbn/cases-plugin/public/types';
import { getExternalReferenceAttachmentRegular } from './attachments/external_reference';

export type Setup = void;
export type Start = void;

export interface CasesExamplePublicSetupDeps {
  cases: CasesUiSetup;
}

export class CasesFixturePlugin implements Plugin<Setup, Start, CasesExamplePublicSetupDeps> {
  public setup(core: CoreSetup, { cases }: CasesExamplePublicSetupDeps) {
    cases.attachmentFramework.registerExternalReference(getExternalReferenceAttachmentRegular());
  }

  public start() {}
  public stop() {}
}
