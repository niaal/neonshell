#!/usr/bin/env bash
# NEONSHELL installer for macOS.
# Run with:
#   curl -fsSL https://example.com/install.sh | bash
# Or:
#   RELEASE_BASE=https://github.com/yourname/yourrepo/releases/download/v1.0.0 \
#     bash install.sh
#
# Bypasses Gatekeeper's "damaged" dialog by downloading via curl (which does
# NOT set the com.apple.quarantine attribute that Slack/Chrome apply).
set -euo pipefail

VERSION="${VERSION:-1.0.0}"
RELEASE_BASE="${RELEASE_BASE:-https://github.com/niaal/neonshell/releases/download/v${VERSION}}"
APP_NAME="NEONSHELL"
INSTALL_DIR="${INSTALL_DIR:-/Applications}"

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*" >&2; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

if [[ "$(uname)" != "Darwin" ]]; then
  red "This installer is for macOS only. (uname=$(uname))"
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  arm64) TARBALL="neonshell-${VERSION}-arm64.tar.gz" ;;
  x86_64) TARBALL="neonshell-${VERSION}-x64.tar.gz" ;;
  *) red "Unsupported architecture: $ARCH"; exit 1 ;;
esac

URL="${RELEASE_BASE}/${TARBALL}"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

green "▶ Downloading NEONSHELL ${VERSION} (${ARCH})…"
yellow "  ${URL}"
if ! curl -fL --progress-bar -o "${TMPDIR}/${TARBALL}" "$URL"; then
  red "Download failed. Check the URL or your connection."
  exit 1
fi

green "▶ Extracting…"
tar -xzf "${TMPDIR}/${TARBALL}" -C "$TMPDIR"

# electron-builder's tar.gz contains the .app at the root
APP_PATH="${TMPDIR}/${APP_NAME}.app"
if [[ ! -d "$APP_PATH" ]]; then
  # Fallback: find any .app inside
  APP_PATH="$(find "$TMPDIR" -maxdepth 2 -name '*.app' -type d | head -1)"
fi
if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  red "Could not find a .app in the downloaded archive."
  exit 1
fi

DEST="${INSTALL_DIR}/${APP_NAME}.app"
if [[ -d "$DEST" ]]; then
  yellow "▶ Removing previous install at ${DEST}"
  rm -rf "$DEST"
fi

green "▶ Installing to ${DEST}"
# Try without sudo first; fall back if /Applications isn't writable
if ! mv "$APP_PATH" "$DEST" 2>/dev/null; then
  yellow "  (need sudo for ${INSTALL_DIR})"
  sudo mv "$APP_PATH" "$DEST"
fi

# Strip quarantine attribute defensively, in case anything set it.
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

green "✔ Installed."
green "▶ Launching…"
open "$DEST"
