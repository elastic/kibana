/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripKindTitlePrefix } from '.';

describe('stripKindTitlePrefix', () => {
  it('strips an [Investigation] prefix so PND surfaces never show the Agent Builder tag', () => {
    expect(stripKindTitlePrefix('[Investigation] Suspicious PowerShell on host-1')).toEqual(
      'Suspicious PowerShell on host-1'
    );
  });

  it('strips an [Incident] prefix', () => {
    expect(stripKindTitlePrefix('[Incident] Credential dumping on host-1')).toEqual(
      'Credential dumping on host-1'
    );
  });

  it('leaves a title that was never tagged', () => {
    expect(stripKindTitlePrefix('Suspicious PowerShell on host-1')).toEqual(
      'Suspicious PowerShell on host-1'
    );
  });

  it('does not strip [Tuning] — that tag was retired and is not an Agent Builder prefix', () => {
    expect(stripKindTitlePrefix('[Tuning] Suspicious PowerShell on host-1')).toEqual(
      '[Tuning] Suspicious PowerShell on host-1'
    );
  });

  it('does not strip a thread decision title', () => {
    expect(stripKindTitlePrefix('Decision on opening an investigation: Lateral movement')).toEqual(
      'Decision on opening an investigation: Lateral movement'
    );
  });

  it('strips only a leading tag, not the same words later in the title', () => {
    expect(stripKindTitlePrefix('[Investigation] Review of the Investigation notes')).toEqual(
      'Review of the Investigation notes'
    );
  });
});
