# entities-caue

A lightweight, browser-only Kibana plugin that renders a live table of all service entities from the Entity Store's `entities-latest-default` index.

The page runs a single ES|QL query via the `data` plugin search service and builds the table columns dynamically from the response — no hardcoded field list.
