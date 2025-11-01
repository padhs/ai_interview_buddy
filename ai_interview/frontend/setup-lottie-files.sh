#!/bin/bash
# Script to move Lottie files to public directory for Next.js static serving

cd "$(dirname "$0")"
mkdir -p public/lottiefiles
cp -r lottiefiles/* public/lottiefiles/
echo "✅ Lottie files copied to public/lottiefiles/"
echo "Files are now accessible at /lottiefiles/"

