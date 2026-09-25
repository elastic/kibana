/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildTransformDescription,
  MAX_TRANSFORM_DESCRIPTION_LENGTH,
} from './build_transform_description';

const PREFIX = 'Summarise the rollup data of SLO: ';
const TERMINATOR = '.';
const slo = { id: 'my-slo-id', revision: 3 };
const suffix = ` [id: ${slo.id}, revision: ${slo.revision}]${TERMINATOR}`;
const maxNameLength = MAX_TRANSFORM_DESCRIPTION_LENGTH - PREFIX.length - suffix.length;

describe('buildTransformDescription', () => {
  it('keeps a short name untouched', () => {
    expect(buildTransformDescription(PREFIX, { ...slo, name: 'my slo' }, TERMINATOR)).toBe(
      'Summarise the rollup data of SLO: my slo [id: my-slo-id, revision: 3].'
    );
  });

  it('omits the terminator by default', () => {
    expect(buildTransformDescription('Rolled-up SLI data for SLO: ', { ...slo, name: 'a' })).toBe(
      'Rolled-up SLI data for SLO: a [id: my-slo-id, revision: 3]'
    );
  });

  it('keeps a name that exactly fills the limit', () => {
    const name = 'x'.repeat(maxNameLength);
    const description = buildTransformDescription(PREFIX, { ...slo, name }, TERMINATOR);

    expect(description).toHaveLength(MAX_TRANSFORM_DESCRIPTION_LENGTH);
    expect(description).toBe(`${PREFIX}${name}${suffix}`);
  });

  it.each([maxNameLength + 1, 5000])(
    'truncates a name of %d characters and keeps the id and revision',
    (nameLength) => {
      const description = buildTransformDescription(
        PREFIX,
        { ...slo, name: 'x'.repeat(nameLength) },
        TERMINATOR
      );

      expect(description).toHaveLength(MAX_TRANSFORM_DESCRIPTION_LENGTH);
      expect(description.startsWith(PREFIX)).toBe(true);
      expect(description.endsWith(suffix)).toBe(true);
    }
  );
});
