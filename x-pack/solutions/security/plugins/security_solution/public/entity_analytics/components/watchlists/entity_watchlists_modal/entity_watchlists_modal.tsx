/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityWatchlistMembership } from '../../../../../common/api/entity_analytics/watchlists/entities/memberships.gen';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { SecurityPageName } from '../../../../../common/constants';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { EDIT_WATCHLIST_URL_PARAM } from '../flyout/constants';
import { getWatchlistName } from '../../../../../common/entity_analytics/watchlists/constants';
import { useGetWatchlists } from '../../../api/hooks/use_get_watchlists';
import {
  useEntityWatchlistMemberships,
  useSaveEntityWatchlists,
} from './use_entity_watchlist_memberships';
import { SuggestWatchlistRuleButton } from './suggest_watchlist_rule_button';

const MANUAL_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityWatchlists.manual',
  {
    defaultMessage: 'Added manually',
  }
);

const MAX_WATCHLIST_NAME_LENGTH = 256;

export interface EntityWatchlistsModalProps {
  entityId: string;
  entityName: string;
  entityType: EntityType;
  /**
   * Watchlists the entity record says it is on. Memberships the provenance lookup knows nothing
   * about (for example ones added outside the watchlist sync) show up as read-only.
   */
  currentWatchlistIds?: readonly string[];
  onClose: () => void;
  onSaved?: () => void;
}

/** Opens the watchlist's edit flyout on the Watchlists management tab, in a new browser tab. */
const WatchlistLink = ({ watchlistId, name }: { watchlistId: string; name: string }) => {
  const getLinkProps = useGetSecuritySolutionLinkProps();
  const { href } = getLinkProps({
    deepLinkId: SecurityPageName.entityAnalyticsManagement,
    path: `/watchlists?${EDIT_WATCHLIST_URL_PARAM}=${encodeURIComponent(watchlistId)}`,
  });

  return (
    <EuiLink href={href} target="_blank" external data-test-subj="entityWatchlistsLink">
      {name}
    </EuiLink>
  );
};

const getSourceLabel = ({ name, type }: { name?: string; type?: string }): string =>
  name ?? type ?? '';

const MembershipRow = ({
  watchlistName,
  membership,
  isRemoved,
  onToggleRemove,
}: {
  watchlistName: string;
  membership: EntityWatchlistMembership;
  isRemoved: boolean;
  onToggleRemove: () => void;
}) => {
  const hasSources = membership.sources.length > 0;
  const sourceNames = membership.sources.map(getSourceLabel).filter(Boolean).join(', ');

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj="entityWatchlistsMembershipRow"
    >
      <EuiFlexItem>
        <EuiText size="s">
          <span
            css={isRemoved ? { textDecoration: 'line-through' } : undefined}
            data-test-subj="entityWatchlistsMembershipName"
          >
            <WatchlistLink watchlistId={membership.watchlistId} name={watchlistName} />
          </span>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          {membership.manual && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{MANUAL_LABEL}</EuiBadge>
            </EuiFlexItem>
          )}
          {membership.sources.map((source) => (
            <EuiFlexItem grow={false} key={source.id}>
              <EuiBadge color="hollow" iconType="refresh">
                {getSourceLabel(source)}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 96, alignItems: 'flex-end' }}>
        {membership.manual ? (
          <EuiButtonEmpty
            size="xs"
            color={isRemoved ? 'primary' : 'danger'}
            iconType={isRemoved ? 'undo' : 'trash'}
            onClick={onToggleRemove}
            data-test-subj="entityWatchlistsToggleRemove"
          >
            {isRemoved
              ? i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.undo', {
                  defaultMessage: 'Undo',
                })
              : i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.remove', {
                  defaultMessage: 'Remove',
                })}
          </EuiButtonEmpty>
        ) : (
          <EuiIconTip
            type="lock"
            data-test-subj="entityWatchlistsLockedIcon"
            content={
              hasSources
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.entityWatchlists.lockedTooltip',
                    {
                      defaultMessage:
                        'Added by {sources}. To remove this entity, edit the watchlist source.',
                      values: { sources: sourceNames },
                    }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.entityWatchlists.lockedUnknownTooltip',
                    {
                      defaultMessage:
                        'Added automatically. To remove this entity, edit the watchlist source.',
                    }
                  )
            }
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Lets a user see why an entity is on each watchlist, remove its manual memberships and add it to
 * other watchlists. Memberships that come from a rule or source are shown as locked.
 */
export const EntityWatchlistsModal = ({
  entityId,
  entityName,
  entityType,
  currentWatchlistIds = [],
  onClose,
  onSaved,
}: EntityWatchlistsModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  const { data: watchlists = [] } = useGetWatchlists();
  const { data: knownMemberships, isLoading, isError } = useEntityWatchlistMemberships(entityId);

  const memberships = useMemo<EntityWatchlistMembership[] | undefined>(() => {
    if (!knownMemberships) {
      return undefined;
    }
    const known = new Set(knownMemberships.map(({ watchlistId }) => watchlistId));
    const unknownProvenance = currentWatchlistIds
      .filter((watchlistId) => !known.has(watchlistId))
      .map((watchlistId) => ({ watchlistId, manual: false, sources: [] }));
    return [...knownMemberships, ...unknownProvenance];
  }, [knownMemberships, currentWatchlistIds]);

  const [removals, setRemovals] = useState<ReadonlySet<string>>(new Set());
  const [additions, setAdditions] = useState<readonly string[]>([]);
  const [newNames, setNewNames] = useState<readonly string[]>([]);

  const { mutate: save, isLoading: isSaving } = useSaveEntityWatchlists({
    onSuccess: () => {
      onSaved?.();
      onClose();
    },
  });

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    watchlists.forEach(({ id, name }) => id && map.set(id, name));
    return map;
  }, [watchlists]);

  const getName = useCallback(
    (watchlistId: string) => nameById.get(watchlistId) ?? getWatchlistName(watchlistId),
    [nameById]
  );

  const memberIds = useMemo(
    () => new Set((memberships ?? []).map(({ watchlistId }) => watchlistId)),
    [memberships]
  );

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      watchlists
        .filter(({ id }) => id && !memberIds.has(id) && !additions.includes(id))
        .map(({ id, name }) => ({ key: id, value: id, label: name })),
    [watchlists, memberIds, additions]
  );

  const toggleRemoval = useCallback((watchlistId: string) => {
    setRemovals((previous) => {
      const next = new Set(previous);
      if (!next.delete(watchlistId)) {
        next.add(watchlistId);
      }
      return next;
    });
  }, []);

  const onSelectWatchlist = useCallback((selected: Array<EuiComboBoxOptionOption<string>>) => {
    const [watchlist] = selected;
    if (watchlist?.value) {
      const { value } = watchlist;
      setAdditions((previous) => [...previous, value]);
    }
  }, []);

  const onCreateWatchlist = useCallback(
    (searchValue: string) => {
      const name = searchValue.trim();
      if (!name || name.length > MAX_WATCHLIST_NAME_LENGTH) {
        return;
      }
      const existing = watchlists.find(
        (watchlist) => watchlist.name.toLowerCase() === name.toLowerCase()
      );
      if (existing?.id) {
        // Typing the name of a watchlist that exists selects it instead of creating a duplicate.
        const { id } = existing;
        if (!memberIds.has(id) && !additions.includes(id)) {
          setAdditions((previous) => [...previous, id]);
        }
        return;
      }
      setNewNames((previous) =>
        previous.some((current) => current.toLowerCase() === name.toLowerCase())
          ? previous
          : [...previous, name]
      );
    },
    [watchlists, memberIds, additions]
  );

  const removeNewName = useCallback(
    (name: string) => setNewNames((previous) => previous.filter((current) => current !== name)),
    []
  );

  const removeAddition = useCallback(
    (watchlistId: string) =>
      setAdditions((previous) => previous.filter((id) => id !== watchlistId)),
    []
  );

  const hasChanges = removals.size > 0 || additions.length > 0 || newNames.length > 0;

  const onSave = useCallback(
    () =>
      save({ euid: entityId, addTo: additions, createNames: newNames, removeFrom: [...removals] }),
    [save, entityId, additions, newNames, removals]
  );

  const lastAddedName =
    newNames.length > 0
      ? newNames[newNames.length - 1]
      : additions.length > 0
      ? getName(additions[additions.length - 1])
      : undefined;

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      data-test-subj="entityWatchlistsModal"
      maxWidth={640}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityWatchlists.title"
            defaultMessage="Watchlists for {entityName}"
            values={{ entityName }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {isLoading && <EuiLoadingSpinner size="l" data-test-subj="entityWatchlistsLoading" />}
        {isError && (
          <EuiText color="danger" size="s" data-test-subj="entityWatchlistsError">
            {i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.loadError', {
              defaultMessage: 'Could not load the watchlists of this entity.',
            })}
          </EuiText>
        )}
        {memberships &&
          memberships.length === 0 &&
          additions.length === 0 &&
          newNames.length === 0 && (
            <EuiText size="s" color="subdued" data-test-subj="entityWatchlistsEmpty">
              {i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.empty', {
                defaultMessage: 'This entity is not on any watchlist.',
              })}
            </EuiText>
          )}
        {memberships?.map((membership) => (
          <React.Fragment key={membership.watchlistId}>
            <MembershipRow
              watchlistName={getName(membership.watchlistId)}
              membership={membership}
              isRemoved={removals.has(membership.watchlistId)}
              onToggleRemove={() => toggleRemoval(membership.watchlistId)}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
        {additions.map((watchlistId) => (
          <React.Fragment key={watchlistId}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj="entityWatchlistsPendingRow"
            >
              <EuiFlexItem>
                <EuiText size="s">
                  <WatchlistLink watchlistId={watchlistId} name={getName(watchlistId)} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="success">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.entityWatchlists.willBeAdded',
                    { defaultMessage: 'Will be added manually' }
                  )}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="cross"
                  onClick={() => removeAddition(watchlistId)}
                  data-test-subj="entityWatchlistsUndoAdd"
                >
                  {i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.undo', {
                    defaultMessage: 'Undo',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
        {newNames.map((name) => (
          <React.Fragment key={name}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj="entityWatchlistsNewRow"
            >
              <EuiFlexItem>
                <EuiText size="s">{name}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="success">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.entityWatchlists.willBeCreated',
                    { defaultMessage: 'New watchlist' }
                  )}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="cross"
                  onClick={() => removeNewName(name)}
                  data-test-subj="entityWatchlistsUndoCreate"
                >
                  {i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.undo', {
                    defaultMessage: 'Undo',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityWatchlists.addLabel',
            {
              defaultMessage: 'Add to watchlist',
            }
          )}
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={options}
            selectedOptions={[]}
            onChange={onSelectWatchlist}
            onCreateOption={onCreateWatchlist}
            customOptionText={i18n.translate(
              'xpack.securitySolution.entityAnalytics.entityWatchlists.createOption',
              { defaultMessage: 'Create watchlist "{searchValue}"' }
            )}
            placeholder={i18n.translate(
              'xpack.securitySolution.entityAnalytics.entityWatchlists.addPlaceholder',
              { defaultMessage: 'Select or create a watchlist' }
            )}
            data-test-subj="entityWatchlistsAddCombo"
          />
        </EuiFormRow>
        <SuggestWatchlistRuleButton
          entityName={entityName}
          entityType={entityType}
          watchlistName={lastAddedName}
          onOpened={onClose}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="entityWatchlistsCancel">
          {i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onSave}
          isLoading={isSaving}
          isDisabled={!hasChanges}
          data-test-subj="entityWatchlistsSave"
        >
          {i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
