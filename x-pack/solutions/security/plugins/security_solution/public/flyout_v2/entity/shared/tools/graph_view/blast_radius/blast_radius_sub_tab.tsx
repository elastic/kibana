/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Graph } from '@kbn/cloud-security-posture-graph';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { GraphTraversalExclusion, GraphTraversalOutput } from '@kbn/entity-store/common';
import { useFlyoutBodyAvailableHeight } from '../../../../../document/tools/graph/hooks/use_flyout_body_available_height';
import {
  BLAST_RADIUS_CLEAR_EXCLUSIONS_TEST_ID,
  BLAST_RADIUS_ERROR_TEST_ID,
  BLAST_RADIUS_EXCLUSION_BADGE_TEST_ID,
  BLAST_RADIUS_EXCLUSIONS_TEST_ID,
  BLAST_RADIUS_GRAPH_TEST_ID,
  BLAST_RADIUS_LOADING_TEST_ID,
  BLAST_RADIUS_RUN_BUTTON_TEST_ID,
  BLAST_RADIUS_SUMMARY_TEST_ID,
  BLAST_RADIUS_TAB_TEST_ID,
} from './test_ids';
import { buildBlastRadiusGraph, shortBlastRadiusLabel } from './build_blast_radius_graph';
import { addExclusion, NODE_ID_EXCLUSION_FIELD, removeExclusion } from './exclusions';
import { useRunBlastRadius } from './use_run_blast_radius';

export interface BlastRadiusSubTabProps {
  /** Entity Store entity id (EUID) the traversal starts from */
  entityId: string;
}

const RUN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.blastRadius.runButton',
  { defaultMessage: 'Analyze blast radius' }
);

const RERUN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.blastRadius.rerunButton',
  { defaultMessage: 'Run again' }
);

const REMOVE_EXCLUSION_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.blastRadius.removeExclusion',
  { defaultMessage: 'Remove exclusion' }
);

/**
 * Runs the entity graph traversal workflow for the entity on demand and renders the traversed
 * nodes and edges as a left-to-right graph. Nodes can be excluded from the traversal, which
 * re-runs it with the exclusion list.
 */
export const BlastRadiusSubTab: FC<BlastRadiusSubTabProps> = memo(({ entityId }) => {
  const { mutate, data, error, isLoading, reset } = useRunBlastRadius({ entityId });
  const [exclusions, setExclusions] = useState<GraphTraversalExclusion[]>([]);

  const runWith = useCallback(
    (next: GraphTraversalExclusion[]) => {
      setExclusions(next);
      mutate({ exclusions: next });
    },
    [mutate]
  );
  const run = useCallback(() => runWith(exclusions), [runWith, exclusions]);
  const excludeNode = useCallback(
    (nodeId: string) => runWith(addExclusion(exclusions, NODE_ID_EXCLUSION_FIELD, nodeId)),
    [runWith, exclusions]
  );
  const removeExclusionValue = useCallback(
    (field: string, value: string) => runWith(removeExclusion(exclusions, field, value)),
    [runWith, exclusions]
  );
  const clearExclusions = useCallback(() => runWith([]), [runWith]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const height = useFlyoutBodyAvailableHeight(wrapperRef);

  const output = data?.output ?? null;
  const graph = useMemo(
    () => (output ? buildBlastRadiusGraph(output, { onExcludeNode: excludeNode }) : null),
    [output, excludeNode]
  );
  const failure = error?.message ?? data?.error;

  return (
    <div
      ref={wrapperRef}
      data-test-subj={BLAST_RADIUS_TAB_TEST_ID}
      css={css`
        height: ${height}px;
        width: 100%;
        display: flex;
        flex-direction: column;
      `}
    >
      {!isLoading && exclusions.length > 0 && (
        <>
          <BlastRadiusExclusions
            exclusions={exclusions}
            onRemove={removeExclusionValue}
            onClear={clearExclusions}
          />
          <EuiSpacer size="s" />
        </>
      )}

      {isLoading && (
        <EuiEmptyPrompt
          data-test-subj={BLAST_RADIUS_LOADING_TEST_ID}
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.blastRadius.loadingTitle"
                defaultMessage="Traversing the entity graph"
              />
            </h3>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.blastRadius.loadingBody"
                defaultMessage="Following access relationships from this entity hop by hop. This can take a minute."
              />
            </p>
          }
        />
      )}

      {!isLoading && !data && !error && (
        <EuiEmptyPrompt
          iconType="branch"
          title={
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.blastRadius.emptyTitle"
                defaultMessage="What could this entity reach?"
              />
            </h3>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.blastRadius.emptyBody"
                defaultMessage="Run the entity graph traversal to follow this entity's access relationships, such as roles it can assume, instances it can connect to and buckets those grant access to, and see what is within its reach."
              />
            </p>
          }
          actions={
            <EuiButton
              data-test-subj={BLAST_RADIUS_RUN_BUTTON_TEST_ID}
              fill
              iconType="play"
              onClick={run}
            >
              {RUN_LABEL}
            </EuiButton>
          }
        />
      )}

      {!isLoading && failure && (
        <KbnDangerCallout
          data-test-subj={BLAST_RADIUS_ERROR_TEST_ID}
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.blastRadius.errorTitle"
              defaultMessage="The traversal did not complete"
            />
          }
          text={<p>{failure}</p>}
          actionProps={{
            primary: {
              children: RERUN_LABEL,
              'data-test-subj': BLAST_RADIUS_RUN_BUTTON_TEST_ID,
              onClick: () => {
                reset();
                run();
              },
            },
          }}
        />
      )}

      {!isLoading && output && graph && (
        <>
          <BlastRadiusSummary output={output} onRerun={run} />
          <EuiSpacer size="s" />
          <div
            data-test-subj={BLAST_RADIUS_GRAPH_TEST_ID}
            css={css`
              flex: 1 1 0;
              min-height: 0;
              position: relative;
            `}
          >
            <Graph
              css={css`
                height: 100%;
                width: 100%;
              `}
              nodes={graph.nodes}
              edges={graph.edges}
              interactive={true}
              showMinimap={true}
            />
          </div>
        </>
      )}
    </div>
  );
});

BlastRadiusSubTab.displayName = 'BlastRadiusSubTab';

const BlastRadiusSummary: FC<{ output: GraphTraversalOutput; onRerun: () => void }> = ({
  output,
  onRerun,
}) => (
  <EuiFlexGroup
    data-test-subj={BLAST_RADIUS_SUMMARY_TEST_ID}
    alignItems="center"
    justifyContent="spaceBetween"
    gutterSize="s"
    responsive={false}
    css={css`
      flex: 0 0 auto;
    `}
  >
    <EuiFlexItem grow={true}>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.blastRadius.summary"
          defaultMessage="{scenario}: {nodes, plural, one {# entity} other {# entities}} and {edges, plural, one {# relationship} other {# relationships}} reached in {hops, plural, one {# hop} other {# hops}}."
          values={{
            scenario: output.scenario_name,
            nodes: output.node_count,
            edges: output.edge_count,
            hops: output.hops_executed,
          }}
        />
        {output.truncated && (
          <>
            {' '}
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.blastRadius.truncated"
              defaultMessage="The result was truncated by the traversal limits."
            />
          </>
        )}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        data-test-subj={BLAST_RADIUS_RUN_BUTTON_TEST_ID}
        size="s"
        iconType="refresh"
        onClick={onRerun}
      >
        {RERUN_LABEL}
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/** The field/value exclusions the traversal runs with, each removable, plus a clear action. */
const BlastRadiusExclusions: FC<{
  exclusions: GraphTraversalExclusion[];
  onRemove: (field: string, value: string) => void;
  onClear: () => void;
}> = ({ exclusions, onRemove, onClear }) => (
  <EuiFlexGroup
    data-test-subj={BLAST_RADIUS_EXCLUSIONS_TEST_ID}
    alignItems="center"
    gutterSize="s"
    wrap
    responsive={false}
    css={css`
      flex: 0 0 auto;
    `}
  >
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.blastRadius.exclusionsLabel"
          defaultMessage="Excluded:"
        />
      </EuiText>
    </EuiFlexItem>
    {exclusions.flatMap(({ field, values }) =>
      values.map((value) => (
        <EuiFlexItem grow={false} key={`${field}:${value}`}>
          <EuiBadge
            data-test-subj={BLAST_RADIUS_EXCLUSION_BADGE_TEST_ID}
            color="hollow"
            iconType="cross"
            iconSide="right"
            iconOnClick={() => onRemove(field, value)}
            iconOnClickAriaLabel={REMOVE_EXCLUSION_LABEL}
            title={`${field}: ${value}`}
          >
            {field === NODE_ID_EXCLUSION_FIELD
              ? shortBlastRadiusLabel(value)
              : `${field}: ${value}`}
          </EuiBadge>
        </EuiFlexItem>
      ))
    )}
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        data-test-subj={BLAST_RADIUS_CLEAR_EXCLUSIONS_TEST_ID}
        size="xs"
        onClick={onClear}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.blastRadius.clearExclusions"
          defaultMessage="Clear exclusions"
        />
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);
