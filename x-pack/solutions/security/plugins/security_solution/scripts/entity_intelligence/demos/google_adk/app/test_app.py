import asyncio
import base64
import contextlib
import io
import json
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from google.adk.agents import Agent
from google.adk.agents.run_config import RunConfig
from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_response import LlmResponse
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import PrivateAttr

from core import RunEvidence, Storage, StorageError, encoded, sha256, verified_principal
import main
from test_core import FakeResponse, FakeSession
from test_gate import GateStorage


CONFIG = {
    "GOOGLE_CLOUD_PROJECT": "test-project", "EI_SUPPORT_BUCKET": "support-fixture",
    "EI_CUSTOMER_BUCKET": "customer-fixture", "EI_EXPORT_BUCKET": "export-fixture",
    "EI_EVIDENCE_BUCKET": "evidence-fixture", "EI_RUNTIME_SERVICE_ACCOUNT": "runtime@test.iam.gserviceaccount.com",
    "EI_OIDC_AUDIENCES": "trusted-client", "EI_ALLOWED_REQUESTER_EMAILS": "operator@example.com",
    "model": "test-model", "instruction": main.BASE_INSTRUCTION,
    "policy": json.loads(Path(__file__).with_name("policy.json").read_text()),
}
CLAIMS = {"iss": "https://accounts.google.com", "sub": "human-account-id", "aud": "trusted-client",
          "email": "operator@example.com", "email_verified": True}
SIGNED_TEST_TOKEN = "header.payload.signature"


def binding(claims):
    return "Bearer header." + base64.urlsafe_b64encode(encoded(claims)).decode().rstrip("=") + "."


class AuthTests(unittest.TestCase):
    def test_bearer_scheme_case_is_insensitive_and_diagnostics_never_echo_headers(self):
        for scheme in ("bearer", "BEARER", "BeArEr"):
            with patch.object(main, "settings", return_value=CONFIG), patch.object(main.id_token, "verify_oauth2_token", return_value=CLAIMS):
                actor = main.authenticate(SIGNED_TEST_TOKEN, binding(CLAIMS).replace("Bearer", scheme))
            self.assertEqual(actor["subject"], "human-account-id")
        for value, expected_code in ((None, "authorization_missing"), ("Basic secret-credential", "authorization_invalid_scheme"), ("Bearer " + "s" * 24000, "authorization_too_large")):
            with self.assertRaises(HTTPException) as error:
                main.bearer_token(value, "authorization")
            self.assertEqual(error.exception.detail["code"], expected_code)
            self.assertNotIn("secret-credential", json.dumps(error.exception.detail))
            self.assertTrue(set(error.exception.detail).issubset({"code", "present", "length"}))

    def test_http_header_case_and_bearer_case_reach_the_same_verifier(self):
        def stop_after_authentication(*args, **kwargs):
            raise HTTPException(409, "Verified test identity")
        with patch.object(main, "settings", return_value=CONFIG), \
             patch.object(main.id_token, "verify_oauth2_token", return_value=CLAIMS) as verifier, \
             patch.object(main, "runtime_identity", side_effect=stop_after_authentication), \
             patch.dict(os.environ, {"K_SERVICE": "private-service"}):
            response = TestClient(main.app).post("/runs", json={"prompt": "Case review"}, headers={
                "x-ei-requester-token": SIGNED_TEST_TOKEN, "X-Serverless-Authorization": binding(CLAIMS).replace("Bearer", "bearer")})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(verifier.call_args.args[0], SIGNED_TEST_TOKEN)

    def test_auth_calls_google_verifier_then_binds_cloud_run_identity(self):
        with patch.object(main, "settings", return_value=CONFIG), patch.object(main.id_token, "verify_oauth2_token", return_value=CLAIMS) as verifier:
            with patch.dict(os.environ, {"K_SERVICE": "private-service"}):
                actor = main.authenticate(SIGNED_TEST_TOKEN, binding(CLAIMS))
        verifier.assert_called_once()
        self.assertEqual(verifier.call_args.kwargs["audience"], ["trusted-client"])
        self.assertEqual(actor["subject"], "human-account-id")

    def test_invalid_signature_unapproved_identity_and_binding_mismatch_rejected(self):
        with patch.object(main, "settings", return_value=CONFIG):
            with patch.object(main.id_token, "verify_oauth2_token", side_effect=ValueError("bad signature secret-credential")):
                with self.assertRaises(HTTPException) as error:
                    main.authenticate(SIGNED_TEST_TOKEN, binding(CLAIMS))
                self.assertEqual(error.exception.detail["code"], "requester_token_verification_failed")
                self.assertEqual(error.exception.detail["segment_lengths"], [6, 7, 9])
                self.assertNotIn("secret-credential", json.dumps(error.exception.detail))
                self.assertNotIn(SIGNED_TEST_TOKEN, json.dumps(error.exception.detail))
            with patch.object(main.id_token, "verify_oauth2_token", return_value={**CLAIMS, "email": "other@example.com"}):
                with self.assertRaises(HTTPException):
                    main.authenticate(SIGNED_TEST_TOKEN, binding(CLAIMS))
            with patch.object(main.id_token, "verify_oauth2_token", return_value=CLAIMS):
                with self.assertRaises(HTTPException):
                    main.authenticate(SIGNED_TEST_TOKEN, binding({**CLAIMS, "sub": "different-account"}))
                with patch.dict(os.environ, {"K_SERVICE": "private-service"}):
                    with self.assertRaises(HTTPException):
                        main.authenticate(SIGNED_TEST_TOKEN, None)

    def test_unsigned_or_missing_custom_token_has_no_authorization_fallback(self):
        with patch.object(main, "settings", return_value=CONFIG), patch.object(main.id_token, "verify_oauth2_token") as verifier:
            for token in (None, "header.payload.", "Bearer header.payload.signature", "header.payload.signature extra"):
                with self.assertRaises(HTTPException):
                    main.authenticate(token, binding(CLAIMS))
            response = TestClient(main.app).post("/runs", json={"prompt": "Case review"}, headers={
                "Authorization": "Bearer " + SIGNED_TEST_TOKEN, "X-Serverless-Authorization": binding(CLAIMS)})
        verifier.assert_not_called()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"]["code"], "requester_token_missing")

    def test_endpoint_rejects_client_supplied_identity_and_oversized_prompt(self):
        client = TestClient(main.app)
        response = client.post("/runs", json={"prompt": "Summarize", "requester": "pretend-admin"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(client.post("/runs", json={"prompt": "x" * 4001}).status_code, 422)
        self.assertEqual(client.post("/runs", json={"prompt": "Review", "client_request_id": "not-a-uuid"}).status_code, 422)
        self.assertEqual(str(main.RunRequest(prompt="Review", client_request_id="55555555-5555-4555-8555-555555555555").client_request_id),
                         "55555555-5555-4555-8555-555555555555")


class ScriptedModel(BaseLlm):
    """Offline SDK integration fixture; never represented as a real Gemini run."""
    _turn: int = PrivateAttr(default=0)

    async def generate_content_async(self, llm_request, stream=False):
        calls = [
            ("read_support_case", {"case_id": "CASE-001"}, "call-support"),
            ("read_customer_reference", {"customer": "Example Customer A"}, "call-customer"),
            ("export_case_summary", {"summary": "Synthetic customer reference DEMO-001"}, "call-export"),
        ]
        if self._turn < len(calls):
            name, args, call_id = calls[self._turn]
            parts = [types.Part(function_call=types.FunctionCall(name=name, args=args, id=call_id))]
        else:
            parts = [types.Part(text="The synthetic case was exported.")]
        self._turn += 1
        yield LlmResponse(content=types.Content(role="model", parts=parts))


class AdkExecutionTests(unittest.IsolatedAsyncioTestCase):
    async def test_native_export_403_is_provider_denial_after_actual_storage_request(self):
        run = RunEvidence(CLAIMS, {"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}, "Export", "Review", "offline-model", "revision",
                          CONFIG["policy"], "instructions", "project")
        session = FakeSession([FakeResponse(403, {"error": "private-provider-error"})])
        export = main.make_tools(run, Storage(session), CONFIG)[2]
        with contextlib.redirect_stdout(io.StringIO()):
            result = await export("Reference DEMO-001", SimpleNamespace(function_call_id="native-denied-export", invocation_id="invocation-1"))
        call = run.calls[0]
        target = {"bucket": CONFIG["EI_EXPORT_BUCKET"],
                  "object": f"exports/{run.run_id}/{sha256(b'native-denied-export')[:32]}.json"}
        target["uri"] = f"gs://{target['bucket']}/{target['object']}"
        self.assertEqual([item[0] for item in session.calls], ["post"])
        self.assertEqual(session.calls[0][2]["params"]["name"], target["object"])
        self.assertEqual(call["target"], target)
        self.assertEqual(call["outcome"], "failure")
        self.assertEqual(call["execution_status"], "denied_by_provider")
        self.assertEqual(call["resource_accessed"], "denied")
        self.assertEqual(call["resource_access"], {"status": "denied", "provider": "google_cloud_storage", "http_status": 403,
                                                   "operation": "storage.objects.create", "target": target})
        self.assertEqual(result["resource_access_status"], "denied")
        self.assertEqual(result["provider"], "google_cloud_storage")
        self.assertEqual(result["http_status"], 403)
        self.assertEqual(result["operation"], "storage.objects.create")
        self.assertEqual(result["target_bucket"], target["bucket"])
        self.assertEqual(result["target_object"], target["object"])
        self.assertEqual(result["target_uri"], target["uri"])
        self.assertTrue(all(isinstance(value, (str, int, bool)) or value is None for value in result.values()))
        self.assertEqual(result["status"], "permission_denied")
        self.assertEqual(result["error"], "storage_write_http_403")
        self.assertEqual(result["control_status"], "provider_denied")
        self.assertEqual(call["result_sha256"], sha256(encoded(result)))
        self.assertNotIn("resource", call)
        self.assertNotIn("enforcement", call)
        self.assertNotIn("private-provider-error", json.dumps(run.calls))
        self.assertEqual(run.resources, [])
        self.assertEqual(run.snapshot("Denied", "completed", None)["provenance"]["enforcement"], "google_cloud_storage_denial")

    async def test_export_other_failures_do_not_claim_native_denial(self):
        for status in (401, 404, 409, 429, 500):
            with self.subTest(status=status):
                run = RunEvidence(CLAIMS, {"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}, "Export", "Review", "offline-model", "revision",
                                  CONFIG["policy"], "instructions", "project")
                session = FakeSession([FakeResponse(status, {"error": "private-provider-error"})])
                export = main.make_tools(run, Storage(session), CONFIG)[2]
                with contextlib.redirect_stdout(io.StringIO()):
                    result = await export("Reference DEMO-001", SimpleNamespace(function_call_id="failed-export", invocation_id="invocation-1"))
                self.assertEqual(result, {"error": f"storage_write_http_{status}"})
                self.assertEqual(run.calls[0]["resource_accessed"], "not_confirmed")
                self.assertNotIn("resource_access", run.calls[0])
                self.assertNotIn("resource", run.calls[0])
                self.assertEqual([item[0] for item in session.calls], ["post"])

    async def test_matching_error_text_and_invalid_input_do_not_claim_native_denial(self):
        run = RunEvidence(CLAIMS, {"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}, "Export", "Review", "offline-model", "revision",
                          CONFIG["policy"], "instructions", "project")
        session = FakeSession([])
        storage = Storage(session)
        export = main.make_tools(run, storage, CONFIG)[2]
        context = SimpleNamespace(function_call_id="failed-export", invocation_id="invocation-1")
        with patch.object(storage, "create_json", side_effect=StorageError("storage_write_http_403")), \
                contextlib.redirect_stdout(io.StringIO()):
            result = await export("Reference DEMO-001", context)
        with contextlib.redirect_stdout(io.StringIO()):
            invalid = await export("", SimpleNamespace(function_call_id="invalid-export", invocation_id="invocation-1"))
        self.assertEqual(result, {"error": "storage_write_http_403"})
        self.assertEqual(invalid, {"error": "invalid_summary_size"})
        self.assertEqual(session.calls, [])
        self.assertTrue(all("resource_access" not in call and "resource" not in call for call in run.calls))

    async def test_workflow_denial_stops_export_before_storage_side_effect_and_preserves_evidence(self):
        storage = GateStorage("deny")
        config = {**CONFIG, "EI_CONTROL_BUCKET": "trusted-control", "gate_timeout_seconds": 5}
        run = RunEvidence(CLAIMS, {"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}, "Export", "Review", "offline-model", "revision",
                          CONFIG["policy"], "instructions", "project")
        export = main.make_tools(run, storage, config)[2]
        context = SimpleNamespace(function_call_id="export-1", invocation_id="invocation-1")
        with contextlib.redirect_stdout(io.StringIO()):
            result = await export("Reference DEMO-001", context)
            retry = await export("Try another summary", SimpleNamespace(function_call_id="export-2", invocation_id="invocation-1"))
        self.assertEqual(result["status"], "not_executed")
        self.assertEqual(result["control_status"], "workflow_blocked")
        self.assertEqual(retry["control_status"], "gate_attempt_limit")
        self.assertEqual([item[0] for item in storage.created], [CONFIG["EI_EVIDENCE_BUCKET"]])
        self.assertNotIn("resource", run.calls[0])
        self.assertEqual(run.calls[0]["resource_accessed"], "not_attempted")
        self.assertEqual(run.calls[0]["execution_status"], "prevented")
        self.assertEqual(run.calls[0]["enforcement"]["decision"]["workflow_execution_id"], "execution-1")
        self.assertEqual(run.calls[0]["outcome"], "failure")
        self.assertFalse(run.calls[0]["policy_matches"][0]["enforced"])
        self.assertEqual(run.snapshot("Blocked", "completed", None)["provenance"]["enforcement"], "elastic_workflow_gate")

    async def test_workflow_allow_performs_one_export_after_decision(self):
        storage = GateStorage("allow")
        config = {**CONFIG, "EI_CONTROL_BUCKET": "trusted-control", "gate_timeout_seconds": 5}
        run = RunEvidence(CLAIMS, {"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}, "Export", "Review", "offline-model", "revision",
                          CONFIG["policy"], "instructions", "project")
        export = main.make_tools(run, storage, config)[2]
        with contextlib.redirect_stdout(io.StringIO()):
            result = await export("Reference DEMO-001", SimpleNamespace(function_call_id="export-1", invocation_id="invocation-1"))
        self.assertEqual(result["status"], "exported")
        self.assertEqual([item[0] for item in storage.created], [CONFIG["EI_EVIDENCE_BUCKET"], CONFIG["EI_EXPORT_BUCKET"]])
        self.assertEqual(run.calls[0]["outcome"], "success")
        self.assertEqual(run.calls[0]["enforcement"]["status"], "workflow_allowed")

    async def test_run_endpoint_returns_persisted_real_sdk_evidence_envelope(self):
        support = {"case_id": "CASE-001", "customer": "Example Customer A", "classification": "synthetic"}
        customer = {"customer": "Example Customer A", "reference": "DEMO-001", "classification": "confidential-demo", "synthetic": True}
        session = FakeSession([
            FakeResponse(200, {"generation": "101", "size": str(len(encoded(support)))}), FakeResponse(200, support),
            FakeResponse(200, {"generation": "202", "size": str(len(encoded(customer)))}), FakeResponse(200, customer),
            FakeResponse(200, {"generation": "303"}), FakeResponse(200, {"generation": "404"}),
        ])
        def offline_agent(**kwargs):
            return Agent(**{**kwargs, "model": ScriptedModel(model="offline-model")})
        with patch.object(main, "settings", return_value=CONFIG), \
             patch.object(main, "authenticate", return_value=verified_principal(CLAIMS, ["trusted-client"])), \
             patch.object(main, "runtime_identity", return_value={"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}), \
             patch.object(main, "storage_client", return_value=Storage(session)), \
             patch.object(main, "Agent", side_effect=offline_agent), contextlib.redirect_stdout(io.StringIO()):
            result = await main.run_agent(main.RunRequest(prompt="Look up and export the synthetic case", client_request_id="55555555-5555-4555-8555-555555555555"), "Bearer test", binding(CLAIMS))
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["answer"], "The synthetic case was exported.")
        self.assertEqual(result["evidence_storage"]["generation"], "404")
        persisted = json.loads(session.calls[-1][2]["data"])
        self.assertEqual(persisted["calls"], result["calls"])
        self.assertEqual(persisted["requester"]["subject"], "human-account-id")
        self.assertEqual(persisted["executing_principal"]["email"], CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"])
        self.assertEqual(persisted["policy"]["mode"], "monitor")
        self.assertEqual(persisted["client_request_id"], "55555555-5555-4555-8555-555555555555")
        self.assertEqual(result["client_request_id"], persisted["client_request_id"])
        self.assertTrue(persisted["invocation_ids"])

    async def test_failed_call_keeps_attempt_match_without_claiming_access(self):
        run = RunEvidence(CLAIMS, {"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}, "Lookup", "Test", "offline-model", "revision", CONFIG["policy"], "instructions", "project")
        session = FakeSession([FakeResponse(403, {"error": "do-not-log-this-server-body"})])
        lookup = main.make_tools(run, Storage(session), CONFIG)[1]
        with contextlib.redirect_stdout(io.StringIO()):
            result = lookup("Example Customer A", SimpleNamespace(function_call_id="failed-call", invocation_id="invocation"))
        self.assertEqual(result, {"error": "storage_metadata_http_403"})
        self.assertEqual(run.calls[0]["outcome"], "failure")
        self.assertEqual(run.calls[0]["policy_matches"][0]["operation_outcome"], "failure")
        self.assertIn("requested", run.calls[0]["policy_matches"][0]["title"])
        self.assertEqual(run.resources, [])
        self.assertNotIn("resource_access", run.calls[0])
        self.assertNotIn("target", run.calls[0])
        self.assertNotIn("do-not-log", json.dumps(run.calls))

    async def test_real_adk_runner_binds_executed_calls_generations_and_monitor_policy(self):
        support = {"case_id": "CASE-001", "customer": "Example Customer A", "classification": "synthetic", "summary": "Help requested"}
        customer = {"customer": "Example Customer A", "reference": "DEMO-001", "classification": "confidential-demo", "synthetic": True}
        session = FakeSession([
            FakeResponse(200, {"generation": "101", "size": str(len(encoded(support)))}), FakeResponse(200, support),
            FakeResponse(200, {"generation": "202", "size": str(len(encoded(customer)))}), FakeResponse(200, customer),
            FakeResponse(200, {"generation": "303"}),
        ])
        run = RunEvidence(CLAIMS, {"email": CONFIG["EI_RUNTIME_SERVICE_ACCOUNT"]}, "Read and export", "Test", "offline-model", "test-revision", CONFIG["policy"], main.BASE_INSTRUCTION, "test-project")
        with main.tracer.start_as_current_span("test-run") as span, contextlib.redirect_stdout(io.StringIO()):
            run.trace_id = f"{span.get_span_context().trace_id:032x}"
            tools = main.make_tools(run, Storage(session), CONFIG)
            agent = Agent(name="support_test", model=ScriptedModel(model="offline-model"), tools=tools)
            sessions = InMemorySessionService()
            await sessions.create_session(app_name="test", user_id="human-account-id", session_id=run.session_id)
            runner = Runner(agent=agent, app_name="test", session_service=sessions)
            try:
                events = [event async for event in runner.run_async(user_id="human-account-id", session_id=run.session_id,
                    new_message=types.Content(role="user", parts=[types.Part(text="Read and export the synthetic case")]),
                    run_config=RunConfig(max_llm_calls=5))]
            finally:
                await runner.close()
        self.assertEqual([call["id"] for call in run.calls], ["call-support", "call-customer", "call-export"])
        self.assertTrue(all(call["outcome"] == "success" for call in run.calls))
        self.assertTrue(all(call["invocation_id"] for call in run.calls))
        self.assertTrue(all(call["trace_id"] == run.trace_id for call in run.calls))
        self.assertEqual([len(call["policy_matches"]) for call in run.calls], [0, 1, 1])
        self.assertEqual(run.calls[1]["result"]["reference"], "DEMO-001")
        self.assertEqual(run.calls[2]["consumed_before_call"][0]["generation"], "101")
        self.assertEqual(run.calls[2]["consumed_before_call"][1]["generation"], "202")
        self.assertEqual(session.calls[-1][2]["headers"]["x-goog-custom-audit-ei-tool"], "call-export")
        self.assertTrue(events[-1].is_final_response())
        self.assertEqual(run.calls[2]["policy_matches"][0]["enforced"], False)


if __name__ == "__main__":
    unittest.main()
