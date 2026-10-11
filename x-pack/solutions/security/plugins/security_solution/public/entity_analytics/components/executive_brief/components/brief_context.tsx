/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { EuiIconTip } from '@elastic/eui';
import type {
  BriefSnapshot,
  BriefValidation,
} from '../../../../../common/entity_analytics/executive_brief/types';

type ClaimFlagEntry = NonNullable<BriefValidation['flags']>[number];

interface BriefContextValue {
  snapshot: BriefSnapshot;
  /** `validation.flags`: claims kept but not fully backed by the evidence. */
  flags: readonly ClaimFlagEntry[];
  /** True while the PDF is being captured: interactive controls are hidden or rendered as text. */
  isPrintMode: boolean;
  /** Latest request to expand a storyline card (from "View threat"); `nonce` makes repeats distinct. */
  storylineOpenRequest?: StorylineOpenRequest;
  requestStorylineOpen: (rank: number) => void;
}

export interface StorylineOpenRequest {
  rank: number;
  nonce: number;
}

const BriefContext = createContext<BriefContextValue | undefined>(undefined);

interface BriefContextProviderProps {
  snapshot: BriefSnapshot;
  flags?: readonly ClaimFlagEntry[];
  isPrintMode?: boolean;
}

const NO_FLAGS: readonly ClaimFlagEntry[] = [];

export const BriefContextProvider: React.FC<React.PropsWithChildren<BriefContextProviderProps>> = ({
  snapshot,
  flags = NO_FLAGS,
  isPrintMode = false,
  children,
}) => {
  const [storylineOpenRequest, setStorylineOpenRequest] = useState<StorylineOpenRequest>();
  const requestStorylineOpen = useCallback(
    (rank: number) =>
      setStorylineOpenRequest((previous) => ({ rank, nonce: (previous?.nonce ?? 0) + 1 })),
    []
  );
  const value = useMemo(
    () => ({ snapshot, flags, isPrintMode, storylineOpenRequest, requestStorylineOpen }),
    [snapshot, flags, isPrintMode, storylineOpenRequest, requestStorylineOpen]
  );
  return <BriefContext.Provider value={value}>{children}</BriefContext.Provider>;
};

export const useBriefSnapshot = (): BriefSnapshot => {
  const value = useContext(BriefContext);
  if (!value) {
    throw new Error('useBriefSnapshot must be used inside BriefContextProvider');
  }
  return value.snapshot;
};

/** True while the brief is rendered for PDF capture. Safe outside the provider (returns false). */
export const useIsPrintMode = (): boolean => useContext(BriefContext)?.isPrintMode ?? false;

const NOOP_REQUEST = (): void => {};

/** Asks the matching storyline card to expand. A no-op outside the provider. */
export const useRequestStorylineOpen = (): ((rank: number) => void) =>
  useContext(BriefContext)?.requestStorylineOpen ?? NOOP_REQUEST;

/** The latest storyline expand request, if any. */
export const useStorylineOpenRequest = (): StorylineOpenRequest | undefined =>
  useContext(BriefContext)?.storylineOpenRequest;

/** Flags whose claimPath equals `claimPath`, or starts with it followed by `.` or `[`. */
export const useClaimFlags = (claimPath: string): readonly ClaimFlagEntry[] => {
  const flags = useContext(BriefContext)?.flags ?? NO_FLAGS;
  return useMemo(
    () =>
      flags.filter(
        ({ claimPath: path }) =>
          path === claimPath || path.startsWith(`${claimPath}.`) || path.startsWith(`${claimPath}[`)
      ),
    [flags, claimPath]
  );
};

/**
 * Subtle warning icon rendered next to a claim that validation flagged (for example
 * `storylines[0].narrative`). Renders nothing when the claim is not flagged or in print mode.
 */
export const ClaimFlag: React.FC<{ claimPath: string }> = ({ claimPath }) => {
  const matches = useClaimFlags(claimPath);
  const isPrintMode = useIsPrintMode();
  if (matches.length === 0 || isPrintMode) return null;
  return (
    <span data-test-subj="executiveBriefClaimFlag">
      <EuiIconTip
        type="warning"
        color="warning"
        size="s"
        aria-label="Not fully verified"
        title="Not fully verified"
        content={matches.map(({ statement, reason }) => `${statement} (${reason})`).join(' ')}
      />
    </span>
  );
};
