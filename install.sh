#!/bin/bash
set -e

REPO="JangVincent/zettelkasten-cli"
ZETTEL_HOME="${ZETTEL_HOME:-$HOME/.zettel}"
INSTALL_DIR="$ZETTEL_HOME/bin"
DATA_DIR="$ZETTEL_HOME"
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

DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}-${OS}-${ARCH}.tar.gz"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

echo "Downloading ${BINARY_NAME}-${OS}-${ARCH}.tar.gz..."
if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMPDIR/zettel.tar.gz"; then
  echo "Failed to download from $DOWNLOAD_URL"
  exit 1
fi

echo "Extracting..."
tar -xzf "$TMPDIR/zettel.tar.gz" -C "$TMPDIR"

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"

# Install binary
mv "$TMPDIR/zettel" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/zettel"

# Install web assets
if [ -d "$TMPDIR/web-dist" ]; then
  rm -rf "$DATA_DIR/web-dist"
  mv "$TMPDIR/web-dist" "$DATA_DIR/"
  echo "Web UI installed to $DATA_DIR/web-dist"
fi

echo ""
echo "zettel installed to $INSTALL_DIR/zettel"
echo ""

# Check if INSTALL_DIR is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  SHELL_NAME=$(basename "${SHELL:-/bin/bash}")
  echo "To use zettel, add it to your PATH:"
  echo ""
  case "$SHELL_NAME" in
    zsh)
      echo "  echo 'export PATH=\"\$PATH:$INSTALL_DIR\"' >> ~/.zshrc"
      echo "  source ~/.zshrc"
      ;;
    bash)
      echo "  echo 'export PATH=\"\$PATH:$INSTALL_DIR\"' >> ~/.bashrc"
      echo "  source ~/.bashrc"
      ;;
    fish)
      echo "  fish_add_path $INSTALL_DIR"
      echo ""
      echo "  Or to persist, add to ~/.config/fish/config.fish:"
      echo "  set -gx PATH \$PATH $INSTALL_DIR"
      ;;
    *)
      echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
      echo ""
      echo "  Add the line above to your shell profile to persist."
      ;;
  esac
  echo ""
else
  echo "zettel is already in your PATH."
  echo ""
fi

echo "Run 'zettel init' to initialize"
echo "Run 'zettel --help' for a great start of the journey!"
