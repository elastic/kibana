/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { EnableEntityModelButton } from '../entity_enablement/enable_entity_model_button';

export function getEntityManagerEnablement({
  enabled,
  loading,
  onSuccess,
}: {
  enabled: boolean;
  loading: boolean;
  onSuccess: () => void;
}) {
  if (enabled || loading) {
    return;
  }

  return {
    solution: i18n.translate('xpack.inventory.noData.solutionName', {
      defaultMessage: 'Observability',
    }),
    action: {
      elasticAgent: {
        description: (
          <FormattedMessage
            id="xpack.inventory.noData.card.description"
            defaultMessage="The {inventoryLink} uses the {link} to show all of your observed entities in one place."
            values={{
              inventoryLink: (
                <EuiLink
                  data-test-subj="inventoryNoDataCardInventoryLink"
                  href="https://ela.st/docs-entity-inventory"
                  external
                  target="_blank"
                >
                  {i18n.translate('xpack.inventory.noData.card.description.inventory', {
                    defaultMessage: 'Inventory',
                  })}
                </EuiLink>
              ),
              link: (
                <EuiLink
                  data-test-subj="inventoryNoDataCardLink"
                  href="https://ela.st/docs-elastic-entity-model"
                  external
                  target="_blank"
                >
                  {i18n.translate('xpack.inventory.noData.card.description.link', {
                    defaultMessage: 'Elastic Entity Model',
                  })}
                </EuiLink>
              ),
            }}
          />
        ),
        button: <EnableEntityModelButton onSuccess={onSuccess} />,
        onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
          event.preventDefault();
        },
      },
    },
    pageTitle: i18n.translate('xpack.inventory.noData.page.title', {
      defaultMessage: 'See everything you have in one place!',
    }),
    pageDescription: i18n.translate('xpack.inventory.noData.page.description', {
      defaultMessage:
        'The inventory will show all of your observed entities in one place so you can detect and resolve problems with them faster!',
    }),
  };
}
