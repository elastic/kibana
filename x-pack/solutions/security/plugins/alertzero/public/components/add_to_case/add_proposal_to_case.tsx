/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { ProposalAttachmentMetadata } from '@kbn/cases-plugin/common';
import { PROPOSAL_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import type { Proposal } from '@kbn/proposals-common';

/** AlertZero is a Security feature, so its proposals go to Security cases. */
const OWNER = SECURITY_SOLUTION_OWNER;

export type ProposalToAdd = Pick<Proposal, 'id' | 'title' | 'rootProposalId'>;

/** Whether the user may add a proposal to a Security case. */
export const canAddProposalToCase = (cases?: CasesPublicStart): cases is CasesPublicStart =>
  cases?.helpers.canUseCases([OWNER]).createComment === true;

interface Props {
  cases: CasesPublicStart;
  /** The proposal to add. A new value opens the case picker; `undefined` does nothing. */
  proposal?: ProposalToAdd;
  /** Called once the picker is open, so the caller can clear `proposal`. */
  onOpened: () => void;
}

const OpenCasePicker = ({ cases, proposal, onOpened }: Props) => {
  const { open } = cases.hooks.useCasesAddToExistingCaseModal();
  // `open` can change identity while the picker renders, before the caller clears `proposal`.
  const openedFor = useRef<ProposalToAdd>();

  useEffect(() => {
    if (!proposal) {
      // Cleared by the caller, so the next request opens the picker even for the same proposal.
      openedFor.current = undefined;
      return;
    }
    if (openedFor.current === proposal) {
      return;
    }
    openedFor.current = proposal;
    const metadata: ProposalAttachmentMetadata = {
      title: proposal.title,
      rootProposalId: proposal.rootProposalId ?? proposal.id,
    };
    open({
      getAttachments: () => [
        { type: PROPOSAL_ATTACHMENT_TYPE, attachmentId: proposal.id, metadata },
      ],
    });
    onOpened();
  }, [open, proposal, onOpened]);

  return null;
};

/**
 * Hosts the Cases picker that adds a proposal to an existing case, or to a new one. Stays mounted
 * so the picker it opened keeps its Cases context after `proposal` is cleared.
 */
export const AddProposalToCase = (props: Props) => {
  const { cases } = props;
  const CasesContext = useMemo(() => cases.ui.getCasesContext(), [cases]);
  const permissions = useMemo(() => cases.helpers.canUseCases([OWNER]), [cases]);

  return (
    <CasesContext owner={[OWNER]} permissions={permissions}>
      <OpenCasePicker {...props} />
    </CasesContext>
  );
};

OpenCasePicker.displayName = 'OpenCasePicker';
AddProposalToCase.displayName = 'AddProposalToCase';
