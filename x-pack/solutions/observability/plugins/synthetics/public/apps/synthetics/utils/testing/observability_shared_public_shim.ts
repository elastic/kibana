/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Jest-only stand-in for `@kbn/observability-shared-plugin/public` (see `moduleNameMapper` in the
 * plugin's `jest.config.js`).
 *
 * The real entry point also loads the whole plugin class and everything it depends on, which costs
 * several seconds of module loading in every test file that imports it, even though synthetics
 * only needs the few hooks and components below. Add a symbol here when synthetics starts
 * importing it from the real entry point; `observability_shared_public_shim.test.ts` fails if one
 * is missing.
 */

export { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public/components/header_menu';
export { FieldValueSelection } from '@kbn/observability-shared-plugin/public/components';
export { LoadWhenInView } from '@kbn/observability-shared-plugin/public/components/load_when_in_view/get_load_when_in_view_lazy';
export { TagsList } from '@kbn/observability-shared-plugin/public/components/tags_list/tags_list_lazy';
export { TagsComboBox } from '@kbn/observability-shared-plugin/public/components/tags_combo_box/tags_combo_box_lazy';
export {
  createTagsPasteHandler,
  getNewTags,
  splitTags,
} from '@kbn/observability-shared-plugin/public/components/tags_combo_box/tags_input';
export { InspectorContextProvider } from '@kbn/observability-shared-plugin/public/contexts/inspector/inspector_context';
export { useInspectorContext } from '@kbn/observability-shared-plugin/public/contexts/inspector/use_inspector_context';
export { useBreadcrumbs } from '@kbn/observability-shared-plugin/public/hooks/use_breadcrumbs';
export {
  createEsParams,
  useEsSearch,
} from '@kbn/observability-shared-plugin/public/hooks/use_es_search';
export {
  FETCH_STATUS,
  useFetcher,
} from '@kbn/observability-shared-plugin/public/hooks/use_fetcher';
export { useTheme } from '@kbn/observability-shared-plugin/public/hooks/use_theme';
export { useTimeZone } from '@kbn/observability-shared-plugin/public/hooks/use_time_zone';
export {
  METRIC_TYPE,
  useTrackPageview,
  useUiTracker,
} from '@kbn/observability-shared-plugin/public/hooks/use_track_metric';
