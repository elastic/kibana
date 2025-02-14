/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiResizableContainer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { WiredStreamGetResponse } from '@kbn/streams-schema';
import React from 'react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamDeleteModal } from '../stream_delete_modal';
import { useRoutingState } from './hooks/routing_state';
import { ControlBar } from './control_bar';
import { PreviewPanel } from './preview_panel';
import { ChildStreamList } from './child_stream_list';

export function StreamDetailRouting({
  definition,
  refreshDefinition,
}: {
  definition?: WiredStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const { appParams, core } = useKibana();
  const theme = useEuiTheme().euiTheme;
  const routingAppState = useRoutingState({ definition, toasts: core.notifications.toasts });

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const streamsListFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams', {
        signal,
      });
    },
    [streamsRepositoryClient]
  );

  const availableStreams = streamsListFetch.value?.streams.map((stream) => stream.name) ?? [];
  useUnsavedChangesPrompt({
    hasUnsavedChanges:
      Boolean(routingAppState.childUnderEdit) || routingAppState.hasChildStreamsOrderChanged,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
  });

  if (!definition) {
    return null;
  }

  const closeModal = () => routingAppState.setShowDeleteModal(false);

  return (
    <EuiFlexItem
      className={css`
        overflow: auto;
      `}
      grow
    >
      {routingAppState.showDeleteModal && routingAppState.childUnderEdit && (
        <StreamDeleteModal
          closeModal={closeModal}
          clearChildUnderEdit={() => routingAppState.selectChildUnderEdit(undefined)}
          refreshDefinition={refreshDefinition}
          name={routingAppState.childUnderEdit.child.destination}
          availableStreams={availableStreams}
        />
      )}
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        className={css`
          overflow: auto;
        `}
      >
        <EuiPanel
          hasShadow={false}
          hasBorder
          className={css`
            display: flex;
            max-width: 100%;
            overflow: auto;
            flex-grow: 1;
          `}
          paddingSize="xs"
        >
          <EuiResizableContainer>
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel
                  initialSize={30}
                  minSize="300px"
                  tabIndex={0}
                  paddingSize="s"
                  className={css`
                    background-color: ${theme.colors.backgroundBaseSubdued};
                    overflow: auto;
                    display: flex;
                  `}
                >
                  <ChildStreamList
                    definition={definition}
                    routingAppState={routingAppState}
                    availableStreams={availableStreams}
                  />
                </EuiResizablePanel>

                <EuiResizableButton accountForScrollbars="both" />

                <EuiResizablePanel
                  initialSize={70}
                  tabIndex={0}
                  minSize="300px"
                  paddingSize="s"
                  className={css`
                    display: flex;
                    flex-direction: column;
                  `}
                >
                  <PreviewPanel definition={definition} routingAppState={routingAppState} />
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        </EuiPanel>
        <EuiFlexItem grow={false}>
          <ControlBar
            definition={definition}
            routingAppState={routingAppState}
            refreshDefinition={refreshDefinition}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
