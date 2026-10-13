/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Compile-only libyara wrapper for Kibana Custom YARA validation.
 *
 * Exposes:
 *   - validate_yara(source) -> JSON string { errors, warnings, rules, errorCount, warningCount }
 *   - validate_yara_free(ptr)
 *   - yara_engine_version() -> version string (from -DYARA_ENGINE_VERSION)
 *
 * Engine pin: see build.sh YARA_VERSION / dist/ENGINE.md (matches Elastic Endpoint).
 */

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <yara.h>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#define MAX_DIAGNOSTICS 64
#define MAX_MESSAGE_LEN 512
#define MAX_RULES 256
/* libyara identifiers are capped at 128 chars (lexer.l). */
#define MAX_RULE_IDENTIFIER_LEN 129
/* The exported meta fields (os, arch, scan_type) are quite short when valid, so 32 bytes is enough. */
#define MAX_META_VALUE_LEN 32
/* Escaped messages can be ~2x source length; budget both error and warning arrays. */
#define MAX_JSON_ITEM_LEN (MAX_MESSAGE_LEN * 2 + 80)
#define MAX_RULE_JSON_LEN (MAX_RULE_IDENTIFIER_LEN * 2 + MAX_META_VALUE_LEN * 2 * 3 + 104)
#define MAX_JSON_LEN \
  (MAX_DIAGNOSTICS * MAX_JSON_ITEM_LEN * 2 + MAX_RULES * MAX_RULE_JSON_LEN + 128)
/* Bytes reserved so errorCount/warningCount always fit after the arrays. */
#define JSON_COUNTS_MAX 64

static const char EMPTY_JSON[] =
    "{\"errors\":[],\"warnings\":[],\"rules\":[],\"errorCount\":0,\"warningCount\":0}";

typedef struct {
  char severity[16];
  char message[MAX_MESSAGE_LEN];
  int line;
} yara_diagnostic_t;

typedef struct {
  char identifier[MAX_RULE_IDENTIFIER_LEN];
  char os[MAX_META_VALUE_LEN];
  char arch[MAX_META_VALUE_LEN];
  char scan_type[MAX_META_VALUE_LEN];
  /* 0 = absent, 1 = unique value stored, 2 = duplicated (value ignored). */
  int os_count;
  int arch_count;
  int scan_type_count;
} yara_compiled_rule_t;

typedef struct {
  yara_diagnostic_t errors[MAX_DIAGNOSTICS];
  int error_count;
  yara_diagnostic_t warnings[MAX_DIAGNOSTICS];
  int warning_count;
  yara_compiled_rule_t rules[MAX_RULES];
  int rule_count;
} yara_validate_ctx_t;

static int g_yara_initialized = 0;

static void json_escape(const char* src, char* dst, size_t dst_len) {
  size_t di = 0;
  for (size_t si = 0; src[si] != '\0' && di + 2 < dst_len; si++) {
    char c = src[si];
    if (c == '"' || c == '\\') {
      if (di + 3 >= dst_len) {
        break;
      }
      dst[di++] = '\\';
      dst[di++] = c;
    } else if (c == '\n') {
      if (di + 3 >= dst_len) {
        break;
      }
      dst[di++] = '\\';
      dst[di++] = 'n';
    } else if (c == '\r') {
      if (di + 3 >= dst_len) {
        break;
      }
      dst[di++] = '\\';
      dst[di++] = 'r';
    } else if (c == '\t') {
      if (di + 3 >= dst_len) {
        break;
      }
      dst[di++] = '\\';
      dst[di++] = 't';
    } else if ((unsigned char)c < 0x20) {
      /* skip other control chars */
    } else {
      dst[di++] = c;
    }
  }
  dst[di] = '\0';
}

static int stored_diagnostic_count(int count) {
  return count < MAX_DIAGNOSTICS ? count : MAX_DIAGNOSTICS;
}

static void append_diagnostic(
    yara_diagnostic_t* list,
    int* count,
    const char* severity,
    const char* message,
    int line) {
  if (*count >= MAX_DIAGNOSTICS) {
    (*count)++;
    return;
  }
  yara_diagnostic_t* d = &list[*count];
  strncpy(d->severity, severity, sizeof(d->severity) - 1);
  d->severity[sizeof(d->severity) - 1] = '\0';
  strncpy(d->message, message != NULL ? message : "", sizeof(d->message) - 1);
  d->message[sizeof(d->message) - 1] = '\0';
  d->line = line;
  (*count)++;
}

static void compiler_callback(
    int error_level,
    const char* file_name,
    int line_number,
    const YR_RULE* rule,
    const char* message,
    void* user_data) {
  (void)file_name;
  (void)rule;

  yara_validate_ctx_t* ctx = (yara_validate_ctx_t*)user_data;
  if (error_level == YARA_ERROR_LEVEL_ERROR) {
    append_diagnostic(ctx->errors, &ctx->error_count, "error", message, line_number);
  } else {
    append_diagnostic(ctx->warnings, &ctx->warning_count, "warning", message, line_number);
  }
}

/**
 * Append formatted text into out[*offset].
 * Returns 1 if fully written, 0 if the buffer is full/truncated, -1 on encoding error.
 * Never advances *offset past cap, and never writes past out[cap).
 */
static int append_fmt(char* out, size_t cap, size_t* offset, const char* fmt, ...) {
  if (*offset >= cap) {
    return 0;
  }

  size_t remaining = cap - *offset;
  va_list ap;
  va_start(ap, fmt);
  int n = vsnprintf(out + *offset, remaining, fmt, ap);
  va_end(ap);

  if (n < 0) {
    return -1;
  }

  /* snprintf returns the length that would have been written (excluding NUL). */
  if ((size_t)n >= remaining) {
    /* Truncated: string is NUL-terminated at out[cap - 1]. */
    *offset = cap - 1;
    return 0;
  }

  *offset += (size_t)n;
  return 1;
}

static void copy_bounded(char* dst, size_t dst_len, const char* src) {
  if (dst_len == 0) {
    return;
  }
  if (src == NULL) {
    dst[0] = '\0';
    return;
  }
  strncpy(dst, src, dst_len - 1);
  dst[dst_len - 1] = '\0';
}

static void copy_meta_value(char* dst, size_t dst_len, const YR_META* meta) {
  if (dst_len == 0) {
    return;
  }
  dst[0] = '\0';
  switch (meta->type) {
    case META_TYPE_STRING:
      copy_bounded(dst, dst_len, meta->string);
      break;
    case META_TYPE_INTEGER:
      snprintf(dst, dst_len, "%lld", (long long)meta->integer);
      break;
    case META_TYPE_BOOLEAN:
      copy_bounded(dst, dst_len, meta->integer ? "true" : "false");
      break;
    default:
      break;
  }
}

static void note_first_meta_key(char* value, int* count, const YR_META* meta) {
  if (*count == 0) {
    copy_meta_value(value, MAX_META_VALUE_LEN, meta);
  }
  (*count)++;
}

static void collect_compiled_rules(yara_validate_ctx_t* ctx, YR_RULES* rules) {
  YR_RULE* rule;

  yr_rules_foreach(rules, rule) {
    if (ctx->rule_count >= MAX_RULES) {
      break;
    }

    yara_compiled_rule_t* out = &ctx->rules[ctx->rule_count];
    memset(out, 0, sizeof(*out));
    copy_bounded(out->identifier, sizeof(out->identifier), rule->identifier);

    YR_META* meta;
    yr_rule_metas_foreach(rule, meta) {
      if (meta->identifier == NULL) {
        continue;
      }

      if (strcmp(meta->identifier, "os") == 0) {
        note_first_meta_key(out->os, &out->os_count, meta);
      } else if (strcmp(meta->identifier, "arch") == 0) {
        note_first_meta_key(out->arch, &out->arch_count, meta);
      } else if (strcmp(meta->identifier, "scan_type") == 0) {
        note_first_meta_key(out->scan_type, &out->scan_type_count, meta);
      }
    }

    ctx->rule_count++;
  }
}

static int append_meta_field(
    char* out,
    size_t cap,
    size_t* offset,
    const char* key,
    const char* value,
    int first) {
  char escaped[MAX_META_VALUE_LEN * 2];
  json_escape(value, escaped, sizeof(escaped));
  return append_fmt(out, cap, offset, "%s\"%s\":\"%s\"", first ? "" : ",", key, escaped);
}

static int append_duplicate_meta_key(
    char* out,
    size_t cap,
    size_t* offset,
    const char* key,
    int first) {
  return append_fmt(out, cap, offset, "%s\"%s\"", first ? "" : ",", key);
}

static int append_compiled_rule(
    char* out,
    size_t cap,
    size_t* offset,
    const yara_compiled_rule_t* rule,
    int first) {
  char identifier_escaped[MAX_RULE_IDENTIFIER_LEN * 2];
  json_escape(rule->identifier, identifier_escaped, sizeof(identifier_escaped));

  if (append_fmt(
          out,
          cap,
          offset,
          "%s{\"identifier\":\"%s\",\"meta\":{",
          first ? "" : ",",
          identifier_escaped) <= 0) {
    return 0;
  }

  int meta_first = 1;
  if (rule->os_count == 1) {
    if (append_meta_field(out, cap, offset, "os", rule->os, meta_first) <= 0) {
      return 0;
    }
    meta_first = 0;
  }
  if (rule->arch_count == 1) {
    if (append_meta_field(out, cap, offset, "arch", rule->arch, meta_first) <= 0) {
      return 0;
    }
    meta_first = 0;
  }
  if (rule->scan_type_count == 1) {
    if (append_meta_field(out, cap, offset, "scan_type", rule->scan_type, meta_first) <= 0) {
      return 0;
    }
  }

  if (append_fmt(out, cap, offset, "},\"duplicateMeta\":[") <= 0) {
    return 0;
  }

  int dup_first = 1;
  if (rule->os_count > 1) {
    if (append_duplicate_meta_key(out, cap, offset, "os", dup_first) <= 0) {
      return 0;
    }
    dup_first = 0;
  }
  if (rule->arch_count > 1) {
    if (append_duplicate_meta_key(out, cap, offset, "arch", dup_first) <= 0) {
      return 0;
    }
    dup_first = 0;
  }
  if (rule->scan_type_count > 1) {
    if (append_duplicate_meta_key(out, cap, offset, "scan_type", dup_first) <= 0) {
      return 0;
    }
  }

  return append_fmt(out, cap, offset, "]}");
}

static char* build_json(const yara_validate_ctx_t* ctx) {
  char* out = (char*)malloc(MAX_JSON_LEN);
  if (out == NULL) {
    return NULL;
  }

  /* Reserve tail so errorCount/warningCount always fit. */
  const size_t content_cap = MAX_JSON_LEN - JSON_COUNTS_MAX;
  size_t offset = 0;

  if (append_fmt(out, content_cap, &offset, "{\"errors\":[") <= 0) {
    memcpy(out, EMPTY_JSON, sizeof(EMPTY_JSON));
    return out;
  }

  const int stored_errors = stored_diagnostic_count(ctx->error_count);
  for (int i = 0; i < stored_errors; i++) {
    char escaped[MAX_MESSAGE_LEN * 2];
    json_escape(ctx->errors[i].message, escaped, sizeof(escaped));
    if (append_fmt(
            out,
            content_cap,
            &offset,
            "%s{\"severity\":\"error\",\"message\":\"%s\",\"line\":%d}",
            i > 0 ? "," : "",
            escaped,
            ctx->errors[i].line) <= 0) {
      break;
    }
  }

  if (append_fmt(out, content_cap, &offset, "],\"warnings\":[") > 0) {
    const int stored_warnings = stored_diagnostic_count(ctx->warning_count);
    for (int i = 0; i < stored_warnings; i++) {
      char escaped[MAX_MESSAGE_LEN * 2];
      json_escape(ctx->warnings[i].message, escaped, sizeof(escaped));
      if (append_fmt(
              out,
              content_cap,
              &offset,
              "%s{\"severity\":\"warning\",\"message\":\"%s\",\"line\":%d}",
              i > 0 ? "," : "",
              escaped,
              ctx->warnings[i].line) <= 0) {
        break;
      }
    }
  }

  if (append_fmt(out, content_cap, &offset, "],\"rules\":[") > 0) {
    for (int i = 0; i < ctx->rule_count; i++) {
      if (append_compiled_rule(out, content_cap, &offset, &ctx->rules[i], i == 0) <= 0) {
        break;
      }
    }
  }

  append_fmt(
      out,
      MAX_JSON_LEN,
      &offset,
      "],\"errorCount\":%d,\"warningCount\":%d}",
      ctx->error_count,
      ctx->warning_count);
  return out;
}

static int ensure_initialized(yara_validate_ctx_t* ctx) {
  if (g_yara_initialized) {
    return 1;
  }
  if (yr_initialize() != ERROR_SUCCESS) {
    append_diagnostic(ctx->errors, &ctx->error_count, "error", "yr_initialize failed", 0);
    return 0;
  }
  g_yara_initialized = 1;
  return 1;
}

static char* validate_yara_impl(yara_validate_ctx_t* ctx, const char* source) {
  if (source == NULL || source[0] == '\0') {
    append_diagnostic(ctx->errors, &ctx->error_count, "error", "YARA rule source is empty", 0);
    return build_json(ctx);
  }

  if (!ensure_initialized(ctx)) {
    return build_json(ctx);
  }

  YR_COMPILER* compiler = NULL;
  if (yr_compiler_create(&compiler) != ERROR_SUCCESS) {
    append_diagnostic(ctx->errors, &ctx->error_count, "error", "yr_compiler_create failed", 0);
    return build_json(ctx);
  }

  yr_compiler_set_callback(compiler, compiler_callback, ctx);

  /* Disable #include — custom signatures must be self-contained. */
  yr_compiler_set_include_callback(compiler, NULL, NULL, NULL);

  int add_result = yr_compiler_add_string(compiler, source, NULL);
  if (add_result != 0) {
    /* Errors already collected via callback; if none, add a generic one. */
    if (ctx->error_count == 0) {
      append_diagnostic(
          ctx->errors,
          &ctx->error_count,
          "error",
          "YARA rule failed to compile",
          0);
    }
    yr_compiler_destroy(compiler);
    return build_json(ctx);
  }

  YR_RULES* rules = NULL;
  int get_result = yr_compiler_get_rules(compiler, &rules);
  if (get_result != ERROR_SUCCESS) {
    if (ctx->error_count == 0) {
      append_diagnostic(
          ctx->errors,
          &ctx->error_count,
          "error",
          "yr_compiler_get_rules failed",
          0);
    }
    yr_compiler_destroy(compiler);
    return build_json(ctx);
  }

  if (rules->num_rules > MAX_RULES) {
    char message[MAX_MESSAGE_LEN];
    snprintf(
        message,
        sizeof(message),
        "YARA source contains %u rules; maximum is %u",
        rules->num_rules,
        MAX_RULES);
    append_diagnostic(ctx->errors, &ctx->error_count, "error", message, 0);
  } else {
    collect_compiled_rules(ctx, rules);
  }

  yr_rules_destroy(rules);
  yr_compiler_destroy(compiler);
  return build_json(ctx);
}

EMSCRIPTEN_KEEPALIVE
char* validate_yara(const char* source) {
  yara_validate_ctx_t* ctx = (yara_validate_ctx_t*)calloc(1, sizeof(*ctx));
  if (ctx == NULL) {
    return NULL;
  }

  char* json = validate_yara_impl(ctx, source);
  free(ctx);
  return json;
}

EMSCRIPTEN_KEEPALIVE
void validate_yara_free(char* ptr) {
  free(ptr);
}

#ifndef YARA_ENGINE_VERSION
#error "YARA_ENGINE_VERSION must be set by build.sh (-DYARA_ENGINE_VERSION=\"x.y.z\")"
#endif

EMSCRIPTEN_KEEPALIVE
const char* yara_engine_version(void) {
  return YARA_ENGINE_VERSION;
}
