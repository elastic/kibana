/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { WorkspacePage } from '../../components/workspace_page';
import { EvidenceChain } from '../../components/evidence_chain/evidence_chain';
import {
  EvidenceContext,
  evidenceSearch,
  evidencePath,
  type EvidenceTarget,
} from '../../components/evidence_chain/evidence_context';
import { StreamsControls } from './streams_controls';
import { useDetectionData } from './use_detection_data';
import { sourcesPageLabels } from './sources_translations';
import { WorkspaceDrawer } from './workspace_drawer';

export const SourcesPage = (): React.ReactElement => (
  <WorkspacePage sources>
    <SourcesWorkspace />
  </WorkspacePage>
);

const SourcesWorkspace = (): React.ReactElement => {
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);
  const stream = params.get('stream');
  const { data } = useDetectionData(
    params.get('rangeFrom') || 'now-24h',
    params.get('rangeTo') || 'now'
  );
  const navigate = (target: EvidenceTarget): void => {
    history.push({
      pathname: evidencePath(target),
      search: evidenceSearch(history.location.search, target).toString(),
    });
  };
  return (
    <EvidenceContext.Provider
      value={{
        data: {
          features: data?.features.features ?? [],
          queries: data?.queries.queries ?? [],
          detections: data?.detections.hits ?? [],
          events: data?.events.hits ?? [],
        },
        onNavigate: navigate,
      }}
    >
      <div data-test-subj="detectionSourcesPage">
        <EuiText size="s" color="subdued">
          <p>{sourcesPageLabels.scope}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <StreamsControls />
        {stream && (
          <WorkspaceDrawer
            title={stream}
            description={sourcesPageLabels.scope}
            onClose={() => {
              const next = new URLSearchParams(history.location.search);
              next.delete('stream');
              history.replace({ ...history.location, search: next.toString() });
            }}
            testSubject="detectionSourceDetailsFlyout"
          >
            <StreamsControls key={stream} selectedSource={stream} />
            <EuiSpacer size="l" />
            <EvidenceChain focus={{ kind: 'source', stream }} />
          </WorkspaceDrawer>
        )}
      </div>
    </EvidenceContext.Provider>
  );
};
