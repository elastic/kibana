/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import { PROPOSAL_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { AddProposalToCase, canAddProposalToCase } from './add_proposal_to_case';

const createCases = ({ createComment = true } = {}) => {
  const open = jest.fn();
  const canUseCases = jest.fn().mockReturnValue({ createComment });
  const CasesContext = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
  const cases = {
    ui: { getCasesContext: () => CasesContext },
    hooks: { useCasesAddToExistingCaseModal: () => ({ open }) },
    helpers: { canUseCases },
  } as unknown as CasesPublicStart;
  return { cases, open, canUseCases, CasesContext };
};

const proposal = { id: 'p-2', title: 'Tune noisy rule', rootProposalId: 'p-1' };

describe('AddProposalToCase', () => {
  it('opens the case picker once with the proposal as a Security attachment', () => {
    const { cases, open, CasesContext } = createCases();
    const onOpened = jest.fn();

    const { rerender } = render(
      <AddProposalToCase cases={cases} proposal={proposal} onOpened={onOpened} />
    );
    rerender(<AddProposalToCase cases={cases} proposal={proposal} onOpened={onOpened} />);

    expect(open).toHaveBeenCalledTimes(1);
    expect(onOpened).toHaveBeenCalledTimes(1);
    const [[{ getAttachments }]] = open.mock.calls;
    expect(getAttachments()).toEqual([
      {
        type: PROPOSAL_ATTACHMENT_TYPE,
        attachmentId: 'p-2',
        metadata: { title: 'Tune noisy rule', rootProposalId: 'p-1' },
      },
    ]);
    expect(CasesContext.mock.calls[0][0]).toMatchObject({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  it('opens the picker again for the same proposal once the caller cleared it', () => {
    const { cases, open } = createCases();
    const onOpened = jest.fn();

    const { rerender } = render(
      <AddProposalToCase cases={cases} proposal={proposal} onOpened={onOpened} />
    );
    rerender(<AddProposalToCase cases={cases} onOpened={onOpened} />);
    rerender(<AddProposalToCase cases={cases} proposal={proposal} onOpened={onOpened} />);

    expect(open).toHaveBeenCalledTimes(2);
  });

  it('does nothing until there is a proposal', () => {
    const { cases, open } = createCases();

    render(<AddProposalToCase cases={cases} onOpened={jest.fn()} />);

    expect(open).not.toHaveBeenCalled();
  });
});

describe('canAddProposalToCase', () => {
  it('needs Cases and permission to add to Security cases', () => {
    expect(canAddProposalToCase(undefined)).toBe(false);
    expect(canAddProposalToCase(createCases({ createComment: false }).cases)).toBe(false);

    const { cases, canUseCases } = createCases();
    expect(canAddProposalToCase(cases)).toBe(true);
    expect(canUseCases).toHaveBeenCalledWith([SECURITY_SOLUTION_OWNER]);
  });
});
