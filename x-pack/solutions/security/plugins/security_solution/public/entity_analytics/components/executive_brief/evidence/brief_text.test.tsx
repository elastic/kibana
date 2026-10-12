/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { evidenceFixture } from '../__fixtures__/brief_fixture';
import { createBriefActions, renderBrief } from '../__fixtures__/render_brief';
import { BriefText, resolveProse, resolveTriageRequest } from './brief_text';

describe('brief prose', () => {
  it('replaces entity ids with names and strips inline citations', () => {
    expect(
      resolveProse('Suspend ENT-1 credentials (F-3, L-2) now; see F-7.', evidenceFixture)
    ).toBe('Suspend a.rodriguez credentials now; see .');
  });

  it('leaves unknown entity ids untouched', () => {
    expect(resolveProse('Check ENT-999.', evidenceFixture)).toBe('Check ENT-999.');
  });

  it('resolves both parts of a triage request', () => {
    expect(
      resolveTriageRequest(
        { instruction: 'Triage ENT-1', evidenceMarkdown: '- ENT-1 (F-1)' },
        evidenceFixture
      )
    ).toEqual({ instruction: 'Triage a.rodriguez', evidenceMarkdown: '- a.rodriguez' });
  });

  it('renders entity ids as clickable names that open the entity', () => {
    const actions = createBriefActions();
    renderBrief(<BriefText text="ENT-1 logged on rarely." evidence={evidenceFixture} />, actions);
    fireEvent.click(screen.getByTestId('executiveBriefProseEntity-ENT-1'));
    expect(actions.openEntity).toHaveBeenCalledWith(evidenceFixture.entities['ENT-1']);
    expect(screen.getByText(/logged on rarely/)).toBeInTheDocument();
  });

  it('renders plain names without an actions provider', () => {
    renderBrief(<BriefText text="ENT-1 logged on." evidence={evidenceFixture} />, null);
    expect(screen.queryByTestId('executiveBriefProseEntity-ENT-1')).not.toBeInTheDocument();
    expect(screen.getByText('a.rodriguez')).toBeInTheDocument();
  });
});
