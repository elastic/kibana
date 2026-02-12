export interface WatchlistGroupLabel {
    id: string;
    label: string;
    isGroupLabelOption: true;
    groupicon: string;
    prepend?: React.ReactNode;
    checked?: never;
  }
  
  export interface WatchlistItem {
    id: string;
    label: string;
    isGroupLabelOption?: false;
    checked?: 'on' | 'off';
    groupicon?: never;
    prepend?: React.ReactNode;
  }
  
  export type WatchlistOption = WatchlistGroupLabel | WatchlistItem;