/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useGeneratedHtmlId,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useFetchAllInvestigationTags } from '../../../../hooks/use_fetch_all_investigation_tags';

const TAGS_LABEL = i18n.translate('xpack.investigateApp.searchBar.tagsFilterButtonLabel', {
  defaultMessage: 'Tags',
});

interface Props {
  isLoading: boolean;
  onChange: (tags: string[]) => void;
}

export function TagsFilter({ isLoading, onChange }: Props) {
  const { isLoading: isTagsLoading, data: tags } = useFetchAllInvestigationTags();
  const [items, setItems] = useState<Array<{ label: string; checked?: 'on' | 'off' }>>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const filterTagsPopoverId = useGeneratedHtmlId({
    prefix: 'filterTagsPopover',
  });

  useEffect(() => {
    if (tags) {
      setItems(tags.map((tag) => ({ label: tag })));
    }
  }, [tags]);

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="success"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      isSelected={isPopoverOpen}
      numFilters={items.length}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
    >
      {TAGS_LABEL}
    </EuiFilterButton>
  );
  return (
    <EuiFilterGroup>
      <EuiPopover
        id={filterTagsPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
      >
        <EuiSelectable
          searchable
          searchProps={{ compressed: true }}
          aria-label={TAGS_LABEL}
          options={items}
          onChange={(newOptions) => {
            setItems(newOptions);
            onChange(newOptions.filter((item) => item.checked === 'on').map((item) => item.label));
          }}
          isLoading={isLoading || isTagsLoading}
        >
          {(list, search) => (
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}
