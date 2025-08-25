#!/bin/bash
# setup-warp.sh - Easy setup script for CLIX Trading Platform Warp optimizations

echo "🎯 Setting up Warp optimizations for CLIX Trading Platform..."
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "app" ]]; then
    echo "❌ Error: Please run this script from the CLIX trading project root directory"
    echo "   Expected: /Users/admin/clix_trading"
    exit 1
fi

# Source the Warp configuration
if [[ -f ".warp/.warprc" ]]; then
    echo "📋 Loading Warp configuration..."
    source .warp/.warprc
    echo "✅ Warp shortcuts loaded successfully"
else
    echo "❌ Error: .warp/.warprc not found"
    exit 1
fi

echo ""
echo "🚀 Warp optimization setup complete!"
echo ""
echo "📁 Configuration files created:"
echo "   .warp/config.yaml      - Main configuration"
echo "   .warp/shortcuts.md     - Command shortcuts guide"
echo "   .warp/workflows.yaml   - Development workflows"
echo "   .warp/environments.yaml - Environment settings"
echo "   .warp/README.md        - Documentation"
echo "   .warp/.warprc          - Shell integration"
echo ""
echo "💡 Quick start:"
echo "   Type 'clix-help' to see available shortcuts"
echo "   Dev server is running at: http://localhost:3000"
echo ""
echo "🔧 To make these shortcuts permanent, add this to your shell profile:"
echo "   echo 'source /Users/admin/clix_trading/.warp/.warprc' >> ~/.zshrc"
echo ""
echo "🎨 CLIX Brand Colors:"
echo "   Orange: #F08C28 (Primary)"
echo "   Yellow: #FFBF3F (Secondary)"
echo "   Brown:  #A64B2A (Tertiary)"
echo ""
echo "📚 Documentation: .warp/README.md"
echo "✨ Happy coding!"
