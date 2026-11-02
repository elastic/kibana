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
 * In-sandbox proxy. `_search`, `_count` and ES|QL `_query` reads get an `@timestamp` upper bound,
 * read-only metadata endpoints pass through, and anything else is refused with a 403, so a read
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
# Each of these selects documents without going through the top-level query.
UNBOUNDED_CLAUSES = ("knn", "retriever", "runtime_mappings")


class Refused(Exception):
    pass


def split_path(path):
    pathname, _, query_string = path.partition("?")
    return unquote(pathname).rstrip("/") or "/", query_string


def end_of_from(query):
    match = re.search(r"\\bFROM\\b", query, re.IGNORECASE)
    if not match:
        return None
    index = match.end()
    length = len(query)
    while index < length:
        if query.startswith('"""', index):
            close = query.find('"""', index + 3)
            if close < 0:
                return None
            index = close + 3
            continue
        char = query[index]
        if char in ('"', "'"):
            close = query.find(char, index + 1)
            if close < 0:
                return None
            index = close + 1
            continue
        if char == "|":
            return index
        index += 1
    return length


def bound_esql(query):
    if not isinstance(query, str):
        raise Refused("an ES|QL read needs a query string")
    end = end_of_from(query)
    if end is None:
        raise Refused("an ES|QL read must start from a FROM command")
    predicate = '| WHERE @timestamp <= "%s"' % NOT_AFTER
    tail = query[end:]
    if tail.startswith("|"):
        tail = " " + tail
    return query[:end] + " " + predicate + tail


def has_global_aggregation(aggregations):
    if not isinstance(aggregations, dict):
        return False
    for aggregation in aggregations.values():
        if not isinstance(aggregation, dict):
            continue
        if "global" in aggregation:
            return True
        if has_global_aggregation(aggregation.get("aggs")):
            return True
        if has_global_aggregation(aggregation.get("aggregations")):
            return True
    return False


def bound_dsl(parsed):
    for clause in UNBOUNDED_CLAUSES:
        if clause in parsed:
            raise Refused("%s bypasses the query, so it cannot be bounded" % clause)
    if has_global_aggregation(parsed.get("aggs")) or has_global_aggregation(
        parsed.get("aggregations")
    ):
        raise Refused("a global aggregation ignores the query, so it cannot be bounded")
    bound = {"range": {"@timestamp": {"lte": NOT_AFTER}}}
    existing = parsed.get("query")
    if existing is None:
        parsed["query"] = bound
    elif isinstance(existing, dict):
        parsed["query"] = {"bool": {"must": [existing], "filter": [bound]}}
    else:
        raise Refused("a Query DSL read needs a query object")


def rewrite_search(pathname, query_string, body):
    if "q" in parse_qs(query_string, keep_blank_values=True):
        raise Refused("the q parameter replaces the body query; put the query in the body")
    try:
        parsed = json.loads(body) if body else {}
    except ValueError:
        raise Refused("the search body is not JSON")
    if not isinstance(parsed, dict):
        raise Refused("the search body is not a JSON object")
    if pathname.endswith("/_query"):
        parsed["query"] = bound_esql(parsed.get("query"))
    else:
        bound_dsl(parsed)
    return json.dumps(parsed).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, status, payload, content_type="application/json"):
        data = payload if isinstance(payload, bytes) else payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_error_body(self, status, error_type, reason):
        self._send(status, json.dumps({"error": {"type": error_type, "reason": reason}}))

    def _handle(self, method):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_BODY:
            self._send(413, b"")
            return
        body = self.rfile.read(length) if length else b""
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
        except HTTPError as error:
            self._send(error.code, error.read() or b"")
            return
        except (OSError, HTTPException):
            self._send_error_body(502, "telemetry_unavailable", "the telemetry cluster could not be read")
            return
        self._send(status, payload, content_type)

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
