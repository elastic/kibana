/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { UseArray, useFormData } from '../../../../shared_imports';
import type { FormHook, ArrayItem } from '../../../../shared_imports';
import { RelatedIntegrationsHelpInfo } from './related_integrations_help_info';
import { RelatedIntegrationFieldRow } from './related_integration_field_row';
import * as i18n from './translations';
import { OptionalFieldLabel } from '../optional_field_label';
import { getFlattenedArrayFieldNames } from '../utils';

interface RelatedIntegrationsProps {
  path: string;
  dataTestSubj?: string;
}

function RelatedIntegrationsComponent({
  path,
  dataTestSubj,
}: RelatedIntegrationsProps): JSX.Element {
  return (
    <UseArray path={path} initialNumberOfItems={0}>
      {({ items, addItem, removeItem, form }) => (
        <RelatedIntegrationsList
          items={items}
          addItem={addItem}
          removeItem={removeItem}
          path={path}
          form={form}
          dataTestSubj={dataTestSubj}
        />
      )}
    </UseArray>
  );
}

interface RelatedIntegrationsListProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
  path: string;
  form: FormHook;
  dataTestSubj?: string;
}

const RelatedIntegrationsList = ({
  items,
  addItem,
  removeItem,
  path,
  form,
  dataTestSubj,
}: RelatedIntegrationsListProps) => {
  const flattenedFieldNames = getFlattenedArrayFieldNames(form, path);

  /*
    Not using "watch" for the initial render, to let row components render and initialize form fields.
    Then we can use the "watch" feature to track their changes.
  */
  const hasRenderedInitially = flattenedFieldNames.length > 0;
  const fieldsToWatch = hasRenderedInitially ? flattenedFieldNames : [];

  const [formData] = useFormData({ watch: fieldsToWatch });

  const label = (
    <>
      {i18n.RELATED_INTEGRATIONS_LABEL}
      <RelatedIntegrationsHelpInfo />
    </>
  );

  return (
    <EuiFormRow
      label={label}
      labelAppend={OptionalFieldLabel}
      labelType="legend"
      fullWidth
      data-test-subj={dataTestSubj}
      hasChildLabel={false}
    >
      <>
        <EuiFlexGroup direction="column" gutterSize="s">
          {items.map((item) => (
            <EuiFlexItem key={item.id} data-test-subj="relatedIntegrationRow">
              <RelatedIntegrationFieldRow
                item={item}
                relatedIntegrations={formData[path] ?? []}
                removeItem={removeItem}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {items.length > 0 && <EuiSpacer size="s" />}
        <EuiButtonEmpty size="xs" iconType="plusInCircle" onClick={addItem}>
          {i18n.ADD_INTEGRATION}
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};

export const RelatedIntegrations = React.memo(RelatedIntegrationsComponent);
