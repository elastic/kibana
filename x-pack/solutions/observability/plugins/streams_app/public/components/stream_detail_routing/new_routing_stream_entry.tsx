/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiFlexGroup, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RoutingDefinition } from '@kbn/streams-schema';
import React from 'react';
import { ConditionEditor } from '../condition_editor';

export function NewRoutingStreamEntry({
  child,
  onChildChange,
}: {
  child: RoutingDefinition;
  onChildChange: (child?: RoutingDefinition) => void;
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
            value={child.destination}
            fullWidth
            compressed
            onChange={(e) => {
              onChildChange({
                ...child,
                destination: e.target.value,
              });
            }}
          />
        </EuiFormRow>
        <ConditionEditor
          readonly={false}
          condition={child.if}
          onConditionChange={(condition) => {
            onChildChange({
              ...child,
              if: condition,
            });
          }}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
