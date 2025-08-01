/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { PlaygroundForm, PlaygroundFormFields, PlaygroundPageMode } from '../../types';
import { ViewCodeFlyout } from './view_code_flyout';

export const ViewCodeAction: React.FC<{ selectedPageMode: PlaygroundPageMode }> = ({
  selectedPageMode = PlaygroundPageMode.chat,
}) => {
  const { watch } = useFormContext<PlaygroundForm>();
  const [showFlyout, setShowFlyout] = useState(false);
  const selectedIndices = watch(PlaygroundFormFields.indices);

  return (
    <>
      {showFlyout && (
        <ViewCodeFlyout selectedPageMode={selectedPageMode} onClose={() => setShowFlyout(false)} />
      )}
      <EuiButtonEmpty
        iconType="export"
        onClick={() => setShowFlyout(true)}
        disabled={!selectedIndices || selectedIndices?.length === 0}
        data-test-subj="viewCodeActionButton"
        size="s"
      >
        <FormattedMessage
          id="xpack.searchPlayground.export.actionButtonLabel"
          defaultMessage="Export"
        />
      </EuiButtonEmpty>
    </>
  );
};
