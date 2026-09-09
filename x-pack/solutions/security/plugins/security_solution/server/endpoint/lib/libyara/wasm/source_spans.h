/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

#ifndef SOURCE_SPANS_H
#define SOURCE_SPANS_H

#include <stddef.h>

#define YARA_MAX_IMPORTS 16
#define YARA_MAX_IMPORT_NAME_LEN 64
#define YARA_MAX_SPAN_IDENTIFIER_LEN 129
#define YARA_MAX_SOURCE_SPANS 256 /* Keep in sync with MAX_RULES in validate_yara.c. */

typedef struct {
  char identifier[YARA_MAX_SPAN_IDENTIFIER_LEN];
  int start;
  int end;
} yara_source_span_t;

typedef struct {
  char imports[YARA_MAX_IMPORTS][YARA_MAX_IMPORT_NAME_LEN];
  int import_count;
  yara_source_span_t spans[YARA_MAX_SOURCE_SPANS];
  int span_count;
} yara_source_layout_t;
/**
 * Walks compiled-valid YARA source and records import module names plus
 * UTF-8 byte offsets for each top-level rule (including private/global).
 * Returns 1 on success, 0 on parse failure.
 */
int yara_extract_source_layout(const char* source, yara_source_layout_t* out);

#endif
