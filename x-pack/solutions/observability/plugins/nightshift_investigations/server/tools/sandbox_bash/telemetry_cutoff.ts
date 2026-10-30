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
 * In-sandbox proxy. The cluster URL is given to this process only; the wrapper unsets it before
 * the agent's command runs. A query whose `@timestamp` lower bounds are all after the cutoff
 * returns no rows. Any other search body that cannot be bounded returns no rows too.
 */
export const TELEMETRY_CUTOFF_PROXY_SOURCE = `import json
import os
import re
import socketserver
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

UPSTREAM = os.environ["NIGHTSHIFT_TELEMETRY_UPSTREAM"].rstrip("/")
NOT_AFTER = os.environ["NIGHTSHIFT_TELEMETRY_CUTOFF"]
PORT_FILE = os.environ["NIGHTSHIFT_TELEMETRY_PROXY_PORT_FILE"]
MAX_BODY = 2 * 1024 * 1024
SEARCH_SUFFIXES = (
    "/_query",
    "/_search",
    "/_async_search",
    "/_count",
    "/_eql/search",
    "/_msearch",
)


def parse_time(value):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


CUTOFF = parse_time(NOT_AFTER)


def pathname_of(path):
    return path.split("?", 1)[0]


def is_search(path):
    pathname = pathname_of(path)
    return any(pathname.endswith(suffix) for suffix in SEARCH_SUFFIXES)


def entirely_after(query):
    if CUTOFF is None:
        return True
    bounds = re.findall(r'@timestamp\\s*(?:>=|>)\\s*"([^"]+)"', query)
    bounds += re.findall(
        r'"@timestamp"\\s*:\\s*\\{[^}]*"(?:gte|gt)"\\s*:\\s*"([^"]+)"', query
    )
    if not bounds:
        return False
    parsed = [parse_time(bound) for bound in bounds]
    if any(item is None for item in parsed):
        return True
    return all(item > CUTOFF for item in parsed)


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


def inject(query):
    end = end_of_from(query)
    if end is None or CUTOFF is None:
        return None
    predicate = '| WHERE @timestamp <= "%s"' % NOT_AFTER
    tail = query[end:]
    if tail.startswith("|"):
        tail = " " + tail
    return query[:end] + " " + predicate + tail


def empty_body(path):
    if "format=txt" in path:
        return b"@timestamp\\n"
    pathname = pathname_of(path)
    if pathname.endswith("/_query"):
        return b'{"columns":[],"values":[]}'
    if pathname.endswith("/_count"):
        return b'{"count":0}'
    return b'{"hits":{"total":{"value":0,"relation":"eq"},"hits":[]}}'


def bound_dsl(parsed):
    clause = {"range": {"@timestamp": {"lte": NOT_AFTER}}}
    existing = parsed.get("query")
    if existing is None:
        parsed["query"] = clause
        return parsed
    if not isinstance(existing, dict):
        return None
    bool_query = existing.get("bool")
    if isinstance(bool_query, dict):
        filters = bool_query.get("filter")
        if filters is None:
            bool_query["filter"] = [clause]
        elif isinstance(filters, list):
            filters.append(clause)
        elif isinstance(filters, dict):
            bool_query["filter"] = [filters, clause]
        else:
            return None
        return parsed
    parsed["query"] = {"bool": {"filter": [existing, clause]}}
    return parsed


def rewrite_search(body):
    if body is None or len(body) > MAX_BODY:
        return None
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict):
        return None
    query = parsed.get("query")
    if isinstance(query, str):
        if entirely_after(query):
            return None
        rewritten = inject(query)
        if rewritten is None:
            return None
        parsed["query"] = rewritten
        return json.dumps(parsed).encode("utf-8")
    raw = body.decode("utf-8", errors="replace")
    if entirely_after(raw):
        return None
    bounded = bound_dsl(parsed)
    if bounded is None:
        return None
    return json.dumps(bounded).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, status, payload, content_type="application/json"):
        data = payload if isinstance(payload, bytes) else payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _handle(self, method):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_BODY:
            self._send(413, b"")
            return
        body = self.rfile.read(length) if length else b""
        forward = body
        if is_search(self.path):
            rewritten = rewrite_search(body)
            if rewritten is None:
                self._send(200, empty_body(self.path))
                return
            forward = rewritten
        headers = {}
        for name in ("Authorization", "Content-Type"):
            value = self.headers.get(name)
            if value:
                headers[name] = value
        request = Request(
            UPSTREAM + self.path,
            data=forward if method != "GET" else None,
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=60) as response:
                self._send(
                    response.status,
                    response.read(),
                    response.headers.get("Content-Type", "application/json"),
                )
        except HTTPError as error:
            self._send(error.code, error.read() or b"")
        except URLError:
            self._send(200, empty_body(self.path) if is_search(self.path) else b"")

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
python3 ${TELEMETRY_CUTOFF_PROXY_PATH} &
proxy_pid=$!
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
  kill "$proxy_pid" 2>/dev/null || true
  exit 1
fi
export CONNECTOR_CONFIG_URL="http://127.0.0.1:\${port}"
unset NIGHTSHIFT_TELEMETRY_UPSTREAM
unset NIGHTSHIFT_TELEMETRY_CUTOFF
user_command="$NIGHTSHIFT_SANDBOX_COMMAND"
unset NIGHTSHIFT_SANDBOX_COMMAND
bash -c "$user_command"
status=$?
kill "$proxy_pid" 2>/dev/null || true
wait "$proxy_pid" 2>/dev/null || true
exit "$status"
`;
