/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Sandbox directory that holds this investigation's cutoff proxy. */
export const TELEMETRY_CUTOFF_DIR = '/workspace/.nightshift';

/** Where the sandbox command finds the proxy. One investigation writes it into its own session. */
export const TELEMETRY_CUTOFF_PROXY_PATH = `${TELEMETRY_CUTOFF_DIR}/telemetry_cutoff_proxy.py`;

/**
 * In-sandbox proxy. `_search`, `_count` and ES|QL `_query` reads get an `@timestamp` upper bound.
 * Query DSL bodies may only use allowlisted search options and aggregation types, read-only
 * metadata endpoints pass through, and anything else is refused with a 403, so a read
 * that did not happen never looks like an empty result. This bounds an ordinary command, not a
 * hostile one: everything in the sandbox runs as one user, so a command can still read the cluster
 * URL from another process's environment.
 */
export const TELEMETRY_CUTOFF_PROXY_SOURCE = `import json
import os
import re
import socketserver
from http.client import HTTPException
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import parse_qs, unquote
from urllib.request import Request, urlopen

UPSTREAM = os.environ["NIGHTSHIFT_TELEMETRY_UPSTREAM"].rstrip("/")
NOT_AFTER = os.environ["NIGHTSHIFT_TELEMETRY_CUTOFF"]
PORT_FILE = os.environ["NIGHTSHIFT_TELEMETRY_PROXY_PORT_FILE"]
MAX_BODY = 2 * 1024 * 1024
SEARCH_SUFFIXES = ("/_query", "/_search", "/_count")
METADATA_PATH = re.compile(
    r"^/$"
    r"|^/_cat/indices(/.*)?$"
    r"|^/_remote/info$"
    r"|^/_resolve/(index|cluster)(/.*)?$"
    r"|^(/[^/]+)?/_field_caps$"
    r"|^(/[^/]+)?/_mapping(/.*)?$"
)
ESQL_STRING = re.compile(r'"""[\\s\\S]*?"""|"(?:[^"\\\\]|\\\\.)*"')
# A backtick-quoted identifier, such as a column named \`from\`, is never a command.
ESQL_QUOTED_IDENTIFIER = re.compile(r"\`[^\`]*\`")
# Search options that only shape, page or narrow what the bounded query matched. Anything else, such
# as knn, retriever, suggest or runtime_mappings, can select or redefine documents past the bound.
SEARCH_KEYS = frozenset((
    "query", "size", "from", "sort", "search_after", "track_total_hits", "track_scores", "timeout",
    "terminate_after", "_source", "fields", "docvalue_fields", "stored_fields", "script_fields",
    "aggs", "aggregations", "post_filter", "highlight", "collapse", "rescore", "min_score",
    "explain", "version", "seq_no_primary_term", "indices_boost", "profile", "pit", "stats",
))
COUNT_KEYS = frozenset(("query",))
# Aggregations computed only from the documents the bounded query matched.
AGGREGATION_TYPES = frozenset((
    "terms", "multi_terms", "rare_terms", "composite", "histogram", "date_histogram",
    "auto_date_histogram", "variable_width_histogram", "range", "date_range", "ip_range",
    "ip_prefix", "filter", "filters", "adjacency_matrix", "missing", "nested", "reverse_nested",
    "sampler", "diversified_sampler", "random_sampler", "categorize_text", "frequent_item_sets",
    "top_hits", "top_metrics", "avg", "weighted_avg", "sum", "min", "max", "stats",
    "extended_stats", "string_stats", "value_count", "cardinality", "percentiles",
    "percentile_ranks", "median_absolute_deviation", "boxplot", "rate", "scripted_metric",
    "geo_bounds", "geo_centroid", "avg_bucket", "sum_bucket", "min_bucket", "max_bucket",
    "stats_bucket", "extended_stats_bucket", "percentiles_bucket", "derivative", "cumulative_sum",
    "cumulative_cardinality", "bucket_script", "bucket_selector", "bucket_sort", "moving_fn",
    "moving_percentiles", "serial_diff", "normalize",
))
AGGREGATION_KEYS = frozenset(("aggs", "aggregations", "meta"))


class Refused(Exception):
    pass


def split_path(path):
    pathname, _, query_string = path.partition("?")
    return unquote(pathname).rstrip("/") or "/", query_string


def blank_strings(query):
    blank = lambda match: " " * len(match.group(0))
    return ESQL_QUOTED_IDENTIFIER.sub(blank, ESQL_STRING.sub(blank, query))


def bound_esql(query):
    if not isinstance(query, str):
        raise Refused("an ES|QL read needs a query string")
    code = blank_strings(query)
    if '"' in code:
        raise Refused("the ES|QL query has an unterminated string")
    if "//" in code or "/*" in code:
        raise Refused("the cutoff cannot be added to an ES|QL query with comments; remove them")
    if not re.match(r"\\s*FROM\\b", code, re.IGNORECASE):
        raise Refused("an ES|QL read must start with a FROM command")
    end = code.find("|")
    if end < 0:
        end = len(query)
    if "(" in code[:end]:
        raise Refused("the cutoff cannot be added to an ES|QL subquery")
    # The bound goes after the first FROM only, so a FROM anywhere later (a subquery inside WHERE
    # or another command) would read past it.
    if len(re.findall(r"\\bFROM\\b", code, re.IGNORECASE)) > 1:
        raise Refused("the cutoff can only bound a query with one FROM; run nested reads separately")
    predicate = '| WHERE @timestamp <= "%s"' % NOT_AFTER
    tail = query[end:]
    if tail.startswith("|"):
        tail = " " + tail
    return query[:end] + " " + predicate + tail


def check_aggregations(aggregations):
    if aggregations is None:
        return
    if not isinstance(aggregations, dict):
        raise Refused("aggregations must be an object")
    for name, aggregation in aggregations.items():
        if not isinstance(aggregation, dict):
            raise Refused("aggregation %s must be an object" % name)
        kinds = [key for key in aggregation if key not in AGGREGATION_KEYS]
        if len(kinds) != 1:
            raise Refused("aggregation %s must have exactly one type" % name)
        kind = kinds[0]
        if kind not in AGGREGATION_TYPES:
            raise Refused("the %s aggregation can read past the query, so it cannot be bounded" % kind)
        settings = aggregation[kind]
        if kind in ("terms", "multi_terms") and isinstance(settings, dict):
            if settings.get("min_doc_count") == 0:
                raise Refused("min_doc_count 0 lists terms the query did not match, so it cannot be bounded")
        check_aggregations(aggregation.get("aggs"))
        check_aggregations(aggregation.get("aggregations"))


def bound_dsl(parsed, allowed_keys):
    for key in parsed:
        if key not in allowed_keys:
            raise Refused("%s is not a search option the cutoff can bound" % key)
    check_aggregations(parsed.get("aggs"))
    check_aggregations(parsed.get("aggregations"))
    bound = {"range": {"@timestamp": {"lte": NOT_AFTER}}}
    existing = parsed.get("query")
    if existing is None:
        parsed["query"] = bound
    elif isinstance(existing, dict):
        parsed["query"] = {"bool": {"must": [existing], "filter": [bound]}}
    else:
        raise Refused("a Query DSL read needs a query object")


def rewrite_search(pathname, query_string, body):
    params = parse_qs(query_string, keep_blank_values=True)
    if "q" in params:
        raise Refused("the q parameter replaces the body query; put the query in the body")
    if "source" in params:
        raise Refused("the source parameter replaces the body; send the query as the request body")
    try:
        parsed = json.loads(body) if body else {}
    except ValueError:
        raise Refused("the search body is not JSON")
    if not isinstance(parsed, dict):
        raise Refused("the search body is not a JSON object")
    if pathname.endswith("/_query"):
        parsed["query"] = bound_esql(parsed.get("query"))
    else:
        bound_dsl(parsed, COUNT_KEYS if pathname.endswith("/_count") else SEARCH_KEYS)
    return json.dumps(parsed).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    # Official Elasticsearch clients reject a response without this header as another product, so
    # the proxy passes the cluster's through and marks its own refusals the same way.
    def _send(self, status, payload, content_type="application/json", product="Elasticsearch"):
        data = payload if isinstance(payload, bytes) else payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if product:
            self.send_header("X-Elastic-Product", product)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_error_body(self, status, error_type, reason):
        self._send(status, json.dumps({"error": {"type": error_type, "reason": reason}}))

    def _read_chunked(self):
        chunks = []
        total = 0
        while True:
            size = int(self.rfile.readline(65537).split(b";", 1)[0].strip(), 16)
            if size == 0:
                # Skip any trailers up to the blank line that ends the body.
                while self.rfile.readline(65537).strip():
                    pass
                return b"".join(chunks)
            total += size
            if total > MAX_BODY:
                return None
            chunks.append(self.rfile.read(size))
            self.rfile.readline(65537)

    def _read_body(self):
        # A chunked body (curl -T -, streaming clients) carries no Content-Length.
        if "chunked" in (self.headers.get("Transfer-Encoding") or "").lower():
            return self._read_chunked()
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_BODY:
            return None
        return self.rfile.read(length) if length else b""

    def _handle(self, method):
        try:
            body = self._read_body()
        except ValueError:
            self.close_connection = True
            self._send_error_body(400, "telemetry_cutoff", "the request body is not valid chunked encoding")
            return
        if body is None:
            self.close_connection = True
            self._send(413, b"")
            return
        pathname, query_string = split_path(self.path)
        forward = None
        if pathname.endswith(SEARCH_SUFFIXES):
            try:
                forward = rewrite_search(pathname, query_string, body)
            except Refused as error:
                self._send_error_body(403, "telemetry_cutoff", str(error))
                return
        elif method != "GET" or not METADATA_PATH.match(pathname):
            reason = "%s %s cannot be bounded by the telemetry cutoff; use _search, _count or _query" % (
                method,
                pathname,
            )
            self._send_error_body(403, "telemetry_cutoff", reason)
            return
        headers = {}
        authorization = self.headers.get("Authorization")
        if authorization:
            headers["Authorization"] = authorization
        if forward is not None:
            headers["Content-Type"] = "application/json"
        request = Request(UPSTREAM + self.path, data=forward, headers=headers, method=method)
        try:
            with urlopen(request, timeout=60) as response:
                status = response.status
                payload = response.read()
                content_type = response.headers.get("Content-Type", "application/json")
                product = response.headers.get("X-Elastic-Product")
        except HTTPError as error:
            upstream_headers = error.headers or {}
            self._send(
                error.code,
                error.read() or b"",
                upstream_headers.get("Content-Type", "application/json"),
                upstream_headers.get("X-Elastic-Product"),
            )
            return
        except (OSError, HTTPException):
            self._send_error_body(502, "telemetry_unavailable", "the telemetry cluster could not be read")
            return
        self._send(status, payload, content_type, product)

    def do_POST(self):
        self._handle("POST")

    def do_GET(self):
        self._handle("GET")

    def log_message(self, fmt, *args):
        return


class Server(ThreadingHTTPServer):
    def server_bind(self):
        # HTTPServer.server_bind reverse-resolves the bind address and can hang.
        socketserver.TCPServer.server_bind(self)
        self.server_name = "127.0.0.1"
        self.server_port = self.server_address[1]


def main():
    server = Server(("127.0.0.1", 0), Handler)
    with open(PORT_FILE, "w", encoding="utf-8") as handle:
        handle.write(str(server.server_address[1]))
    server.serve_forever()


if __name__ == "__main__":
    main()
`;

/** Shell that points the agent's telemetry URL at the cutoff proxy, then runs the command. */
export const telemetryCutoffCommand = (): string => `set -eu
port_file=$(mktemp)
NIGHTSHIFT_TELEMETRY_UPSTREAM="$CONNECTOR_CONFIG_URL" \\
NIGHTSHIFT_TELEMETRY_CUTOFF="$NIGHTSHIFT_TELEMETRY_CUTOFF" \\
NIGHTSHIFT_TELEMETRY_PROXY_PORT_FILE="$port_file" \\
python3 ${TELEMETRY_CUTOFF_PROXY_PATH} >/dev/null 2>&1 &
proxy_pid=$!
trap 'kill "$proxy_pid" 2>/dev/null || true; wait "$proxy_pid" 2>/dev/null || true; rm -f "$port_file"' EXIT
port=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40; do
  if [ -s "$port_file" ]; then
    port=$(cat "$port_file")
    break
  fi
  if ! kill -0 "$proxy_pid" 2>/dev/null; then
    echo "telemetry cutoff proxy exited before it was ready" >&2
    exit 1
  fi
  sleep 0.05
done
if [ -z "$port" ]; then
  echo "telemetry cutoff proxy did not become ready" >&2
  exit 1
fi
export CONNECTOR_CONFIG_URL="http://127.0.0.1:\${port}"
unset NIGHTSHIFT_TELEMETRY_UPSTREAM
unset NIGHTSHIFT_TELEMETRY_CUTOFF
user_command="$NIGHTSHIFT_SANDBOX_COMMAND"
unset NIGHTSHIFT_SANDBOX_COMMAND
bash -c "$user_command"
`;
