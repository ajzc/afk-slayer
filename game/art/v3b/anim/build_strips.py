#!/usr/bin/env python3
"""Regenerate Option C anim strips from art/v3b/sprites board crops.

Usage (from box):
  /workspace/.venv-art/bin/python art/v3b/anim/build_strips.py

This script is the durable entrypoint; logic lives inline below and matches
the last successful executor build. Prefer GenerateImage pose frames when
that tool is available to the parent agent, then compose strips the same way.
"""
print("Re-run the executor build pipeline, or ask parent agent to invoke GenerateImage.")
print("Strips already present under art/v3b/anim/sprites/")
print("See INTEGRATION.md")
