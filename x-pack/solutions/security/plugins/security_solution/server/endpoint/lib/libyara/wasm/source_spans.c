/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

#include "source_spans.h"

#include <string.h>

typedef struct {
  const char* src;
  size_t len;
  size_t pos;
} scan_t;

static int is_ident_start(unsigned char c) {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '_';
}

static int is_ident_cont(unsigned char c) {
  return is_ident_start(c) || (c >= '0' && c <= '9');
}

static int is_space(unsigned char c) {
  return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

static unsigned char peek(const scan_t* s) {
  return s->pos < s->len ? (unsigned char)s->src[s->pos] : 0;
}

static unsigned char peek_at(const scan_t* s, size_t offset) {
  size_t idx = s->pos + offset;
  return idx < s->len ? (unsigned char)s->src[idx] : 0;
}

static int skip_line_comment(scan_t* s) {
  if (peek(s) != '/' || peek_at(s, 1) != '/') {
    return 0;
  }
  s->pos += 2;
  while (s->pos < s->len && s->src[s->pos] != '\n') {
    s->pos++;
  }
  return 1;
}

static int skip_block_comment(scan_t* s) {
  if (peek(s) != '/' || peek_at(s, 1) != '*') {
    return 0;
  }
  s->pos += 2;
  while (s->pos + 1 < s->len && !(s->src[s->pos] == '*' && s->src[s->pos + 1] == '/')) {
    s->pos++;
  }
  if (s->pos + 1 >= s->len) {
    return 0;
  }
  s->pos += 2;
  return 1;
}

static int skip_ws_and_comments(scan_t* s) {
  for (;;) {
    unsigned char c = peek(s);
    if (is_space(c)) {
      s->pos++;
      continue;
    }
    if (c == '/' && peek_at(s, 1) == '/') {
      skip_line_comment(s);
      continue;
    }
    if (c == '/' && peek_at(s, 1) == '*') {
      if (!skip_block_comment(s)) {
        return 0;
      }
      continue;
    }
    return 1;
  }
}

static int starts_with_keyword(const scan_t* s, const char* keyword) {
  size_t klen = strlen(keyword);
  if (s->pos + klen > s->len) {
    return 0;
  }
  if (strncmp(s->src + s->pos, keyword, klen) != 0) {
    return 0;
  }
  if (s->pos + klen < s->len && is_ident_cont((unsigned char)s->src[s->pos + klen])) {
    return 0;
  }
  return 1;
}

static int match_keyword(scan_t* s, const char* keyword) {
  if (!starts_with_keyword(s, keyword)) {
    return 0;
  }
  s->pos += strlen(keyword);
  return 1;
}

static int read_identifier(scan_t* s, char* dst, size_t dst_len) {
  if (!is_ident_start(peek(s)) || dst_len == 0) {
    return 0;
  }
  size_t n = 0;
  while (s->pos < s->len && is_ident_cont((unsigned char)s->src[s->pos])) {
    if (n + 1 < dst_len) {
      dst[n++] = s->src[s->pos];
    }
    s->pos++;
  }
  dst[n < dst_len ? n : dst_len - 1] = '\0';
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

static int skip_quoted_string(scan_t* s) {
  if (peek(s) != '"') {
    return 0;
  }
  s->pos++;
  while (s->pos < s->len) {
    unsigned char c = (unsigned char)s->src[s->pos++];
    if (c == '\\') {
      if (s->pos < s->len) {
        s->pos++;
      }
      continue;
    }
    if (c == '"') {
      return 1;
    }
  }
  return 0;
}

static int skip_hex_string(scan_t* s) {
  if (peek(s) != '{') {
    return 0;
  }
  s->pos++;
  while (s->pos < s->len) {
    unsigned char c = peek(s);
    if (c == '/' && peek_at(s, 1) == '/') {
      skip_line_comment(s);
      continue;
    }
    if (c == '/' && peek_at(s, 1) == '*') {
      if (!skip_block_comment(s)) {
        return 0;
      }
      continue;
    }
    if (c == '}') {
      s->pos++;
      return 1;
    }
    s->pos++;
  }
  return 0;
}

static int skip_regex(scan_t* s) {
  if (peek(s) != '/') {
    return 0;
  }
  s->pos++;
  while (s->pos < s->len) {
    unsigned char c = (unsigned char)s->src[s->pos++];
    if (c == '\\') {
      if (s->pos < s->len) {
        s->pos++;
      }
      continue;
    }
    if (c == '/') {
      while (s->pos < s->len) {
        unsigned char flag = peek(s);
        if (flag == 'i' || flag == 's') {
          s->pos++;
        } else {
          break;
        }
      }
      return 1;
    }
  }
  return 0;
}

static int skip_rule_body(scan_t* s) {
  if (peek(s) != '{') {
    return 0;
  }
  s->pos++;

  int depth = 1;
  int last_was_equals = 0;

  while (s->pos < s->len && depth > 0) {
    unsigned char c = peek(s);
    unsigned char next = peek_at(s, 1);

    if (c == '/' && next == '/') {
      skip_line_comment(s);
      continue;
    }
    if (c == '/' && next == '*') {
      if (!skip_block_comment(s)) {
        return 0;
      }
      continue;
    }
    if (is_space(c)) {
      s->pos++;
      continue;
    }
    if (c == '"') {
      last_was_equals = 0;
      if (!skip_quoted_string(s)) {
        return 0;
      }
      continue;
    }
    if (c == '/' && last_was_equals) {
      last_was_equals = 0;
      if (!skip_regex(s)) {
        return 0;
      }
      continue;
    }
    if (c == '{' && last_was_equals) {
      last_was_equals = 0;
      if (!skip_hex_string(s)) {
        return 0;
      }
      continue;
    }
    if (c == '{') {
      depth++;
      last_was_equals = 0;
      s->pos++;
      continue;
    }
    if (c == '}') {
      depth--;
      last_was_equals = 0;
      s->pos++;
      continue;
    }
    last_was_equals = (c == '=');
    s->pos++;
  }

  return depth == 0;
}

static int parse_import(scan_t* s, yara_source_layout_t* out) {
  if (!match_keyword(s, "import")) {
    return 0;
  }
  if (!skip_ws_and_comments(s)) {
    return 0;
  }
  if (peek(s) != '"') {
    return 0;
  }
  s->pos++;

  char name[YARA_MAX_IMPORT_NAME_LEN];
  size_t n = 0;
  while (s->pos < s->len && s->src[s->pos] != '"') {
    if (n + 1 < sizeof(name)) {
      name[n++] = s->src[s->pos];
    }
    s->pos++;
  }
  if (peek(s) != '"') {
    return 0;
  }
  s->pos++;
  name[n < sizeof(name) ? n : sizeof(name) - 1] = '\0';

  if (name[0] == '\0' || out->import_count >= YARA_MAX_IMPORTS) {
    return 0;
  }
  copy_bounded(out->imports[out->import_count], YARA_MAX_IMPORT_NAME_LEN, name);
  out->import_count++;
  return 1;
}

static int parse_rule(scan_t* s, yara_source_layout_t* out) {
  size_t start = s->pos;

  for (;;) {
    if (!skip_ws_and_comments(s)) {
      return 0;
    }
    if (match_keyword(s, "private") || match_keyword(s, "global")) {
      continue;
    }
    break;
  }

  if (!match_keyword(s, "rule")) {
    return 0;
  }
  if (!skip_ws_and_comments(s)) {
    return 0;
  }

  char ident[YARA_MAX_SPAN_IDENTIFIER_LEN];
  if (!read_identifier(s, ident, sizeof(ident))) {
    return 0;
  }
  if (!skip_ws_and_comments(s)) {
    return 0;
  }

  if (peek(s) == ':') {
    s->pos++;
    while (s->pos < s->len && peek(s) != '{') {
      unsigned char c = peek(s);
      if (c == '/' && (peek_at(s, 1) == '/' || peek_at(s, 1) == '*')) {
        if (!skip_ws_and_comments(s)) {
          return 0;
        }
        continue;
      }
      if (is_space(c) || is_ident_cont(c)) {
        s->pos++;
        continue;
      }
      return 0;
    }
  }

  if (!skip_ws_and_comments(s)) {
    return 0;
  }
  if (!skip_rule_body(s)) {
    return 0;
  }

  if (out->span_count >= YARA_MAX_SOURCE_SPANS) {
    return 0;
  }
  yara_source_span_t* span = &out->spans[out->span_count++];
  copy_bounded(span->identifier, sizeof(span->identifier), ident);
  span->start = (int)start;
  span->end = (int)s->pos;
  return 1;
}

int yara_extract_source_layout(const char* source, yara_source_layout_t* out) {
  if (source == NULL || out == NULL) {
    return 0;
  }

  memset(out, 0, sizeof(*out));

  scan_t s;
  s.src = source;
  s.len = strlen(source);
  s.pos = 0;

  while (s.pos < s.len) {
    if (!skip_ws_and_comments(&s)) {
      return 0;
    }
    if (s.pos >= s.len) {
      break;
    }

    if (starts_with_keyword(&s, "import")) {
      if (out->span_count > 0) {
        return 0;
      }
      if (!parse_import(&s, out)) {
        return 0;
      }
      continue;
    }

    if (starts_with_keyword(&s, "private") || starts_with_keyword(&s, "global") ||
        starts_with_keyword(&s, "rule")) {
      if (!parse_rule(&s, out)) {
        return 0;
      }
      continue;
    }

    return 0;
  }

  return 1;
}
