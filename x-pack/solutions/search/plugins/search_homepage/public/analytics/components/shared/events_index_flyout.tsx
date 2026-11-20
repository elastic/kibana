/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormEvent, PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnSuccessCallout } from '@kbn/ui-callout';
import {
  ANALYTICS_EVENTS_INDEX_PATH,
  DEFAULT_EVENTS_INDEX_NAME,
  getEventsIndexNameProblem,
} from '../../../../common/analytics_events_index';
import type {
  AnalyticsEventsIndexCreateRequest,
  AnalyticsEventsIndexCreateResult,
  EventsIndexNameProblem,
} from '../../../../common/analytics_events_index';
import { useKibana } from '../../../hooks/use_kibana';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import { buildEventsRequestExample } from '../../events_request_example';
import { ConnectionDetails } from './connection_details';
import type { EventsIndexFlyoutApi } from './events_index_flyout_context';
import { EventsIndexFlyoutContext } from './events_index_flyout_context';

const getNameProblemMessage = (problem: EventsIndexNameProblem): string => {
  switch (problem) {
    case 'empty':
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.nameEmpty', {
        defaultMessage: 'Enter an index name.',
      });
    case 'tooLong':
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.nameTooLong', {
        defaultMessage: 'Use a name of 255 bytes or fewer.',
      });
    case 'uppercase':
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.nameUppercase', {
        defaultMessage: 'Use lowercase letters only.',
      });
    case 'invalidCharacters':
      return i18n.translate(
        'xpack.searchHomepage.analytics.eventsIndexFlyout.nameInvalidCharacters',
        {
          defaultMessage: 'Remove spaces and these characters: {characters}',
          values: { characters: '\\ / * ? " < > | , # :' },
        }
      );
    case 'invalidStart':
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.nameInvalidStart', {
        defaultMessage: 'Start the name with a letter or a number.',
      });
  }
};

interface RequestFailure {
  response?: { status?: number };
  body?: { message?: string };
}

const getCreateErrorMessage = (name: string, { response, body }: RequestFailure): string => {
  switch (response?.status) {
    case 409:
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.nameTaken', {
        defaultMessage: 'An index named {name} already exists.',
        values: { name },
      });
    case 403:
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.missingPrivilege', {
        defaultMessage: 'Your role needs the create_index privilege on {name}.',
        values: { name },
      });
    case 400:
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.rejected', {
        defaultMessage: 'Elasticsearch did not accept the index: {reason}',
        values: { reason: body?.message ?? '' },
      });
    default:
      return i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.createFailed', {
        defaultMessage: 'The index could not be created. Try again.',
      });
  }
};

const FORM_ID = 'analyticsEventsIndexForm';

const EventsIndexFlyout = ({ onClose }: { onClose: () => void }): React.JSX.Element => {
  const { http, console: consolePlugin } = useKibana().services;
  const titleId = useGeneratedHtmlId({ prefix: 'analyticsEventsIndexFlyoutTitle' });
  const [name, setName] = useState(DEFAULT_EVENTS_INDEX_NAME);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [created, setCreated] = useState<{ index: string; request: string }>();
  const createdRef = useRef<HTMLDivElement | null>(null);

  const nameProblem = getEventsIndexNameProblem(name);
  // An empty field is only a problem once the user has asked to create the index.
  const shownProblem = nameProblem === 'empty' && !hasSubmitted ? undefined : nameProblem;
  const error =
    shownProblem !== undefined ? getNameProblemMessage(shownProblem) : createError ?? undefined;

  useEffect(() => {
    if (created !== undefined) {
      createdRef.current?.focus();
    }
  }, [created]);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setHasSubmitted(true);
    if (nameProblem !== undefined || isCreating) {
      return;
    }
    setIsCreating(true);
    setCreateError(undefined);
    try {
      const body: AnalyticsEventsIndexCreateRequest = { name };
      const { index } = await http.post<AnalyticsEventsIndexCreateResult>(
        ANALYTICS_EVENTS_INDEX_PATH,
        { body: JSON.stringify(body) }
      );
      setCreated({ index, request: buildEventsRequestExample(index, Date.now()) });
    } catch (requestError) {
      setCreateError(getCreateErrorMessage(name, requestError));
    } finally {
      setIsCreating(false);
    }
  };

  const canOpenConsole =
    consolePlugin?.openEmbeddedConsole !== undefined &&
    consolePlugin.isEmbeddedConsoleAvailable?.() === true;

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="analyticsEventsIndexFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.title', {
              defaultMessage: 'Create an events index',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {created === undefined ? (
          <EuiForm component="form" id={FORM_ID} onSubmit={onSubmit}>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.description', {
                  defaultMessage:
                    'The index uses columnar mode, which is in technical preview. Send the time of each event in @timestamp.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.nameLabel', {
                defaultMessage: 'Index name',
              })}
              isInvalid={error !== undefined}
              error={error}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                autoFocus
                value={name}
                onChange={({ target: { value } }) => {
                  setName(value);
                  setCreateError(undefined);
                }}
                isInvalid={error !== undefined}
                data-test-subj="analyticsEventsIndexName"
              />
            </EuiFormRow>
          </EuiForm>
        ) : (
          <>
            <div ref={createdRef} tabIndex={-1}>
              <KbnSuccessCallout
                size="s"
                announceOnMount
                data-test-subj="analyticsEventsIndexCreated"
                title={i18n.translate(
                  'xpack.searchHomepage.analytics.eventsIndexFlyout.createdTitle',
                  { defaultMessage: 'Index {name} created', values: { name: created.index } }
                )}
              />
            </div>
            <EuiSpacer size="l" />
            <ConnectionDetails page="home" placement="EventsIndex" />
            <EuiSpacer size="l" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>
                    {i18n.translate(
                      'xpack.searchHomepage.analytics.eventsIndexFlyout.requestTitle',
                      { defaultMessage: 'Send your first events' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {canOpenConsole && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="commandLine"
                    onClick={() => {
                      // The embedded Console opens underneath the flyout's mask.
                      onClose();
                      consolePlugin?.openEmbeddedConsole?.(created.request);
                    }}
                    data-test-subj="analyticsEventsIndexOpenConsole"
                    data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-eventsIndexFlyout-openConsole`}
                  >
                    {i18n.translate(
                      'xpack.searchHomepage.analytics.eventsIndexFlyout.openConsoleButton',
                      { defaultMessage: 'Open in Console' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="m"
              isCopyable
              data-test-subj="analyticsEventsIndexRequest"
            >
              {created.request}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={onClose}
              data-test-subj="analyticsEventsIndexFlyoutClose"
              data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-eventsIndexFlyout-close`}
            >
              {i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.closeButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {created === undefined && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                type="submit"
                form={FORM_ID}
                isLoading={isCreating}
                data-test-subj="analyticsEventsIndexCreate"
                data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-eventsIndexFlyout-create`}
              >
                {i18n.translate('xpack.searchHomepage.analytics.eventsIndexFlyout.createButton', {
                  defaultMessage: 'Create index',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

/**
 * Owns the flyout that creates an empty index for events and shows how to write to it. It sits
 * above the pages, so the request stays in view when the first events replace the page underneath.
 */
export const EventsIndexFlyoutProvider = ({ children }: PropsWithChildren): React.JSX.Element => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((opener?: HTMLElement | null): void => {
    openerRef.current = opener ?? null;
    setIsOpen(true);
  }, []);

  const close = useCallback((): void => {
    setIsOpen(false);
    // The opener is gone when the page was replaced while the flyout was open.
    if (openerRef.current?.isConnected) {
      openerRef.current.focus();
    }
    openerRef.current = null;
  }, []);

  useEffect(() => {
    openerRef.current = null;
    setIsOpen(false);
  }, [pathname]);

  const api = useMemo((): EventsIndexFlyoutApi => ({ isAvailable: true, open }), [open]);

  return (
    <EventsIndexFlyoutContext.Provider value={api}>
      {children}
      {isOpen && <EventsIndexFlyout onClose={close} />}
    </EventsIndexFlyoutContext.Provider>
  );
};
