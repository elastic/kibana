/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CardIcon } from '@kbn/fleet-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { CuratedTileCard } from '../add_data_grid';

export interface VariantChooserProps {
  members: IntegrationCardItem[];
}

/**
 * The chooser body listing a collection's member integrations. Reuses
 * `CuratedTileCard` per row so variant rows look like the rest of the page.
 */
export const VariantChooser = ({ members }: VariantChooserProps) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {members.map((member) => (
      <EuiFlexItem key={member.id}>
        <CuratedTileCard
          tile={{
            id: member.id,
            title: member.title,
            description: member.description,
            icon: (
              <CardIcon
                icons={member.icons}
                packageName={member.name}
                version={member.version}
                size="l"
              />
            ),
            href: member.url,
            'data-test-subj': `collectionVariantRow-${member.id}`,
          }}
        />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
