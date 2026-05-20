import React from 'react';
import type { NewsItem as INewsItem } from './helpers/get_news_feed';
interface Props {
    items: INewsItem[];
}
export declare function NewsFeed({ items }: Props): React.JSX.Element;
export {};
