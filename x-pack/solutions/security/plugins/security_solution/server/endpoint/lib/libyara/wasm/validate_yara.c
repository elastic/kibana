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
 *   - validate_yara(source) -> JSON string { errors, warnings }
 *   - validate_yara_free(ptr)
 *   - yara_engine_version() -> version string (from -DYARA_ENGINE_VERSION)
 *
 * Engine pin: see build.sh YARA_VERSION / dist/ENGINE.md (matches Elastic Endpoint).
 */

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
#define MAX_JSON_LEN (MAX_DIAGNOSTICS * (MAX_MESSAGE_LEN + 64) + 128)

typedef struct {
  char severity[16];
  char message[MAX_MESSAGE_LEN];
  int line;
} yara_diagnostic_t;

typedef struct {
  yara_diagnostic_t errors[MAX_DIAGNOSTICS];
  int error_count;
  yara_diagnostic_t warnings[MAX_DIAGNOSTICS];
  int warning_count;
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

static void append_diagnostic(
    yara_diagnostic_t* list,
    int* count,
    const char* severity,
    const char* message,
    int line) {
  if (*count >= MAX_DIAGNOSTICS) {
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

static char* build_json(const yara_validate_ctx_t* ctx) {
  char* out = (char*)malloc(MAX_JSON_LEN);
  if (out == NULL) {
    return NULL;
  }

  size_t offset = 0;
  offset += (size_t)snprintf(out + offset, MAX_JSON_LEN - offset, "{\"errors\":[");

  for (int i = 0; i < ctx->error_count; i++) {
    char escaped[MAX_MESSAGE_LEN * 2];
    json_escape(ctx->errors[i].message, escaped, sizeof(escaped));
    offset += (size_t)snprintf(
        out + offset,
        MAX_JSON_LEN - offset,
        "%s{\"severity\":\"error\",\"message\":\"%s\",\"line\":%d}",
        i > 0 ? "," : "",
        escaped,
        ctx->errors[i].line);
    if (offset >= MAX_JSON_LEN - 1) {
      break;
    }
  }

  offset += (size_t)snprintf(out + offset, MAX_JSON_LEN - offset, "],\"warnings\":[");

  for (int i = 0; i < ctx->warning_count; i++) {
    char escaped[MAX_MESSAGE_LEN * 2];
    json_escape(ctx->warnings[i].message, escaped, sizeof(escaped));
    offset += (size_t)snprintf(
        out + offset,
        MAX_JSON_LEN - offset,
        "%s{\"severity\":\"warning\",\"message\":\"%s\",\"line\":%d}",
        i > 0 ? "," : "",
        escaped,
        ctx->warnings[i].line);
    if (offset >= MAX_JSON_LEN - 1) {
      break;
    }
  }

  snprintf(out + offset, MAX_JSON_LEN - offset, "]}");
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

EMSCRIPTEN_KEEPALIVE
char* validate_yara(const char* source) {
  yara_validate_ctx_t ctx;
  memset(&ctx, 0, sizeof(ctx));

  if (source == NULL || source[0] == '\0') {
    append_diagnostic(ctx.errors, &ctx.error_count, "error", "YARA rule source is empty", 0);
    return build_json(&ctx);
  }

  if (!ensure_initialized(&ctx)) {
    return build_json(&ctx);
  }

  YR_COMPILER* compiler = NULL;
  if (yr_compiler_create(&compiler) != ERROR_SUCCESS) {
    append_diagnostic(ctx.errors, &ctx.error_count, "error", "yr_compiler_create failed", 0);
    return build_json(&ctx);
  }

  yr_compiler_set_callback(compiler, compiler_callback, &ctx);

  /* Disable #include — custom signatures must be self-contained. */
  yr_compiler_set_include_callback(compiler, NULL, NULL, NULL);

  int add_result = yr_compiler_add_string(compiler, source, NULL);
  if (add_result != 0) {
    /* Errors already collected via callback; if none, add a generic one. */
    if (ctx.error_count == 0) {
      append_diagnostic(
          ctx.errors,
          &ctx.error_count,
          "error",
          "YARA rule failed to compile",
          0);
    }
    yr_compiler_destroy(compiler);
    return build_json(&ctx);
  }

  YR_RULES* rules = NULL;
  int get_result = yr_compiler_get_rules(compiler, &rules);
  if (get_result != ERROR_SUCCESS) {
    if (ctx.error_count == 0) {
      append_diagnostic(
          ctx.errors,
          &ctx.error_count,
          "error",
          "yr_compiler_get_rules failed",
          0);
    }
    yr_compiler_destroy(compiler);
    return build_json(&ctx);
  }

  yr_rules_destroy(rules);
  yr_compiler_destroy(compiler);
  return build_json(&ctx);
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
