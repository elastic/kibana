/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { HuntLibraryDetail } from '../../../common/hunt_library';
import { useHuntLibraryDetail } from '../../hooks/use_hunt_library_api';
import { HuntAvailabilityPanel } from './hunt_availability_panel';
import { HuntHistorySection } from './hunt_history_section';
import { RunInDiscoverButton } from './run_in_discover_button';
import * as i18n from './translations';

interface HuntDetailFlyoutProps {
  huntId: string;
  onClose: () => void;
}

const NoteList: React.FC<{ title: string; items: string[]; testSubj: string }> = ({
  title,
  items,
  testSubj,
}) =>
  items.length === 0 ? null : (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiText size="s" data-test-subj={testSubj}>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </EuiText>
    </>
  );

const FlyoutContent: React.FC<{ hunt: HuntLibraryDetail }> = ({ hunt }) => (
  <>
    <EuiText size="s">
      <p>{hunt.description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiTitle size="xxs">
      <h4>{i18n.FLYOUT_HYPOTHESIS}</h4>
    </EuiTitle>
    <EuiText size="s">
      <p data-test-subj="alertZeroHuntFlyoutHypothesis">{hunt.hypothesis}</p>
    </EuiText>

    <EuiSpacer size="m" />
    <RunInDiscoverButton hunt={hunt} />

    <EuiSpacer size="l" />
    <HuntAvailabilityPanel
      title={i18n.FLYOUT_YOUR_AVAILABILITY}
      availability={hunt.callerAvailability}
      data-test-subj="alertZeroHuntFlyoutCallerAvailability"
    />
    <EuiSpacer size="m" />
    <HuntAvailabilityPanel
      title={i18n.FLYOUT_WORKER_AVAILABILITY}
      availability={hunt.workerAvailability}
      note={i18n.FLYOUT_WORKER_NOTE}
      data-test-subj="alertZeroHuntFlyoutWorkerAvailability"
    />

    <EuiSpacer size="l" />
    <HuntHistorySection huntId={hunt.id} />

    <NoteList
      title={i18n.FLYOUT_NOTES}
      items={hunt.guidance.analystNotes}
      testSubj="alertZeroHuntFlyoutNotes"
    />
    <NoteList
      title={i18n.FLYOUT_FALSE_POSITIVES}
      items={hunt.guidance.expectedFalsePositives}
      testSubj="alertZeroHuntFlyoutFalsePositives"
    />
    <NoteList
      title={i18n.FLYOUT_PIVOTS}
      items={hunt.guidance.suggestedPivots}
      testSubj="alertZeroHuntFlyoutPivots"
    />

    <EuiSpacer size="l" />
    <EuiTitle size="xxs">
      <h4>{i18n.FLYOUT_DATA}</h4>
    </EuiTitle>
    <EuiText size="s">
      <p>{i18n.FLYOUT_INDEX_PATTERNS}</p>
    </EuiText>
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
      data-test-subj="alertZeroHuntFlyoutIndices"
    >
      {hunt.query.requiredIndexPatterns.map((pattern) => (
        <EuiFlexItem grow={false} key={pattern}>
          <EuiBadge color="hollow">{pattern}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>

    <EuiSpacer size="m" />
    <EuiTitle size="xxs">
      <h4>{i18n.FLYOUT_QUERY}</h4>
    </EuiTitle>
    <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
      {hunt.query.query}
    </EuiCodeBlock>

    {hunt.references.length > 0 ? (
      <>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h4>{i18n.FLYOUT_REFERENCES}</h4>
        </EuiTitle>
        <EuiText size="s">
          <ul>
            {hunt.references.map((reference) => (
              <li key={reference}>
                <EuiLink href={reference} target="_blank" external>
                  {reference}
                </EuiLink>
              </li>
            ))}
          </ul>
        </EuiText>
      </>
    ) : null}

    <EuiSpacer size="m" />
    <EuiText size="xs" color="subdued">
      {i18n.FLYOUT_SOURCE}: {i18n.flyoutSourceLine(hunt.source.path, hunt.source.revision)}
    </EuiText>
  </>
);

export const HuntDetailFlyout: React.FC<HuntDetailFlyoutProps> = ({ huntId, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'alertZeroHuntFlyoutTitle' });
  const { data: hunt, isLoading, isError, refetch } = useHuntLibraryDetail(huntId);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="alertZeroHuntDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{hunt?.name ?? huntId}</h2>
        </EuiTitle>
        {hunt ? (
          <>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {hunt.platform.map((platform) => (
                <EuiFlexItem grow={false} key={platform}>
                  <EuiBadge color="hollow">{platform}</EuiBadge>
                </EuiFlexItem>
              ))}
              {hunt.mitreTechniques.map((technique) => (
                <EuiFlexItem grow={false} key={technique}>
                  <EuiBadge color="default">{technique}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" aria-label={i18n.FLYOUT_LOADING} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : isError || !hunt ? (
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            title={<h3>{i18n.FLYOUT_ERROR_TITLE}</h3>}
            actions={
              <EuiButton onClick={() => refetch()} data-test-subj="alertZeroHuntFlyoutRetry">
                {i18n.RETRY}
              </EuiButton>
            }
          />
        ) : (
          <FlyoutContent hunt={hunt} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
