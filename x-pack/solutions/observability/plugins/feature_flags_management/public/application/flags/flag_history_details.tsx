/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiCodeBlock, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { diffJson, type Change } from 'diff';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FlagHistoryChange, FlagHistoryField } from './flag_history_change';

const fieldLabel = (field: FlagHistoryField): string => {
  switch (field) {
    case 'apps':
      return i18n.translate('xpack.featureFlagsManagement.flags.history.field.appsLabel', {
        defaultMessage: 'applications',
      });
    case 'variations':
      return i18n.translate('xpack.featureFlagsManagement.flags.history.field.variationsLabel', {
        defaultMessage: 'variations',
      });
    case 'name':
      return i18n.translate('xpack.featureFlagsManagement.flags.history.field.nameLabel', {
        defaultMessage: 'name',
      });
    case 'description':
      return i18n.translate('xpack.featureFlagsManagement.flags.history.field.descriptionLabel', {
        defaultMessage: 'description',
      });
    case 'value_type':
      return i18n.translate('xpack.featureFlagsManagement.flags.history.field.valueTypeLabel', {
        defaultMessage: 'value type',
      });
    case 'tags':
      return i18n.translate('xpack.featureFlagsManagement.flags.history.field.tagsLabel', {
        defaultMessage: 'tags',
      });
  }
};

const Conjunction = ({ items }: { items: React.ReactNode[] }) => {
  if (items.length <= 1) {
    return <>{items[0] ?? null}</>;
  }
  const last = items[items.length - 1];
  return (
    <>
      {items.slice(0, -1).map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 ? ', ' : null}
          {item}
        </React.Fragment>
      ))}
      {items.length > 2 ? ', ' : ' '}
      <FormattedMessage
        id="xpack.featureFlagsManagement.flags.history.listAndLabel"
        defaultMessage="and {last}"
        values={{ last }}
      />
    </>
  );
};

const EnvironmentNames = ({ environments }: { environments: string[] }) => (
  <Conjunction
    items={environments.map((environment) => (
      <EuiCode key={environment}>{environment}</EuiCode>
    ))}
  />
);

export const FlagHistorySummary = ({ change }: { change: FlagHistoryChange }) => {
  if (change.type === 'created') {
    return (
      <FormattedMessage
        id="xpack.featureFlagsManagement.flags.history.createdSummary"
        defaultMessage="Created the flag"
      />
    );
  }
  if (change.type === 'deleted') {
    return (
      <FormattedMessage
        id="xpack.featureFlagsManagement.flags.history.deletedSummary"
        defaultMessage="Deleted the flag"
      />
    );
  }

  const phrases: React.ReactNode[] = change.fields.map((field) => fieldLabel(field));
  if (change.environments.length > 0) {
    phrases.push(
      <FormattedMessage
        id="xpack.featureFlagsManagement.flags.history.environmentRulesLabel"
        defaultMessage="evaluation rules in {environments}"
        values={{ environments: <EnvironmentNames environments={change.environments} /> }}
      />
    );
  }
  if (phrases.length === 0) {
    return (
      <FormattedMessage
        id="xpack.featureFlagsManagement.flags.history.updatedSummary"
        defaultMessage="Updated the flag"
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.featureFlagsManagement.flags.history.changedSummary"
      defaultMessage="Changed {changes}"
      values={{ changes: <Conjunction items={phrases} /> }}
    />
  );
};

const diffPartType = (part: Change): 'added' | 'removed' | 'context' =>
  part.added ? 'added' : part.removed ? 'removed' : 'context';

const SnapshotBlock = ({
  snapshot,
  label,
}: {
  snapshot: Record<string, unknown> | undefined;
  label: string;
}) => (
  <>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiCodeBlock
      language="json"
      fontSize="s"
      paddingSize="s"
      overflowHeight={320}
      aria-label={label}
    >
      {JSON.stringify(snapshot ?? {}, null, 2)}
    </EuiCodeBlock>
  </>
);

export const FlagHistoryDetails = ({ change }: { change: FlagHistoryChange }) => {
  const { euiTheme } = useEuiTheme();
  const canDiff =
    change.type === 'changed' && change.before !== undefined && change.after !== undefined;
  const hasChanges =
    canDiff &&
    (change.fields.length > 0 ||
      change.environments.length > 0 ||
      JSON.stringify(change.before) !== JSON.stringify(change.after));

  if (!canDiff || !hasChanges) {
    const snapshotLabels = {
      created: i18n.translate('xpack.featureFlagsManagement.flags.history.createdSnapshotLabel', {
        defaultMessage: 'Flag when it was created',
      }),
      deleted: i18n.translate('xpack.featureFlagsManagement.flags.history.deletedSnapshotLabel', {
        defaultMessage: 'Flag when it was deleted',
      }),
      changed: i18n.translate('xpack.featureFlagsManagement.flags.history.snapshotLabel', {
        defaultMessage: 'Flag after this change',
      }),
    };
    const label = snapshotLabels[change.type];
    return <SnapshotBlock snapshot={change.after} label={label} />;
  }

  const parts = diffJson(change.before as object, change.after as object);
  const partColor = {
    added: {
      background: euiTheme.colors.backgroundBaseSuccess,
      color: euiTheme.colors.textSuccess,
    },
    removed: {
      background: euiTheme.colors.backgroundBaseDanger,
      color: euiTheme.colors.textDanger,
    },
    context: { background: 'transparent', color: euiTheme.colors.textParagraph },
  };

  return (
    <>
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.featureFlagsManagement.flags.history.diffDescription"
          defaultMessage="JSON diff of what changed in this update."
        />
      </EuiText>
      <div
        css={css`
          overflow: auto;
          max-height: 320px;
          margin-top: ${euiTheme.size.xs};
          padding: ${euiTheme.size.s};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.backgroundBasePlain};
          font-family: ${euiTheme.font.familyCode};
          font-size: ${euiTheme.size.m};
          line-height: ${euiTheme.font.lineHeightMultiplier};
          white-space: pre;
        `}
      >
        {parts.map((part, index) => {
          const type = diffPartType(part);
          return (
            <span key={`${index}-${type}`} style={partColor[type]}>
              {part.value}
            </span>
          );
        })}
      </div>
    </>
  );
};
