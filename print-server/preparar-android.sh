#!/bin/bash
# Script para preparar pasta print-server para transferência ao celular

echo "==========================================="
echo "  PREPARANDO ARQUIVOS PARA O CELULAR"
echo "==========================================="
echo ""

# Remove node_modules (vai instalar no celular)
echo "[1/3] Removendo node_modules..."
rm -rf node_modules

echo "[2/3] Criando arquivo ZIP..."
cd ..
zip -r print-server-android.zip print-server -x "print-server/node_modules/*"

echo "[3/3] Pronto!"
echo ""
echo "==========================================="
echo "  Arquivo criado: print-server-android.zip"
echo "==========================================="
echo ""
echo "Próximos passos:"
echo "1. Envie este ZIP para seu celular (Google Drive, WhatsApp, etc)"
echo "2. Extraia no celular"
echo "3. Siga o guia: GUIA-INSTALACAO-ANDROID.md"
echo ""
