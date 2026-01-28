
import React, { useState, useCallback } from 'react';
import {
  EuiInputPopover,
  EuiFormControlLayout,
  EuiIcon,
  EuiFieldText,
  EuiFormLabel,
  EuiSelectable,
  type EuiSelectableOption,
  EuiSpacer,
} from '@elastic/eui';

import { useNavigation } from '../../common/lib/kibana';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../common/constants';

type WatchlistGroupLabel = {
  id: string;
  label: string;
  isGroupLabel: true;
  groupicon: string;
  prepend?: React.ReactNode;
  checked?: never;
};

type WatchlistItem = {
  id: string;
  label: string;
  isGroupLabel?: false;
  checked?: 'on' | 'off';
  groupicon?: never;
};

type WatchlistOption = WatchlistGroupLabel | WatchlistItem;

type WatchlistFilterProps = {
  onChangeSelectedId?: (id: string) => void;
};

// Demo atm, replacing with real data with crud
const WATCHLIST_OPTIONS: WatchlistOption[] = [
  { prepend: <EuiIcon type="pin" aria-label="pin" style={{ marginRight: 8 }} />, id: 'group-prebuilt', label: 'Prebuilt', isGroupLabel: true, groupicon: 'pin' },
  { id: 'prebuilt-priv', label: 'Privileged users' },
  { id: 'prebuilt-llm', label: 'Unauthorized LLM access' },
  { id: 'prebuilt-depart', label: 'Departing employees' },

  { prepend: <EuiIcon type="gear" aria-label="gear" style={{ marginRight: 8 }} />, id: 'group-custom', label: 'Custom', isGroupLabel: true, groupicon: 'gear' },
  { id: 'custom-clevel', label: 'C-level users' },
  { id: 'custom-highrisk', label: 'High-risk users' },
  { id: 'custom-3', label: 'Custom watchlist #3' },
];

export const WatchlistFilter = ({ onChangeSelectedId }: WatchlistFilterProps) => {

  const [options, setOptions] = useState<WatchlistOption[]>(WATCHLIST_OPTIONS);
  const [isOpen, setIsOpen] = useState(false);
 

  const { navigateTo } = useNavigation();  

  const navigateToWatchlist = useCallback(
    () => {      
      navigateTo({
        path: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
      });
    },
    [navigateTo]
  );

  const onChange = useCallback(
    (nextOptions: EuiSelectableOption[]) => {      
      setOptions(nextOptions as unknown as WatchlistOption[]);
      
      const newlySelected = (nextOptions as unknown as WatchlistOption[]).find(
        (o) => !o.isGroupLabel && o.checked === 'on'
      ) as WatchlistItem | undefined;

      if (newlySelected?.id) {        
        onChangeSelectedId?.(newlySelected.id);        
        navigateToWatchlist();
        setIsOpen(false);
      }
    },
    [onChangeSelectedId, navigateToWatchlist]
  );

  const popoverButton = (
    <EuiFormControlLayout
      isDropdown
      prepend={<EuiFormLabel>Watchlist</EuiFormLabel>}
      fullWidth
    >
      <EuiFieldText
        controlOnly
        placeholder="Select watchlist"
        onClick={() => setIsOpen((v) => !v)}
        style={{ cursor: 'pointer' }}
        onMouseDown={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((v) => !v);
          }
        }}
        aria-label="Select watchlist"
      />
    </EuiFormControlLayout>
  );
  return (
    <EuiInputPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downLeft"
      input={popoverButton}
      panelMinWidth={280}
    >
      <EuiSelectable
        singleSelection="always"
        searchable
        options={options as unknown as EuiSelectableOption[]}
        onChange={onChange}
        searchProps={{ placeholder: 'Search watchlists' }}
        renderOption={(option) => {
          const o = option as unknown as WatchlistOption;
          return (<span>{o.label}</span>);
        }}
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="s" />
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiInputPopover>
  );
};