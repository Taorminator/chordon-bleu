#!/usr/bin/env python3
"""Offline, destructive-write-free regression for the Felucca overlay preflight.

Synthetic Git repositories are used; no real firmware checkout or FM1 is touched.
"""
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
ADAPTER = ROOT / "firmware/felucca-overlay/apply.py"
WORKFLOW = ROOT / ".github/workflows/felucca-baseline.yml"
SOURCE = ADAPTER.read_text(encoding="utf8")
PIN = re.search(r'^PIN = "([0-9a-f]{40})"$', SOURCE, re.M)
assert PIN, "Overlay must define a 40-byte-hex pinned commit"
assert ("ref: " + PIN.group(1)) in WORKFLOW.read_text(), "Workflow and overlay pins differ"


def run(*args, cwd=None):
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True)


class OverlayPreflight(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.upstream = root / "felucca"
        self.upstream.mkdir()
        for rel in ("firmware/src/felucca.c", "firmware/src/main.c"):
            dest = self.upstream / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text("/* Synthetic clean upstream boot file */\n")
        assert run("git", "init", "-q", str(self.upstream)).returncode == 0
        assert run("git", "-C", str(self.upstream), "add", ".").returncode == 0
        commit = run("git", "-C", str(self.upstream), "-c", "user.name=Test",
                     "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture")
        assert commit.returncode == 0, commit.stderr
        self.fake_sha = run("git", "-C", str(self.upstream), "rev-parse", "HEAD").stdout.strip()
        self.script = root / "adapter" / "apply.py"
        self.script.parent.mkdir()
        self.script.write_text(SOURCE.replace('PIN = "' + PIN.group(1) + '"',
                                               'PIN = "' + self.fake_sha + '"'))
        self.original = {rel: (self.upstream / rel).read_bytes()
                         for rel in ("firmware/src/felucca.c", "firmware/src/main.c")}

    def check_untouched(self):
        for rel, expected in self.original.items():
            self.assertEqual((self.upstream / rel).read_bytes(), expected)
        self.assertFalse((self.upstream / "firmware/src/chordon").exists())

    def test_wrong_revision_rejected_before_any_write(self):
        result = run(sys.executable, str(ADAPTER), str(self.upstream))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Wrong Felucca revision", result.stderr)
        self.check_untouched()

    def test_check_only_pristine_checkout_is_no_write(self):
        result = run(sys.executable, str(self.script), str(self.upstream), "--check-only")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PREFLIGHT OK", result.stdout)
        self.assertIn("No changes made", result.stdout)
        self.check_untouched()

    def test_modified_boot_sources_rejected_before_any_write(self):
        for rel in self.original:
            with self.subTest(path=rel):
                (self.upstream / rel).write_text("/* tampered */\n")
                result = run(sys.executable, str(self.script), str(self.upstream))
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Modified upstream boot file", result.stderr)
                self.assertFalse((self.upstream / "firmware/src/chordon").exists())
                (self.upstream / rel).write_bytes(self.original[rel])
        self.check_untouched()

    def test_no_git_or_nested_git_checkout_rejected(self):
        no_git = Path(self.tmp.name) / "nogit"
        (no_git / "firmware/src").mkdir(parents=True)
        (no_git / "firmware/src/felucca.c").write_text("/* not a git checkout */")
        result = run(sys.executable, str(self.script), str(no_git))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("revision preflight failed", result.stderr)
        # A nested path inside the right repo is still not its root.
        nested = self.upstream / "firmware"
        (nested / "firmware/src").mkdir(parents=True)
        (nested / "firmware/src/felucca.c").write_text("/* nested */")
        result = run(sys.executable, str(self.script), str(nested))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Git repository root", result.stderr)
        self.check_untouched()

    def test_option_whitelist_rejects_any_other_flag(self):
        result = run(sys.executable, str(self.script), str(self.upstream), "--write")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("usage:", result.stderr)
        self.check_untouched()


if __name__ == "__main__":
    unittest.main()
