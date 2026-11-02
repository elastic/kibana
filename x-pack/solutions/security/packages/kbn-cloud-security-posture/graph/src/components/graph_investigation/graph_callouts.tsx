/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NodeViewModel } from '../types';
import { isEntityNode } from '../utils';
import {
  GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID,
  GRAPH_CALLOUT_NO_DATA_ID,
  GRAPH_CALLOUT_NO_RELATIONSHIPS_ID,
  GRAPH_CALLOUT_UNKNOWN_ENTITIES_ID,
} from '../test_ids';

interface GraphCalloutProps {
  /** Medium-weight heading text displayed at the start of the callout. */
  heading: string;
  /** Regular-weight description text displayed after the heading. */
  description: string;
  onDismiss: () => void;
  'data-test-subj': string;
}

/** A dismissible single-line callout for surfacing contextual graph messages. */
const GraphCallout: React.FC<GraphCalloutProps> = ({
  heading,
  description,
  onDismiss,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        data-test-subj={dataTestSubj}
        size="s"
        iconType="info"
        announceOnMount={false}
        onDismiss={onDismiss}
        text={
          <span>
            <span
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
              `}
            >
              {heading}
            </span>
            {description}
          </span>
        }
      />
    </>
  );
};

const NO_DATA_HEADING = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.noDataCalloutHeading',
  { defaultMessage: 'No data available' }
);
const NO_DATA_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.noDataCalloutDescription',
  {
    defaultMessage:
      ' · No events were found. You can try adjusting the current time range or filters, though results may vary depending on the data source.',
  }
);
const NO_RELATIONSHIPS_HEADING = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.noRelationshipsCalloutHeading',
  { defaultMessage: 'No resolution group found' }
);
const NO_RELATIONSHIPS_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.noRelationshipsCalloutDescription',
  {
    defaultMessage:
      ' · This entity is not part of a resolution group yet. It may be added automatically as more data is processed.',
  }
);
const METADATA_UNAVAILABLE_HEADING = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.entityMetadataUnavailableCalloutHeading',
  { defaultMessage: 'Entity metadata not available yet' }
);
const METADATA_UNAVAILABLE_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.entityMetadataUnavailableCalloutDescription',
  {
    defaultMessage:
      ' · Entity metadata is not yet available. The Entity Store may still be processing this data.',
  }
);
const UNKNOWN_ENTITIES_HEADING = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.unknownEntitiesCalloutHeading',
  { defaultMessage: 'Unknown entities detected' }
);
const UNKNOWN_ENTITIES_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.unknownEntitiesCalloutDescription',
  {
    defaultMessage:
      ' · Some target entities could not be identified (this can occur because the graph is configured to show linked targets).',
  }
);

/** Returns true for the placeholder target node the server creates for events without a target. */
const isUnknownTargetNode = (node: NodeViewModel): boolean =>
  // The graph route always tags resolved entities (falling back to "Entity"/"Entities"), so only
  // the unknown-target placeholder lacks a tag.
  isEntityNode(node) && !node.tag;

/** Returns true when an entity node has none of the 6 metadata fields shown on its card. */
const isEntityMissingAllMetadata = (node: NodeViewModel): boolean => {
  if (!isEntityNode(node) || isUnknownTargetNode(node)) return false;
  const subType = node.documentsData?.[0]?.entity?.sub_type;
  const sources = node.documentsData?.flatMap((doc) => doc?.entity?.sources ?? []) ?? [];
  return (
    !subType &&
    sources.length === 0 &&
    !node.ips?.length &&
    !node.countryCodes?.length &&
    !node.assetCriticality?.length &&
    !node.riskScore
  );
};

export interface GraphCalloutsProps {
  /** Nodes from the latest graph response; `undefined` until the first response arrives. */
  nodes: NodeViewModel[] | undefined;
  isFetching: boolean;
}

/** Renders the contextual, dismissible callouts shown above the graph canvas. */
export const GraphCallouts: React.FC<GraphCalloutsProps> = ({ nodes, isFetching }) => {
  const [isNoDataDismissed, setIsNoDataDismissed] = useState(false);
  const [isNoRelationshipsDismissed, setIsNoRelationshipsDismissed] = useState(false);
  const [isMetadataDismissed, setIsMetadataDismissed] = useState(false);
  const [isUnknownEntitiesDismissed, setIsUnknownEntitiesDismissed] = useState(false);

  const { hasNoNodes, hasOnlyEntityNodes, hasEntityMissingAllMetadata, hasUnknownEntities } =
    useMemo(() => {
      const isSettled = !isFetching && nodes !== undefined;
      const hasNodes = isSettled && nodes.length > 0;
      return {
        hasNoNodes: isSettled && nodes.length === 0,
        hasOnlyEntityNodes: hasNodes && nodes.every(isEntityNode),
        hasEntityMissingAllMetadata: hasNodes && nodes.some(isEntityMissingAllMetadata),
        hasUnknownEntities: hasNodes && nodes.some(isUnknownTargetNode),
      };
    }, [nodes, isFetching]);

  return (
    <>
      {hasNoNodes && !isNoDataDismissed && (
        <GraphCallout
          data-test-subj={GRAPH_CALLOUT_NO_DATA_ID}
          heading={NO_DATA_HEADING}
          description={NO_DATA_DESCRIPTION}
          onDismiss={() => setIsNoDataDismissed(true)}
        />
      )}
      {hasOnlyEntityNodes && !isNoRelationshipsDismissed && (
        <GraphCallout
          data-test-subj={GRAPH_CALLOUT_NO_RELATIONSHIPS_ID}
          heading={NO_RELATIONSHIPS_HEADING}
          description={NO_RELATIONSHIPS_DESCRIPTION}
          onDismiss={() => setIsNoRelationshipsDismissed(true)}
        />
      )}
      {hasEntityMissingAllMetadata && !isMetadataDismissed && (
        <GraphCallout
          data-test-subj={GRAPH_CALLOUT_METADATA_UNAVAILABLE_ID}
          heading={METADATA_UNAVAILABLE_HEADING}
          description={METADATA_UNAVAILABLE_DESCRIPTION}
          onDismiss={() => setIsMetadataDismissed(true)}
        />
      )}
      {hasUnknownEntities && !isUnknownEntitiesDismissed && (
        <GraphCallout
          data-test-subj={GRAPH_CALLOUT_UNKNOWN_ENTITIES_ID}
          heading={UNKNOWN_ENTITIES_HEADING}
          description={UNKNOWN_ENTITIES_DESCRIPTION}
          onDismiss={() => setIsUnknownEntitiesDismissed(true)}
        />
      )}
    </>
  );
};

GraphCallouts.displayName = 'GraphCallouts';
