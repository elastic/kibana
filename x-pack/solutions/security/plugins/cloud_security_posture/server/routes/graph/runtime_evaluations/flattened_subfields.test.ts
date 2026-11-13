/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FLATTENED_SUBFIELD_READS,
  isFlattenedRootAmbiguityError,
  withoutFieldExtract,
} from './flattened_subfields';
import { buildIntegrationRuntimeEvals } from './enrichment_query';

const ambiguityMessage = (field: string): string =>
  `verification_exception: Found 1 problem\nline 207:133: Cannot use field [${field}] due to ambiguities being mapped as [2] incompatible types: [flattened] in [index-a], [object] in [index-b]`;

describe('withoutFieldExtract', () => {
  it.each(FLATTENED_SUBFIELD_READS)(
    'replaces the COALESCE read of $dottedPath with the dotted path',
    ({ root, dottedPath, key }) => {
      const read = `COALESCE(${dottedPath}, FIELD_EXTRACT(${root}, "${key}"))`;
      expect(withoutFieldExtract(`x IS NOT NULL AND ${read} IS NOT NULL, ${read}`)).toBe(
        `x IS NOT NULL AND ${dottedPath} IS NOT NULL, ${dottedPath}`
      );
    }
  );

  it('leaves no FIELD_EXTRACT in the integration evaluations', () => {
    const query = buildIntegrationRuntimeEvals({
      integrations: ['m365_defender', 'snyk', 'greenhouse', 'cisco_meraki'],
    });
    expect(query).toContain('FIELD_EXTRACT(');
    expect(withoutFieldExtract(query)).not.toContain('FIELD_EXTRACT(');
  });
});

describe('isFlattenedRootAmbiguityError', () => {
  it('matches an ambiguity error on a flattened root', () => {
    expect(
      isFlattenedRootAmbiguityError(
        new Error(ambiguityMessage('m365_defender.event.additional_fields'))
      )
    ).toBe(true);
  });

  it('matches a root that is quoted with backticks in the query', () => {
    expect(
      isFlattenedRootAmbiguityError(new Error(ambiguityMessage('cisco_meraki.8021x_eap_success')))
    ).toBe(true);
  });

  it('matches when the flattened root is one of several problems', () => {
    const message = `${ambiguityMessage(
      'user.id'
    )}\nline 210:4: Cannot use field [snyk.audit_logs.content] due to ambiguities being mapped as [2] incompatible types`;
    expect(isFlattenedRootAmbiguityError(new Error(message))).toBe(true);
  });

  it('does not match an ambiguity error on another field', () => {
    expect(isFlattenedRootAmbiguityError(new Error(ambiguityMessage('user.id')))).toBe(false);
  });

  it('does not match an unrelated error', () => {
    expect(isFlattenedRootAmbiguityError(new Error('circuit_breaking_exception'))).toBe(false);
  });
});
