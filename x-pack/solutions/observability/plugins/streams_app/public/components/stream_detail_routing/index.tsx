/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
  EuiResizableContainer,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { ReadStreamDefinition } from '@kbn/streams-plugin/common';
import React from 'react';
import { StreamChild } from '@kbn/streams-plugin/common/types';
import { AbortableAsyncState } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { ConditionEditor } from '../condition_editor';
import { useDebounced } from '../../util/use_debounce';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { NestedView } from '../nested_view';
import illustration from '../assets/illustration.png';
import { PreviewTable } from '../preview_table';
import { StreamDeleteModal } from '../stream_delete_modal';

function useRoutingState() {
  const [childUnderEdit, setChildUnderEdit] = React.useState<
    { isNew: boolean; child: StreamChild } | undefined
  >();

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
  };
}

export function StreamDetailRouting({
  definition,
  refreshDefinition,
}: {
  definition?: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const theme = useEuiTheme().euiTheme;
  const routingAppState = useRoutingState();

  if (!definition) {
    return null;
  }

  const closeModal = () => routingAppState.setShowDeleteModal(false);

  return (
    <>
      {routingAppState.showDeleteModal && routingAppState.childUnderEdit && (
        <StreamDeleteModal
          closeModal={closeModal}
          clearChildUnderEdit={() => routingAppState.setChildUnderEdit(undefined)}
          refreshDefinition={refreshDefinition}
          id={routingAppState.childUnderEdit.child.id}
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
                  <ChildStreamList definition={definition} routingAppState={routingAppState} />
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
    </>
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
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  if (!routingAppState.childUnderEdit) {
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
          id: definition.id,
        },
        body: {
          condition: routingAppState.childUnderEdit.child.condition,
          stream: {
            id: routingAppState.childUnderEdit.child.id,
            processing: [],
            fields: [],
          },
        },
      },
    });
  }

  function updateChild() {
    if (!routingAppState.childUnderEdit) {
      return;
    }

    const childUnderEdit = routingAppState.childUnderEdit.child;
    const { inheritedFields, id, ...definitionToUpdate } = definition;
    return streamsRepositoryClient.fetch('PUT /api/streams/{id}', {
      signal,
      params: {
        path: {
          id: definition.id,
        },
        body: {
          ...definitionToUpdate,
          children: definition.children.map((child) =>
            child.id === childUnderEdit.id ? childUnderEdit : child
          ),
        },
      },
    });
  }

  async function saveOrUpdateChild() {
    if (!routingAppState.childUnderEdit) {
      return;
    }
    try {
      routingAppState.setSaveInProgress(true);

      if (routingAppState.childUnderEdit.isNew) {
        await forkChild();
      } else {
        await updateChild();
      }

      routingAppState.setSaveInProgress(false);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
          defaultMessage: 'Stream saved',
        }),
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
      {!routingAppState.childUnderEdit.isNew && (
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
          routingAppState.setChildUnderEdit(undefined);
        }}
      >
        {i18n.translate('xpack.streams.streamDetailRouting.cancel', {
          defaultMessage: 'Cancel',
        })}
      </EuiButtonEmpty>
      <EuiButton
        isLoading={routingAppState.saveInProgress}
        onClick={saveOrUpdateChild}
        data-test-subj="streamsAppStreamDetailRoutingSaveButton"
      >
        {routingAppState.childUnderEdit.isNew
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
            id: definition.id,
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
            <EuiText size="s">
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
        <EuiImage
          src={illustration}
          alt="Illustration"
          className={css`
            width: 250px;
          `}
        />
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
  routingAppState: { childUnderEdit, setChildUnderEdit },
}: {
  definition: ReadStreamDefinition;
  routingAppState: ReturnType<typeof useRoutingState>;
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
        <PreviousStreamEntry definition={definition} />
        <CurrentStreamEntry definition={definition} />
        {definition.children.map((child, i) => (
          <NestedView key={i}>
            <RoutingStreamEntry
              child={
                !childUnderEdit?.isNew && child.id === childUnderEdit?.child.id
                  ? childUnderEdit.child
                  : child
              }
              edit={!childUnderEdit?.isNew && child.id === childUnderEdit?.child.id}
              onEditStateChange={() => {
                if (child.id === childUnderEdit?.child.id) {
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
            />
          </NestedView>
        ))}
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
                      id: `${definition.id}.child`,
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
  return (
    <EuiFlexItem grow={false}>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s">
        <EuiText size="s">{definition.id}</EuiText>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.streamDetailRouting.currentStream', {
            defaultMessage: 'Current stream',
          })}
        </EuiText>
      </EuiPanel>
    </EuiFlexItem>
  );
}

function PreviousStreamEntry({ definition }: { definition: ReadStreamDefinition }) {
  const router = useStreamsAppRouter();

  const parentId = definition.id.split('.').slice(0, -1).join('.');
  if (parentId === '') {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="streamsAppPreviousStreamEntryPreviousStreamButton"
            href={router.link('/{key}/{tab}/{subtab}', {
              path: {
                key: parentId,
                tab: 'management',
                subtab: 'route',
              },
            })}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.previousStream', {
              defaultMessage: '.. (Previous stream)',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

function RoutingStreamEntry({
  child,
  onChildChange,
  onEditStateChange,
  edit,
}: {
  child: StreamChild;
  onChildChange: (child: StreamChild) => void;
  onEditStateChange: () => void;
  edit?: boolean;
}) {
  const router = useStreamsAppRouter();
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow>
          <EuiText size="s">{child.id}</EuiText>
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
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="popout"
          href={router.link('/{key}/{tab}/{subtab}', {
            path: { key: child.id, tab: 'management', subtab: 'route' },
          })}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.goto', {
            defaultMessage: 'Go to stream',
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
            value={child.id}
            fullWidth
            compressed
            onChange={(e) => {
              onChildChange({
                ...child,
                id: e.target.value,
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
