/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  DropResult,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiResizableContainer,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  euiDragDropReorder,
  DragStart,
  EuiBreadcrumbs,
  EuiBreadcrumb,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import React, { useCallback, useEffect } from 'react';
import {
  StreamChild,
  ReadStreamDefinition,
  WiredStreamConfigDefinition,
  isRoot,
  isDescendantOf,
} from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { AbortableAsyncState } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { DraggableProvided } from '@hello-pangea/dnd';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { ConditionEditor } from '../condition_editor';
import { useDebounced } from '../../util/use_debounce';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { NestedView } from '../nested_view';
import { PreviewTable } from '../preview_table';
import { StreamDeleteModal } from '../stream_delete_modal';
import { AssetImage } from '../asset_image';

function useRoutingState({ definition }: { definition?: ReadStreamDefinition }) {
  const [childUnderEdit, setChildUnderEdit] = React.useState<
    { isNew: boolean; child: StreamChild } | undefined
  >();

  // Child streams: either represents the child streams as they are, or the new order from drag and drop.
  const [childStreams, setChildStreams] = React.useState<
    ReadStreamDefinition['stream']['ingest']['routing']
  >(definition?.stream.ingest.routing ?? []);

  useEffect(() => {
    setChildStreams(definition?.stream.ingest.routing ?? []);
  }, [definition]);

  // Note: just uses reference equality to check if the order has changed as onChildStreamReorder will create a new array.
  const hasChildStreamsOrderChanged = childStreams !== definition?.stream.ingest.routing;

  // Child stream currently being dragged
  const [draggingChildStream, setDraggingChildStream] = React.useState<string | undefined>();

  const onChildStreamDragStart = useCallback((e: DragStart) => {
    setDraggingChildStream(e.draggableId);
  }, []);

  const onChildStreamDragEnd = useCallback(
    (event: DropResult) => {
      setDraggingChildStream(undefined);
      if (typeof event.source.index === 'number' && typeof event.destination?.index === 'number') {
        setChildStreams([
          ...euiDragDropReorder(childStreams, event.source.index, event.destination.index),
        ]);
      }
    },
    [childStreams]
  );

  const cancelChanges = useCallback(() => {
    setChildUnderEdit(undefined);
    setChildStreams(definition?.stream.ingest.routing ?? []);
  }, [definition?.stream.ingest.routing]);

  const debouncedChildUnderEdit = useDebounced(childUnderEdit, 300);

  const [saveInProgress, setSaveInProgress] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  return {
    debouncedChildUnderEdit,
    childUnderEdit,
    setChildUnderEdit,
    saveInProgress,
    setSaveInProgress,
    showDeleteModal,
    setShowDeleteModal,
    childStreams,
    onChildStreamDragEnd,
    hasChildStreamsOrderChanged,
    cancelChanges,
    onChildStreamDragStart,
    draggingChildStream,
  };
}

export function StreamDetailRouting({
  definition,
  refreshDefinition,
}: {
  definition?: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const { appParams, core } = useKibana();
  const theme = useEuiTheme().euiTheme;
  const routingAppState = useRoutingState({ definition });

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
          clearChildUnderEdit={() => routingAppState.setChildUnderEdit(undefined)}
          refreshDefinition={refreshDefinition}
          id={routingAppState.childUnderEdit.child.name}
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

function ControlBar({
  definition,
  routingAppState,
  refreshDefinition,
}: {
  definition: ReadStreamDefinition;
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
    return streamsRepositoryClient.fetch('POST /api/streams/{id}/_fork', {
      signal,
      params: {
        path: {
          id: definition.name,
        },
        body: {
          condition: routingAppState.childUnderEdit.child.condition,
          stream: {
            name: routingAppState.childUnderEdit.child.name,
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
    const { name, stream } = definition;
    return streamsRepositoryClient.fetch('PUT /api/streams/{id}', {
      signal,
      params: {
        path: {
          id: name,
        },
        body: {
          ...stream,
          ingest: {
            ...stream.ingest,
            routing: routingAppState.childStreams.map((child) =>
              child.name === childUnderEdit?.name ? childUnderEdit : child
            ),
          },
        } as WiredStreamConfigDefinition,
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
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
          defaultMessage: 'Stream saved',
        }),
        text: toMountPoint(
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                target="_blank"
                href={router.link('/{key}/{tab}/{subtab}', {
                  path: {
                    key: routingAppState.childUnderEdit?.child.name!,
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
      routingAppState.setChildUnderEdit(undefined);
      refreshDefinition();
    } catch (error) {
      routingAppState.setSaveInProgress(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.failedToSave', {
          defaultMessage: 'Failed to save',
        }),
        toastMessage: 'body' in error ? error.body.message : error.message,
      });
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

function PreviewPanel({
  definition,
  routingAppState,
}: {
  definition: ReadStreamDefinition;
  routingAppState: ReturnType<typeof useRoutingState>;
}) {
  const {
    dependencies: {
      start: {
        data,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const {
    timeRange,
    absoluteTimeRange: { start, end },
    setTimeRange,
  } = useDateRange({ data });

  const previewSampleFetch = useStreamsAppFetch(
    ({ signal }) => {
      if (
        !definition ||
        !routingAppState.debouncedChildUnderEdit ||
        !routingAppState.debouncedChildUnderEdit.isNew
      ) {
        return Promise.resolve({ documents: [] });
      }
      return streamsRepositoryClient.fetch('POST /api/streams/{id}/_sample', {
        signal,
        params: {
          path: {
            id: definition.name,
          },
          body: {
            condition: routingAppState.debouncedChildUnderEdit.child.condition,
            start: start?.valueOf(),
            end: end?.valueOf(),
            number: 100,
          },
        },
      });
    },
    [definition, routingAppState.debouncedChildUnderEdit, streamsRepositoryClient, start, end],
    {
      disableToastOnError: true,
    }
  );

  let content = (
    <PreviewPanelIllustration
      previewSampleFetch={previewSampleFetch}
      routingAppState={routingAppState}
    />
  );

  if (routingAppState.debouncedChildUnderEdit?.isNew) {
    if (previewSampleFetch.error) {
      content = (
        <EuiFlexItem grow>
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiText color="danger">
              {i18n.translate('xpack.streams.streamDetail.preview.error', {
                defaultMessage: 'Error loading preview',
              })}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    } else if (previewSampleFetch.value?.documents && previewSampleFetch.value.documents.length) {
      content = (
        <EuiFlexItem grow>
          <PreviewTable documents={previewSampleFetch.value?.documents ?? []} />
        </EuiFlexItem>
      );
    }
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow>
            <EuiText
              size="s"
              className={css`
                font-weight: bold;
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiIcon type="inspect" />
                {i18n.translate('xpack.streams.streamDetail.preview.header', {
                  defaultMessage: 'Data Preview',
                })}
                {previewSampleFetch.loading && <EuiLoadingSpinner size="s" />}
              </EuiFlexGroup>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar
              onQuerySubmit={({ dateRange }, isUpdate) => {
                if (!isUpdate) {
                  previewSampleFetch.refresh();
                  return;
                }

                if (dateRange) {
                  setTimeRange({
                    from: dateRange.from,
                    to: dateRange?.to,
                    mode: dateRange.mode,
                  });
                }
              }}
              onRefresh={() => {
                previewSampleFetch.refresh();
              }}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem grow>{content}</EuiFlexItem>
    </>
  );
}

function PreviewPanelIllustration({
  previewSampleFetch,
  routingAppState,
}: {
  routingAppState: ReturnType<typeof useRoutingState>;
  previewSampleFetch: AbortableAsyncState<{
    documents: unknown[];
  }>;
}) {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiFlexItem
        grow={false}
        className={css`
          max-width: 350px;
        `}
      >
        <AssetImage />
        {previewSampleFetch.loading ? (
          <EuiText size="xs" textAlign="center">
            <EuiLoadingSpinner size="s" />
          </EuiText>
        ) : (
          <>
            {routingAppState.debouncedChildUnderEdit &&
              routingAppState.debouncedChildUnderEdit.isNew && (
                <EuiText size="xs" textAlign="center">
                  {i18n.translate('xpack.streams.streamDetail.preview.empty', {
                    defaultMessage: 'No documents to preview',
                  })}
                </EuiText>
              )}
            {routingAppState.debouncedChildUnderEdit &&
              !routingAppState.debouncedChildUnderEdit.isNew && (
                <EuiText size="m" textAlign="center">
                  {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessage', {
                    defaultMessage: 'Preview is not available while editing streams',
                  })}
                </EuiText>
              )}
            {!routingAppState.debouncedChildUnderEdit && (
              <>
                <EuiText size="m" textAlign="center">
                  {i18n.translate('xpack.streams.streamDetail.preview.editPreviewMessageEmpty', {
                    defaultMessage: 'Your preview will appear here',
                  })}
                </EuiText>
                <EuiText size="xs" textAlign="center">
                  {i18n.translate(
                    'xpack.streams.streamDetail.preview.editPreviewMessageEmptyDescription',
                    {
                      defaultMessage:
                        'Create a new child stream to see what will be routed to it based on the conditions',
                    }
                  )}
                </EuiText>
              </>
            )}
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ChildStreamList({
  definition,
  availableStreams,
  routingAppState: {
    childUnderEdit,
    setChildUnderEdit,
    childStreams,
    onChildStreamDragEnd,
    onChildStreamDragStart,
    draggingChildStream,
  },
}: {
  definition: ReadStreamDefinition;
  routingAppState: ReturnType<typeof useRoutingState>;
  availableStreams: string[];
}) {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      className={css`
        overflow: auto;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          className={css`
            height: 40px;
            align-content: center;
            font-weight: bold;
          `}
        >
          {i18n.translate('xpack.streams.streamDetailRouting.rules.header', {
            defaultMessage: 'Routing rules',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        className={css`
          overflow: auto;
        `}
      >
        <CurrentStreamEntry definition={definition} />
        <EuiDragDropContext onDragEnd={onChildStreamDragEnd} onDragStart={onChildStreamDragStart}>
          <EuiDroppable droppableId="routing_children_reordering" spacing="none">
            <EuiFlexGroup direction="column" gutterSize="xs">
              {childStreams.map((child, i) => (
                <EuiFlexItem key={`${child.name}-${i}-flex-item`} grow={false}>
                  <EuiDraggable
                    key={child.name}
                    index={i}
                    draggableId={child.name}
                    hasInteractiveChildren={true}
                    customDragHandle={true}
                    spacing="none"
                  >
                    {(provided) => (
                      <NestedView key={i} isBeingDragged={draggingChildStream === child.name}>
                        <RoutingStreamEntry
                          draggableProvided={provided}
                          child={
                            !childUnderEdit?.isNew && child.name === childUnderEdit?.child.name
                              ? childUnderEdit.child
                              : child
                          }
                          edit={!childUnderEdit?.isNew && child.name === childUnderEdit?.child.name}
                          onEditStateChange={() => {
                            if (child.name === childUnderEdit?.child.name) {
                              setChildUnderEdit(undefined);
                            } else {
                              setChildUnderEdit({ isNew: false, child });
                            }
                          }}
                          onChildChange={(newChild) => {
                            setChildUnderEdit({
                              isNew: false,
                              child: newChild,
                            });
                          }}
                          availableStreams={availableStreams}
                        />
                      </NestedView>
                    )}
                  </EuiDraggable>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiDroppable>
        </EuiDragDropContext>
        {childUnderEdit?.isNew ? (
          <NestedView last>
            <NewRoutingStreamEntry
              child={childUnderEdit.child}
              onChildChange={(newChild) => {
                if (!newChild) {
                  setChildUnderEdit(undefined);
                  return;
                }
                setChildUnderEdit({
                  isNew: true,
                  child: newChild,
                });
              }}
            />
          </NestedView>
        ) : (
          <NestedView last>
            <EuiPanel hasShadow={false} hasBorder paddingSize="none">
              <EuiButtonEmpty
                iconType="plus"
                data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                onClick={() => {
                  setChildUnderEdit({
                    isNew: true,
                    child: {
                      name: `${definition.name}.child`,
                      condition: {
                        field: '',
                        operator: 'eq',
                        value: '',
                      },
                    },
                  });
                }}
              >
                {i18n.translate('xpack.streams.streamDetailRouting.addRule', {
                  defaultMessage: 'Create a new child stream',
                })}
              </EuiButtonEmpty>
            </EuiPanel>
          </NestedView>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

function CurrentStreamEntry({ definition }: { definition: ReadStreamDefinition }) {
  const router = useStreamsAppRouter();
  const breadcrumbs: EuiBreadcrumb[] = definition.name.split('.').map((_part, pos, parts) => {
    const parentId = parts.slice(0, pos + 1).join('.');
    const isBreadcrumbsTail = parentId === definition.name;

    return {
      text: parentId,
      href: isBreadcrumbsTail
        ? undefined
        : router.link('/{key}/{tab}/{subtab}', {
            path: {
              key: parentId,
              tab: 'management',
              subtab: 'route',
            },
          }),
    };
  });

  return (
    <>
      {!isRoot(definition.name) && <EuiBreadcrumbs breadcrumbs={breadcrumbs} truncate={false} />}
      <EuiFlexItem grow={false}>
        <EuiPanel hasShadow={false} hasBorder paddingSize="s">
          <EuiText size="s">{definition.name}</EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.streamDetailRouting.currentStream', {
              defaultMessage: 'Current stream',
            })}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </>
  );
}

function RoutingStreamEntry({
  draggableProvided,
  child,
  onChildChange,
  onEditStateChange,
  edit,
  availableStreams,
}: {
  draggableProvided: DraggableProvided;
  child: StreamChild;
  onChildChange: (child: StreamChild) => void;
  onEditStateChange: () => void;
  edit?: boolean;
  availableStreams: string[];
}) {
  const children = availableStreams.filter((stream) => isDescendantOf(child.name, stream)).length;
  const router = useStreamsAppRouter();
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow>
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiPanel
                color="transparent"
                paddingSize="s"
                {...draggableProvided.dragHandleProps}
                aria-label="Drag Handle"
              >
                <EuiIcon type="grab" />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiLink
                href={router.link('/{key}/{tab}/{subtab}', {
                  path: { key: child.name, tab: 'management', subtab: 'route' },
                })}
                data-test-subj="streamsAppRoutingStreamEntryButton"
              >
                <EuiText size="s">{child.name}</EuiText>
              </EuiLink>
              {children > 0 && (
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.streams.streamDetailRouting.numberChildren', {
                    defaultMessage: '{children, plural, one {# child} other {# children}}',
                    values: { children },
                  })}
                </EuiBadge>
              )}
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="pencil"
          onClick={() => {
            onEditStateChange();
          }}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
            defaultMessage: 'Edit',
          })}
        />
      </EuiFlexGroup>
      {child.condition && (
        <ConditionEditor
          readonly={!edit}
          condition={child.condition}
          onConditionChange={(condition) => {
            onChildChange({
              ...child,
              condition,
            });
          }}
        />
      )}
      {!child.condition && (
        <EuiText>
          {i18n.translate('xpack.streams.streamDetailRouting.noCondition', {
            defaultMessage: 'No condition, no documents will be routed',
          })}
        </EuiText>
      )}
    </EuiPanel>
  );
}

function NewRoutingStreamEntry({
  child,
  onChildChange,
}: {
  child: StreamChild;
  onChildChange: (child?: StreamChild) => void;
}) {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.streams.streamDetailRouting.name', {
            defaultMessage: 'Stream name',
          })}
        >
          <EuiFieldText
            data-test-subj="streamsAppRoutingStreamEntryNameField"
            value={child.name}
            fullWidth
            compressed
            onChange={(e) => {
              onChildChange({
                ...child,
                name: e.target.value,
              });
            }}
          />
        </EuiFormRow>
        {child.condition && (
          <ConditionEditor
            readonly={false}
            condition={child.condition}
            onConditionChange={(condition) => {
              onChildChange({
                ...child,
                condition,
              });
            }}
          />
        )}
        {!child.condition && (
          <EuiText>
            {i18n.translate('xpack.streams.streamDetailRouting.noCondition', {
              defaultMessage: 'No condition, no documents will be routed',
            })}
          </EuiText>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
