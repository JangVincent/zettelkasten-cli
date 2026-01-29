#!/bin/bash
set -e

REPO="JangVincent/zettelkasten-cli"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
BINARY_NAME="zettel"

echo "Installing zettel..."

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux) OS="linux" ;;
  darwin) OS="darwin" ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}-${OS}-${ARCH}"

TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

echo "Downloading ${BINARY_NAME}-${OS}-${ARCH}..."
if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMPFILE"; then
  echo "Failed to download from $DOWNLOAD_URL"
  exit 1
fi

chmod +x "$TMPFILE"

if [ -w "$INSTALL_DIR" ]; then
  mv "$TMPFILE" "${INSTALL_DIR}/${BINARY_NAME}"
else
  echo "Need sudo to install to ${INSTALL_DIR}"
  sudo mv "$TMPFILE" "${INSTALL_DIR}/${BINARY_NAME}"
fi

echo "zettel installed to ${INSTALL_DIR}/${BINARY_NAME}"
echo "Run 'zettel --help' to get started"
