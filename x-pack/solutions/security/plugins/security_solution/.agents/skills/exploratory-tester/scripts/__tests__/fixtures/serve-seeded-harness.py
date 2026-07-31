#!/usr/bin/env python3
"""Tiny local HTTP server backing seeded-live-harness.html's /api/seeded/*
endpoints for Task 8 live validation.

A plain `python3 -m http.server` cannot produce a real 500/403 or a
deliberately slow response, and those exact HTTP-level signatures are what
the detector/collector code under test keys off of. This server exists only
to make those signatures real over the network instead of simulated in
JS, so the browser's actual fetch()/console/network stack produces them.

Usage: python3 serve-seeded-harness.py [port]   (default port 8931)
"""
import http.server
import socketserver
import sys
import time
import urllib.parse


class SeededHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):  # noqa: A002 - stdlib signature
        pass  # keep test output quiet; harness assertions read HTTP responses, not this log

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/api/seeded/silent-500":
            self._respond(500, "seeded silent failure")
            return

        if parsed.path == "/api/seeded/search":
            self._respond(200, "ok")
            return

        if parsed.path == "/api/seeded/submit":
            self._respond(200, "ok")
            return

        if parsed.path == "/api/seeded/poll":
            if query.get("fail") == ["1"]:
                self._respond(500, "seeded genuine poll failure")
            else:
                self._respond(200, "ok")
            return

        if parsed.path == "/api/seeded/admin-only":
            self._respond(403, "forbidden")
            return

        if parsed.path == "/api/seeded/slow":
            delay_ms = int(query.get("delay", ["1000"])[0])
            time.sleep(delay_ms / 1000)
            self._respond(200, "ok (after {}ms)".format(delay_ms))
            return

        super().do_GET()

    def _respond(self, status, body):
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8931
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), SeededHandler) as httpd:
        print("serving seeded harness on http://127.0.0.1:{}/seeded-live-harness.html".format(port))
        httpd.serve_forever()
