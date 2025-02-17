/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiButton, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { WiredStreamGetResponse, IngestUpsertRequest } from '@kbn/streams-schema';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { emptyEqualsToAlways } from '../../util/condition';
import { useRoutingState } from './hooks/routing_state';
import { getFormattedError } from '../../util/errors';

export function ControlBar({
  definition,
  routingAppState,
  refreshDefinition,
}: {
  definition: WiredStreamGetResponse;
  routingAppState: ReturnType<typeof useRoutingState>;
  refreshDefinition: () => void;
}) {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { notifications } = core;
  const router = useStreamsAppRouter();

  const { signal } = useAbortController();

  if (!routingAppState.childUnderEdit && !routingAppState.hasChildStreamsOrderChanged) {
    return (
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiButton disabled data-test-subj="streamsAppStreamDetailRoutingSaveButton">
          {i18n.translate('xpack.streams.streamDetailRouting.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiFlexGroup>
    );
  }

  function forkChild() {
    if (!routingAppState.childUnderEdit) {
      return;
    }

    return streamsRepositoryClient.fetch('POST /api/streams/{name}/_fork', {
      signal,
      params: {
        path: {
          name: definition.stream.name,
        },
        body: {
          if: emptyEqualsToAlways(routingAppState.childUnderEdit.child.if),
          stream: {
            name: routingAppState.childUnderEdit.child.destination,
          },
        },
      },
    });
  }

  // Persists edits to child streams and reorders of the child streams
  function updateChildren() {
    if (!routingAppState.childUnderEdit && !routingAppState.hasChildStreamsOrderChanged) {
      return;
    }

    const childUnderEdit = routingAppState.childUnderEdit?.child;
    const { stream } = definition;

    const routing = routingAppState.childStreams.map((child) =>
      child.destination === childUnderEdit?.destination ? childUnderEdit : child
    );

    const request = {
      ingest: {
        ...stream.ingest,
        routing,
      },
    } as IngestUpsertRequest;

    return streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest', {
      signal,
      params: {
        path: {
          name: stream.name,
        },
        body: request,
      },
    });
  }

  async function saveOrUpdateChildren() {
    if (!routingAppState.childUnderEdit && !routingAppState.hasChildStreamsOrderChanged) {
      return;
    }
    try {
      routingAppState.setSaveInProgress(true);

      if (routingAppState.childUnderEdit && routingAppState.childUnderEdit.isNew) {
        // Persist the child stream order changes first
        if (routingAppState.hasChildStreamsOrderChanged) {
          await updateChildren();
        }
        await forkChild();
      } else {
        await updateChildren();
      }

      routingAppState.setSaveInProgress(false);
      const toast = notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
          defaultMessage: 'Stream saved',
        }),
        text: toMountPoint(
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="streamsAppSaveOrUpdateChildrenOpenStreamInNewTabButton"
                size="s"
                target="_blank"
                href={router.link('/{key}/{tab}/{subtab}', {
                  path: {
                    key: routingAppState.childUnderEdit?.child.destination!,
                    tab: 'management',
                    subtab: 'route',
                  },
                })}
              >
                {i18n.translate('xpack.streams.streamDetailRouting.view', {
                  defaultMessage: 'Open stream in new tab',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
          core
        ),
      });
      routingAppState.setLastDisplayedToast(toast);
      routingAppState.selectChildUnderEdit(undefined);
      refreshDefinition();
    } catch (error) {
      routingAppState.setSaveInProgress(false);
      const toast = notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.failedToSave', {
          defaultMessage: 'Failed to save',
        }),
        toastMessage: getFormattedError(error).message,
      });
      routingAppState.setLastDisplayedToast(toast);
    }
  }

  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      {routingAppState.childUnderEdit && !routingAppState.childUnderEdit.isNew && (
        <>
          <EuiButton
            color="danger"
            size="s"
            disabled={routingAppState.saveInProgress}
            data-test-subj="streamsAppRoutingStreamEntryRemoveButton"
            onClick={() => {
              routingAppState.setShowDeleteModal(true);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.remove', {
              defaultMessage: 'Remove',
            })}
          </EuiButton>
          <EuiFlexItem grow />
        </>
      )}
      <EuiButtonEmpty
        size="s"
        data-test-subj="streamsAppRoutingStreamEntryCancelButton"
        disabled={routingAppState.saveInProgress}
        onClick={() => {
          routingAppState.cancelChanges();
        }}
      >
        {i18n.translate('xpack.streams.streamDetailRouting.cancel', {
          defaultMessage: 'Cancel',
        })}
      </EuiButtonEmpty>
      <EuiButton
        isLoading={routingAppState.saveInProgress}
        onClick={saveOrUpdateChildren}
        data-test-subj="streamsAppStreamDetailRoutingSaveButton"
      >
        {routingAppState.childUnderEdit && routingAppState.childUnderEdit.isNew
          ? i18n.translate('xpack.streams.streamDetailRouting.add', {
              defaultMessage: 'Save',
            })
          : i18n.translate('xpack.streams.streamDetailRouting.change', {
              defaultMessage: 'Change routing',
            })}
      </EuiButton>
    </EuiFlexGroup>
  );
}
